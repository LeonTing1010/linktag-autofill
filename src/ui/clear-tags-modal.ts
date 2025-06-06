import { App, Modal, Notice, TFile } from 'obsidian';
import { TagManager } from '../tag-manager';

export class ClearTagsModal extends Modal {
    private tagManager: TagManager;
    private selectedFiles: Set<TFile> = new Set();
    private allFiles: TFile[] = [];

    constructor(app: App, tagManager: TagManager) {
        super(app);
        this.tagManager = tagManager;
    }

    async onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: 'Clear Tags from Files' });

        // Get all markdown files
        this.allFiles = this.app.vault.getMarkdownFiles();

        if (this.allFiles.length === 0) {
            contentEl.createEl('p', { text: 'No markdown files found.' });
            return;
        }

        // Filter files that have tags
        const filesWithTags = this.allFiles.filter(file => {
            const cache = this.app.metadataCache.getFileCache(file);
            return cache?.frontmatter?.tags && cache.frontmatter.tags.length > 0;
        });

        if (filesWithTags.length === 0) {
            contentEl.createEl('p', { text: 'No files with tags found.' });
            return;
        }

        // Selection controls
        const controlsContainer = contentEl.createDiv('tag-controls');

        const selectAllBtn = controlsContainer.createEl('button', { text: 'Select All' });
        selectAllBtn.addEventListener('click', () => {
            filesWithTags.forEach(file => this.selectedFiles.add(file));
            this.updateFileList();
        });

        const selectNoneBtn = controlsContainer.createEl('button', { text: 'Select None' });
        selectNoneBtn.addEventListener('click', () => {
            this.selectedFiles.clear();
            this.updateFileList();
        });

        // File list container
        const fileListContainer = contentEl.createDiv('file-list-container');

        this.createFileList(fileListContainer, filesWithTags);

        // Buttons
        const buttonContainer = contentEl.createDiv('modal-button-container');

        const cancelButton = buttonContainer.createEl('button', { text: 'Cancel' });
        cancelButton.addEventListener('click', () => {
            this.close();
        });

        const clearButton = buttonContainer.createEl('button', { 
            text: 'Clear Tags',
            cls: 'mod-warning'
        });
        clearButton.addEventListener('click', () => {
            this.clearSelectedTags();
        });
    }

    private createFileList(container: HTMLElement, files: TFile[]) {
        container.empty();

        files.forEach(file => {
            const fileItem = container.createDiv('file-item');

            // Checkbox
            const checkbox = fileItem.createEl('input', {
                type: 'checkbox',
                attr: { id: `file-${file.path}` },
                cls: 'tag-checkbox'
            });
            checkbox.checked = this.selectedFiles.has(file);

            // File info (use DOM API, not innerHTML)
            const fileInfo = fileItem.createDiv('tag-label');
            const cache = this.app.metadataCache.getFileCache(file);
            const tagCount = cache?.frontmatter?.tags?.length || 0;

            // File name
            fileInfo.createSpan({ text: file.basename, cls: 'tag-name' });
            // Path and tag count
            const meta = fileInfo.createSpan({
                text: ` ${file.path} • ${tagCount} tags`,
                cls: 'confidence-text'
            });

            // Click handler
            fileItem.addEventListener('click', (e) => {
                if (e.target !== checkbox) {
                    checkbox.checked = !checkbox.checked;
                }
                if (checkbox.checked) {
                    this.selectedFiles.add(file);
                    fileItem.addClass('selected');
                } else {
                    this.selectedFiles.delete(file);
                    fileItem.removeClass('selected');
                }
            });

            if (this.selectedFiles.has(file)) {
                fileItem.addClass('selected');
            }
        });
    }

    private updateFileList() {
        const container = this.contentEl.querySelector('.file-list-container') as HTMLElement;
        if (container) {
            const filesWithTags = this.allFiles.filter(file => {
                const cache = this.app.metadataCache.getFileCache(file);
                return cache?.frontmatter?.tags && cache.frontmatter.tags.length > 0;
            });
            this.createFileList(container, filesWithTags);
        }
    }

    private async clearSelectedTags() {
        if (this.selectedFiles.size === 0) {
            new Notice('No files selected');
            return;
        }

        const selectedFilesArray = Array.from(this.selectedFiles);
        
        try {
            new Notice(`Clearing tags from ${selectedFilesArray.length} files...`);
            
            const result = await this.tagManager.clearTagsFromFiles(selectedFilesArray);
            
            this.close();
            
            if (result.failed > 0) {
                new Notice(`Cleared tags from ${result.success} files. ${result.failed} files failed.`);
            } else {
                new Notice(`Successfully cleared tags from ${result.success} files.`);
            }
            
        } catch (error) {
            console.error('Error clearing tags:', error);
            new Notice('Error clearing tags: ' + error.message);
        }
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}