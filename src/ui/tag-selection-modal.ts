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

            // Checkbox
            const checkbox = tagItem.createEl('input', {
                type: 'checkbox',
                attr: { id: `tag-${index}` },
                cls: 'tag-checkbox'
            });

            // Tag info (use DOM API, not innerHTML)
            const tagLabel = tagItem.createDiv('tag-label');

            // Tag name
            const tagName = tagLabel.createSpan({ text: suggestion.tag, cls: 'tag-name' });

            // Confidence
            const confidence = tagLabel.createSpan({
                text: `${Math.round(suggestion.confidence * 100)}% confidence`,
                cls: 'confidence-text'
            });

            // Category (if present)
            if (suggestion.category) {
                tagLabel.createSpan({
                    text: suggestion.category,
                    cls: 'tag-category'
                });
            }

            // Click handler
            tagItem.addEventListener('click', (e) => {
                if (e.target !== checkbox) {
                    checkbox.checked = !checkbox.checked;
                }
                if (checkbox.checked) {
                    this.selectedTags.add(suggestion.tag);
                    tagItem.addClass('selected');
                } else {
                    this.selectedTags.delete(suggestion.tag);
                    tagItem.removeClass('selected');
                }
            });

            // Pre-select high confidence tags (90% or higher)
            if (suggestion.confidence >= 0.9) {
                checkbox.checked = true;
                this.selectedTags.add(suggestion.tag);
                tagItem.addClass('selected');
            }
        });

        // Buttons
        const buttonContainer = contentEl.createDiv('modal-button-container');

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