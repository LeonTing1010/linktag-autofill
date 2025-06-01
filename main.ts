import { 
  App, 
  Editor, 
  MarkdownView, 
  Modal, 
  Notice, 
  Plugin, 
  PluginSettingTab, 
  Setting,
  TFile,
  Menu,
  MenuItem
} from 'obsidian';

import { PluginSettings } from './src/types';
import { DEFAULT_SETTINGS, SettingTab } from './src/settings';
import { ContentProcessor } from './src/content-processor';
import { TagGenerator } from './src/tag-generator';
import { TagManager } from './src/tag-manager';
import { TagSelectionModal } from './src/ui/tag-selection-modal';
import { BatchProcessModal } from './src/ui/batch-process-modal';
import { ClearTagsModal } from './src/ui/clear-tags-modal';
import { StatusBarManager } from './src/status-bar';

export default class LinkTagAutoFillPlugin extends Plugin {
  settings: PluginSettings;
  contentProcessor: ContentProcessor;
  tagGenerator: TagGenerator;
  tagManager: TagManager;
  statusBar: StatusBarManager;

  async onload() {
    await this.loadSettings();

    // Initialize components
    this.contentProcessor = new ContentProcessor();
    this.tagGenerator = new TagGenerator(this.settings);
    this.tagManager = new TagManager(this.app, this.settings);
    this.statusBar = new StatusBarManager(this); // 传递 this (plugin 实例)

    // Add ribbon icon
    this.addRibbonIcon('tag', 'Generate Tags', (evt: MouseEvent) => {
      this.showTagGenerationModal();
    });

    // Add commands
    this.addCommand({
      id: 'generate-tags-current-note',
      name: 'Generate tags for current note',
      callback: () => {
        this.generateTagsForCurrentNote();
      }
    });

    this.addCommand({
      id: 'batch-process-notes',
      name: 'Batch process multiple notes',
      callback: () => {
        new BatchProcessModal(this.app, this).open();
      }
    });

    this.addCommand({
      id: 'quick-tag-generation',
      name: 'Quick tag generation (auto-apply)',
      callback: () => {
        this.quickTagGeneration();
      }
    });

    // Add clear tags commands
    this.addCommand({
      id: 'clear-tags-current-note',
      name: 'Clear tags from current note',
      callback: () => {
        this.clearTagsFromCurrentNote();
      }
    });

    this.addCommand({
      id: 'clear-tags-batch',
      name: 'Clear tags from multiple files',
      callback: () => {
        new ClearTagsModal(this.app, this.tagManager).open();
      }
    });

    // Add context menu
    this.registerEvent(
      this.app.workspace.on('file-menu', (menu, file) => {
        if (file instanceof TFile && file.extension === 'md') {
          menu.addItem((item: MenuItem) => {
            item
              .setTitle('Generate tags')
              .setIcon('tag')
              .onClick(async () => {
                await this.generateTagsForFile(file);
              });
          });

          // Add clear tags option to context menu
          menu.addItem((item: MenuItem) => {
            item
              .setTitle('Clear tags')
              .setIcon('x')
              .onClick(async () => {
                await this.clearTagsFromFile(file);
              });
          });
        }
      })
    );

    // Auto-trigger for new files
    this.registerEvent(
      this.app.vault.on('create', (file) => {
        if (this.settings.autoTrigger && file instanceof TFile && file.extension === 'md') {
          // Delay to allow file content to be written
          setTimeout(() => {
            this.generateTagsForFile(file, true);
          }, 2000);
        }
      })
    );

    // Add settings tab
    this.addSettingTab(new SettingTab(this.app, this));

    console.log('LinkTag AutoFill plugin loaded');
  }

  onunload() {
    this.statusBar?.destroy();
    console.log('LinkTag AutoFill plugin unloaded');
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    
    // Update components with new settings
    this.tagGenerator?.updateSettings(this.settings);
    this.tagManager?.updateSettings(this.settings);
  }

  async showTagGenerationModal() {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      new Notice('No active file');
      return;
    }

    await this.generateTagsForFile(activeFile);
  }

  async generateTagsForCurrentNote() {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      new Notice('No active file');
      return;
    }

    await this.generateTagsForFile(activeFile);
  }

  async quickTagGeneration() {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      new Notice('No active file');
      return;
    }

    await this.generateTagsForFile(activeFile, true);
  }

  async clearTagsFromCurrentNote() {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      new Notice('No active file');
      return;
    }

    await this.clearTagsFromFile(activeFile);
  }

  async clearTagsFromFile(file: TFile) {
    try {
      // Check if file has tags
      const cache = this.app.metadataCache.getFileCache(file);
      if (!cache?.frontmatter?.tags || cache.frontmatter.tags.length === 0) {
        new Notice('No tags found in this file');
        return;
      }

      const tagCount = cache.frontmatter.tags.length;
      
      await this.tagManager.clearTagsFromFile(file);
      new Notice(`Cleared ${tagCount} tags from ${file.basename}`);

    } catch (error) {
      console.error('Error clearing tags from file:', error);
      new Notice('Error clearing tags: ' + error.message);
    }
  }

  async generateTagsForFile(file: TFile, autoApply: boolean = false) {
    try {
      this.statusBar.updateStatus('processing');

      // Extract content
      const content = await ContentProcessor.extractContent(file);
      
      if (content.trim().length < 50) {
        new Notice('Note content too short for tag generation');
        this.statusBar.updateStatus('ready');
        return;
      }

      // Generate tags
      const result = await this.tagGenerator.generateTagsForContent(content);

      if (result.error) {
        new Notice(`Error generating tags: ${result.error}`);
        this.statusBar.updateStatus('error', result.error);
        return;
      }

      if (result.suggestions.length === 0) {
        new Notice('No tags generated');
        this.statusBar.updateStatus('ready');
        return;
      }

      this.statusBar.updateStatus('ready');

      if (autoApply) {
        // Auto-apply top suggestions
        const topSuggestions = result.suggestions
          .filter(tag => tag.confidence >= this.settings.minConfidence)
          .slice(0, Math.min(3, this.settings.maxTags));
        
        if (topSuggestions.length > 0) {
          await this.tagManager.applyTagsToFile(file, topSuggestions);
        } else {
          new Notice('No high-confidence tags found');
        }
      } else {
        // Show selection modal
        new TagSelectionModal(
          this.app,
          result.suggestions,
          async (selectedTags) => {
            await this.tagManager.applyTagsToFile(file, selectedTags);
          }
        ).open();
      }

    } catch (error) {
      console.error('Error in tag generation:', error);
      new Notice(`Error: ${error.message}`);
      this.statusBar.updateStatus('error', error.message);
    }
  }

  async generateAndApplyTags(file: TFile, autoApply: boolean = false) {
    return this.generateTagsForFile(file, autoApply);
  }
}
