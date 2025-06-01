import { App, Modal, Setting } from 'obsidian';
import { TagHistory } from '../tag-history';

export class TagAnalyticsModal extends Modal {
  private tagHistory: TagHistory;

  constructor(app: App, tagHistory: TagHistory) {
    super(app);
    this.tagHistory = tagHistory;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl('h2', { text: 'Tag Analytics' });

    // Popular Tags Section
    const popularSection = contentEl.createDiv('analytics-section');
    popularSection.createEl('h3', { text: 'Most Popular Tags' });
    
    const popularTags = this.tagHistory.getPopularTags(15);
    const popularList = popularSection.createDiv('tag-list');
    
    popularTags.forEach(({ tag, count }) => {
      const tagItem = popularList.createDiv('tag-analytics-item');
      tagItem.createSpan({ text: tag, cls: 'tag-name' });
      tagItem.createSpan({ text: `${count} uses`, cls: 'tag-count' });
    });

    // Tag Performance Section
    const performanceSection = contentEl.createDiv('analytics-section');
    performanceSection.createEl('h3', { text: 'Tag Success Rate' });
    
    const performance = this.tagHistory.getTagPerformance().slice(0, 15);
    const performanceList = performanceSection.createDiv('tag-list');
    
    performance.forEach(({ tag, successRate }) => {
      const tagItem = performanceList.createDiv('tag-analytics-item');
      tagItem.createSpan({ text: tag, cls: 'tag-name' });
      
      const rateSpan = tagItem.createSpan({ 
        text: `${Math.round(successRate * 100)}%`, 
        cls: 'success-rate' 
      });
      
      // Color code based on success rate
      if (successRate > 0.8) {
        rateSpan.addClass('high-success');
      } else if (successRate > 0.5) {
        rateSpan.addClass('medium-success');
      } else {
        rateSpan.addClass('low-success');
      }
    });

    // Export/Import Section
    const dataSection = contentEl.createDiv('analytics-section');
    dataSection.createEl('h3', { text: 'Data Management' });
    
    new Setting(dataSection)
      .setName('Export History')
      .setDesc('Export tag history as JSON')
      .addButton(button => button
        .setButtonText('Export')
        .onClick(() => {
          const data = this.tagHistory.exportHistory();
          this.downloadData(data, 'tag-history.json');
        }));

    new Setting(dataSection)
      .setName('Import History')
      .setDesc('Import tag history from JSON file')
      .addButton(button => button
        .setButtonText('Import')
        .onClick(() => {
          this.importData();
        }));

    new Setting(dataSection)
      .setName('Clear History')
      .setDesc('Clear all tag history data')
      .addButton(button => button
        .setButtonText('Clear')
        .setWarning()
        .onClick(() => {
          this.tagHistory.clearHistory();
          this.close();
        }));
  }

  private downloadData(data: string, filename: string) {
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  private importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const data = e.target?.result as string;
          if (this.tagHistory.importHistory(data)) {
            this.onOpen(); // Refresh the modal
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}