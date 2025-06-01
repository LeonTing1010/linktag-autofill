import { App, Modal, Notice } from 'obsidian';
import { TagSuggestion } from '../types';

export class TagSelectionModal extends Modal {
    private suggestions: TagSuggestion[];
    private onSubmit: (selectedTags: TagSuggestion[]) => void;
    private selectedTags: Set<string> = new Set();

    constructor(
        app: App,
        suggestions: TagSuggestion[],
        onSubmit: (selectedTags: TagSuggestion[]) => void
    ) {
        super(app);
        this.suggestions = suggestions;
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: 'Select Tags to Apply' });

        if (this.suggestions.length === 0) {
            contentEl.createEl('p', { text: 'No tag suggestions available.' });
            return;
        }

        // Create container for tag list
        const tagContainer = contentEl.createDiv('tag-selection-container');
        
        this.suggestions.forEach((suggestion, index) => {
            const tagItem = tagContainer.createDiv('tag-item');
            tagItem.style.cssText = `
                display: flex;
                align-items: center;
                padding: 8px;
                margin: 4px 0;
                border: 1px solid var(--background-modifier-border);
                border-radius: 4px;
                cursor: pointer;
            `;

            // Checkbox
            const checkbox = tagItem.createEl('input', {
                type: 'checkbox',
                attr: { id: `tag-${index}` }
            });
            checkbox.style.marginRight = '8px';

            // Tag info
            const tagInfo = tagItem.createDiv();
            tagInfo.innerHTML = `
                <strong>${suggestion.tag}</strong>
                <span style="margin-left: 8px; color: var(--text-muted);">
                    ${Math.round(suggestion.confidence * 100)}% confidence
                </span>
                ${suggestion.category ? `<span style="margin-left: 8px; font-size: 0.8em; background: var(--background-modifier-border); padding: 2px 6px; border-radius: 3px;">${suggestion.category}</span>` : ''}
            `;

            // Click handler
            tagItem.addEventListener('click', (e) => {
                if (e.target !== checkbox) {
                    checkbox.checked = !checkbox.checked;
                }
                
                if (checkbox.checked) {
                    this.selectedTags.add(suggestion.tag);
                    tagItem.style.backgroundColor = 'var(--background-modifier-hover)';
                } else {
                    this.selectedTags.delete(suggestion.tag);
                    tagItem.style.backgroundColor = '';
                }
            });

            // Pre-select high confidence tags (90% or higher)
            if (suggestion.confidence >= 0.9) {
                checkbox.checked = true;
                this.selectedTags.add(suggestion.tag);
                tagItem.style.backgroundColor = 'var(--background-modifier-hover)';
            }
        });

        // Buttons
        const buttonContainer = contentEl.createDiv();
        buttonContainer.style.cssText = `
            display: flex;
            justify-content: flex-end;
            gap: 8px;
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid var(--background-modifier-border);
        `;

        const cancelButton = buttonContainer.createEl('button', { text: 'Cancel' });
        cancelButton.addEventListener('click', () => {
            this.close();
        });

        const applyButton = buttonContainer.createEl('button', { 
            text: 'Apply Selected Tags',
            cls: 'mod-cta'
        });
        applyButton.addEventListener('click', () => {
            this.applySelectedTags();
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }

    private applySelectedTags() {
        const selectedSuggestions = this.suggestions.filter(s => 
            this.selectedTags.has(s.tag)
        );

        if (selectedSuggestions.length === 0) {
            new Notice('No tags selected');
            return;
        }

        try {
            this.onSubmit(selectedSuggestions);
            this.close();
            new Notice(`Applying ${selectedSuggestions.length} tags...`);
        } catch (error) {
            console.error('Error in onSubmit callback:', error);
            new Notice('Error applying tags: ' + error.message);
        }
    }
}