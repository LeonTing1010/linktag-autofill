import { App, Modal, Setting, TFile, ButtonComponent, Notice } from 'obsidian';
import LinkTagAutoFillPlugin from '../../main';
import { ContentProcessor } from '../content-processor';

export class BatchProcessModal extends Modal {
  private plugin: LinkTagAutoFillPlugin;
  private selectedFiles: TFile[] = [];
  private allFiles: TFile[] = [];

  constructor(app: App, plugin: LinkTagAutoFillPlugin) {
    super(app);
    this.plugin = plugin;
  }

  async onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl('h2', { text: 'Batch Process Files' });

    // Get all markdown files
    this.allFiles = this.app.vault.getMarkdownFiles();

    // File selection
    const selectionDiv = contentEl.createDiv('file-selection');
    
    new Setting(selectionDiv)
      .setName('Select files to process')
      .setDesc('Choose which files to generate tags for');

    // Filter options
    const filterDiv = selectionDiv.createDiv('filter-options');
    
    new Setting(filterDiv)
      .setName('Filter by folder')
      .addDropdown(dropdown => {
        dropdown.addOption('', 'All folders');
        
        const folders = new Set<string>();
        this.allFiles.forEach(file => {
          const folder = file.parent?.path || '/';
          folders.add(folder);
        });
        
        Array.from(folders).sort().forEach(folder => {
          dropdown.addOption(folder, folder);
        });
        
        dropdown.onChange(value => this.filterFiles(value));
      });

    // Select all/none buttons
    const buttonDiv = filterDiv.createDiv('button-group');
    
    new ButtonComponent(buttonDiv)
      .setButtonText('Select All')
      .onClick(() => {
        this.selectedFiles = [...this.allFiles];
        this.renderFileList();
      });

    new ButtonComponent(buttonDiv)
      .setButtonText('Select None')
      .onClick(() => {
        this.selectedFiles = [];
        this.renderFileList();
      });

    // File list
    this.renderFileList();

    // Process options
    const optionsDiv = contentEl.createDiv('process-options');
    optionsDiv.createEl('h3', { text: 'Processing Options' });

    let skipExisting = true;
    new Setting(optionsDiv)
      .setName('Skip files with existing tags')
      .setDesc('Only process files that don\'t already have tags')
      .addToggle(toggle => toggle
        .setValue(skipExisting)
        .onChange(value => skipExisting = value));

    // Action buttons
    const actionDiv = contentEl.createDiv('modal-button-container');
    
    new ButtonComponent(actionDiv)
      .setButtonText('Start Processing')
      .setCta()
      .onClick(async () => {
        await this.startBatchProcess(skipExisting);
      });

    new ButtonComponent(actionDiv)
      .setButtonText('Cancel')
      .onClick(() => this.close());
  }

  private filterFiles(folderPath: string) {
    if (!folderPath) {
      this.allFiles = this.app.vault.getMarkdownFiles();
    } else {
      this.allFiles = this.app.vault.getMarkdownFiles().filter(file => 
        file.parent?.path === folderPath
      );
    }
    this.selectedFiles = [];
    this.renderFileList();
  }

  private renderFileList() {
    const existingContainer = this.contentEl.querySelector('.file-list-container');
    if (existingContainer) {
      existingContainer.remove();
    }

    const listContainer = this.contentEl.createDiv('file-list-container');
    listContainer.createEl('h4', { text: `Files (${this.selectedFiles.length}/${this.allFiles.length} selected)` });

    const fileList = listContainer.createDiv('file-list');
    
    this.allFiles.forEach(file => {
      const fileDiv = fileList.createDiv('file-item');

      const checkbox = fileDiv.createEl('input', {
        type: 'checkbox',
        cls: 'file-checkbox'
      });
      checkbox.checked = this.selectedFiles.includes(file);
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          this.selectedFiles.push(file);
          fileDiv.addClass('selected');
        } else {
          this.selectedFiles = this.selectedFiles.filter(f => f !== file);
          fileDiv.removeClass('selected');
        }
        this.renderFileList();
      });

      fileDiv.createSpan({ text: file.path, cls: 'file-path' });
      if (this.selectedFiles.includes(file)) {
        fileDiv.addClass('selected');
      }
    });
  }

  private async startBatchProcess(skipExisting: boolean) {
    if (this.selectedFiles.length === 0) {
      new Notice('No files selected');
      return;
    }

    const progressNotice = new Notice('Processing files...', 0);
    let processed = 0;
    let skipped = 0;
    let errors = 0;

    for (const file of this.selectedFiles) {
      try {
        // Check if file already has tags
        if (skipExisting) {
          const content = await this.app.vault.read(file);
          const existingTags = ContentProcessor.extractExistingTags(content);
          if (existingTags.length > 0) {
            skipped++;
            continue;
          }
        }

        // Generate and apply tags
        await this.plugin.generateAndApplyTags(file, true); // auto-apply mode
        processed++;
        
        // Update progress
        progressNotice.setMessage(`Processing... ${processed + skipped + errors}/${this.selectedFiles.length}`);
        
        // Small delay to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`Error processing ${file.path}:`, error);
        errors++;
      }
    }

    progressNotice.hide();
    new Notice(`Batch processing complete: ${processed} processed, ${skipped} skipped, ${errors} errors`);
    this.close();
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}