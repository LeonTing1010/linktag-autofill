import { App, PluginSettingTab, Setting } from 'obsidian';
import { PluginSettings } from './types';
import LinkTagAutoFillPlugin from '../main';

export const DEFAULT_SETTINGS: PluginSettings = {
  activeProvider: 'openai',
  providers: {
    openai: {
      name: 'OpenAI',
      apiKey: '',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini',
      enabled: true
    },
    claude: {
      name: 'Claude',
      apiKey: '',
      baseUrl: 'https://api.anthropic.com',
      model: 'claude-4-sonnet',
      enabled: false
    },
    ollama: {
      name: 'Ollama',
      apiKey: '',
      baseUrl: 'http://localhost:11434',
      model: 'llama2',
      enabled: false
    }
  },
  customPrompt: 'Generate relevant tags for the following content. Requirements: 1. Tags must be highly relevant to the content 2. Use the same language as the content 3. Each tag should not exceed 4 characters/words 4. Each tag must be unique, no duplicates 5. Return only a comma-separated list of tags, no explanations. Content: {content}',
  maxTags: 10,  minConfidence: 0.5,
  enableHierarchy: false,
  tagFormat: 'hashtag',
  autoTrigger: false,
  tagMergeMode: 'smart'
};

export class SettingTab extends PluginSettingTab {
  plugin: LinkTagAutoFillPlugin;

  constructor(app: App, plugin: LinkTagAutoFillPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'LinkTag AutoFill Settings' });

    // General Settings
    containerEl.createEl('h3', { text: 'General Settings' });

    new Setting(containerEl)
      .setName('Active Provider')
      .setDesc('Choose which LLM provider to use for tag generation')
      .addDropdown(dropdown => dropdown
        .addOption('openai', 'OpenAI')
        .addOption('claude', 'Claude')
        .addOption('ollama', 'Ollama')
        .setValue(this.plugin.settings.activeProvider)
        .onChange(async (value) => {
          this.plugin.settings.activeProvider = value as 'openai' | 'claude' | 'ollama';
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Max Tags')
      .setDesc('Maximum number of tags to generate')
      .addSlider(slider => slider
        .setLimits(1, 20, 1)
        .setValue(this.plugin.settings.maxTags)
        .setDynamicTooltip()
        .onChange(async (value) => {
          this.plugin.settings.maxTags = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Minimum Confidence')
      .setDesc('Minimum confidence threshold for tags (0.0 - 1.0)')
      .addSlider(slider => slider
        .setLimits(0, 1, 0.1)
        .setValue(this.plugin.settings.minConfidence)
        .setDynamicTooltip()
        .onChange(async (value) => {
          this.plugin.settings.minConfidence = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Tag Format')
      .setDesc('Choose how tags should be added to files')
      .addDropdown(dropdown => dropdown
        .addOption('hashtag', 'Hashtags (#tag)')
        .addOption('yaml', 'YAML Frontmatter')
        .addOption('inline', 'Inline Links')
        .addOption('both', 'Both Hashtags and YAML')
        .setValue(this.plugin.settings.tagFormat)
        .onChange(async (value) => {
          this.plugin.settings.tagFormat = value as 'hashtag' | 'yaml' | 'inline' | 'both';
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Tag Merge Mode')
      .setDesc('How to handle existing tags when applying new ones')
      .addDropdown(dropdown => dropdown
        .addOption('append', 'Append - Add new tags to existing ones')
        .addOption('replace', 'Replace - Overwrite all existing tags')
        .addOption('smart', 'Smart - Merge and avoid duplicates')
        .setValue(this.plugin.settings.tagMergeMode || 'smart')
        .onChange(async (value) => {
          this.plugin.settings.tagMergeMode = value as 'append' | 'replace' | 'smart';
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Enable Hierarchy')
      .setDesc('Generate hierarchical tags (category/subcategory)')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.enableHierarchy)
        .onChange(async (value) => {
          this.plugin.settings.enableHierarchy = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Auto Trigger')
      .setDesc('Automatically generate tags when files are modified')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.autoTrigger)
        .onChange(async (value) => {
          this.plugin.settings.autoTrigger = value;
          await this.plugin.saveSettings();
        }));

    // Custom Prompt
    new Setting(containerEl)
      .setName('Custom Prompt')
      .setDesc('Customize the prompt sent to the LLM. Use {content} as placeholder. The default prompt includes requirements for relevance, language consistency, tag length, and output format.')
      .addTextArea(text => {
        const textArea = text
          .setPlaceholder('Generate relevant tags for the following content. Requirements: 1. Tags must be highly relevant to the content 2. Use the same language as the content 3. Each tag should not exceed 4 characters/words 4. Return only a comma-separated list of tags, no explanations. Content: {content}')
          .setValue(this.plugin.settings.customPrompt)
          .onChange(async (value) => {
            this.plugin.settings.customPrompt = value;
            await this.plugin.saveSettings();
          });
        // Add custom class for styling
        textArea.inputEl.classList.add('ltaf-custom-prompt-textarea');
        this.setupTextArea(textArea.inputEl);
        return textArea;
      });

    // Provider Settings
    containerEl.createEl('h3', { text: 'Provider Settings' });

    // OpenAI Settings
    containerEl.createEl('h4', { text: 'OpenAI' });
    
    new Setting(containerEl)
      .setName('OpenAI API Key')
      .setDesc('Your OpenAI API key')
      .addText(text => text
        .setPlaceholder('sk-...')
        .setValue(this.plugin.settings.providers.openai.apiKey)
        .onChange(async (value) => {
          this.plugin.settings.providers.openai.apiKey = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('OpenAI Model')
      .setDesc('OpenAI model to use')
      .addText(text => text
        .setPlaceholder('gpt-4o-mini')
        .setValue(this.plugin.settings.providers.openai.model)
        .onChange(async (value) => {
          this.plugin.settings.providers.openai.model = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('OpenAI Base URL')
      .setDesc('OpenAI API base URL')
      .addText(text => text
        .setPlaceholder('https://api.openai.com/v1')
        .setValue(this.plugin.settings.providers.openai.baseUrl)
        .onChange(async (value) => {
          this.plugin.settings.providers.openai.baseUrl = value;
          await this.plugin.saveSettings();
        }));

    // Claude Settings
    containerEl.createEl('h4', { text: 'Claude' });
    
    new Setting(containerEl)
      .setName('Claude API Key')
      .setDesc('Your Anthropic API key')
      .addText(text => text
        .setPlaceholder('sk-ant-...')
        .setValue(this.plugin.settings.providers.claude.apiKey)
        .onChange(async (value) => {
          this.plugin.settings.providers.claude.apiKey = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Claude Model')
      .setDesc('Claude model to use')
      .addText(text => text
        .setPlaceholder('claude-4-sonnet')
        .setValue(this.plugin.settings.providers.claude.model)
        .onChange(async (value) => {
          this.plugin.settings.providers.claude.model = value;
          await this.plugin.saveSettings();
        }));

    // Ollama Settings
    containerEl.createEl('h4', { text: 'Ollama' });
    
    new Setting(containerEl)
      .setName('Ollama Base URL')
      .setDesc('Ollama server URL')
      .addText(text => text
        .setPlaceholder('http://localhost:11434')
        .setValue(this.plugin.settings.providers.ollama.baseUrl)
        .onChange(async (value) => {
          this.plugin.settings.providers.ollama.baseUrl = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Ollama Model')
      .addText(text => text
        .setPlaceholder('ollama2')
        .setValue(this.plugin.settings.providers.ollama.model)
        .onChange(async (value) => {
          this.plugin.settings.providers.ollama.model = value;
          await this.plugin.saveSettings();
        }));

    // 为Ollama添加模型推荐说明
    if (this.plugin.settings.activeProvider === 'ollama') {
      const ollamaHint = containerEl.createEl('div', {
        cls: ['setting-item-description', 'ltaf-ollama-hint'],
        text: '💡 For better Chinese tag generation, consider using: qwen2.5:3b, qwen2.5:7b, or glm4:9b'
      });
    }
  }

  private setupTextArea(textAreaEl: HTMLTextAreaElement): void {
    // Only handle dynamic resizing, not static styles
    const autoResize = () => {
      textAreaEl.style.height = 'auto';
      textAreaEl.style.height = Math.max(80, textAreaEl.scrollHeight) + 'px';
    };
    setTimeout(autoResize, 0);
    textAreaEl.addEventListener('input', autoResize);
    textAreaEl.addEventListener('paste', () => setTimeout(autoResize, 0));
  }
}