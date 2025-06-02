import { App, TFile, Notice } from 'obsidian';
import { PluginSettings, TagSuggestion } from './types';

export class TagManager {
    private settings: PluginSettings;
    private app: App;

    constructor(app: App, settings: PluginSettings) {
        this.app = app;
        this.settings = settings;
    }

    updateSettings(settings: PluginSettings) {
        this.settings = settings;
    }

    async applyTagsToFile(file: TFile, suggestions: TagSuggestion[]): Promise<void> {
        if (!file || suggestions.length === 0) {
            return;
        }

        try {
            // Extract tag names from suggestions
            const tagNames = suggestions.map(s => s.tag);

            // Read current file content
            const content = await this.app.vault.read(file);

            // Apply tags to content
            const updatedContent = await this.addTagsToContent(content, tagNames);

            // Write back to file
            await this.app.vault.modify(file, updatedContent);

            // Show success notice
            new Notice(`Applied ${tagNames.length} tags: ${tagNames.join(', ')}`);

        } catch (error) {
            console.error('Error applying tags:', error);
            new Notice('Error applying tags: ' + error.message);
            throw error;
        }
    }

    async clearTagsFromFile(file: TFile): Promise<void> {
        if (!file) {
            return;
        }

        try {
            // Read current file content
            const content = await this.app.vault.read(file);

            // Remove tags from content
            const updatedContent = this.removeTagsFromContent(content);

            // Write back to file
            await this.app.vault.modify(file, updatedContent);

        } catch (error) {
            console.error('Error clearing tags:', error);
            throw error;
        }
    }

    async clearTagsFromFiles(files: TFile[]): Promise<{ success: number; failed: number }> {
        let success = 0;
        let failed = 0;

        for (const file of files) {
            try {
                await this.clearTagsFromFile(file);
                success++;
            } catch (error) {
                console.error(`Failed to clear tags from ${file.path}:`, error);
                failed++;
            }
        }

        return { success, failed };
    }

    private removeTagsFromContent(content: string): string {
        // Check if content has frontmatter
        const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
        const hasFrontmatter = frontmatterRegex.test(content);

        if (hasFrontmatter) {
            // Remove tags from existing frontmatter
            return content.replace(frontmatterRegex, (match, frontmatterContent) => {
                const updatedFrontmatter = this.removeFrontmatterTags(frontmatterContent);
                
                // If frontmatter becomes empty, remove it entirely
                if (updatedFrontmatter.trim() === '') {
                    return '';
                }
                
                return `---\n${updatedFrontmatter}\n---`;
            });
        }

        // No frontmatter, return content as is
        return content;
    }

    private removeFrontmatterTags(frontmatterContent: string): string {
        const lines = frontmatterContent.split('\n');
        const filteredLines = lines.filter(line => {
            const trimmedLine = line.trim();
            return !trimmedLine.startsWith('tags:');
        });

        return filteredLines.join('\n');
    }

    private async addTagsToContent(content: string, tags: string[]): Promise<string> {  
           // Check if content has frontmatter
        const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
        const hasFrontmatter = frontmatterRegex.test(content);
        if (hasFrontmatter) {
            // Update existing frontmatter
            return content.replace(frontmatterRegex, (match, frontmatterContent) => {
                const updatedFrontmatter = this.updateFrontmatterTags(frontmatterContent, tags);
                return `---\n${updatedFrontmatter}\n---`;
            });
        } else {
            // Create new frontmatter
            const frontmatter = `---\ntags: [${tags.map(tag => `"${tag}"`).join(', ')}]\n---\n\n`;
            return frontmatter + content;
        }
    }

    private updateFrontmatterTags(frontmatterContent: string, newTags: string[]): string {
        const lines = frontmatterContent.split('\n');
        let tagsLineIndex = -1;
        let existingTags: string[] = [];
        // Find existing tags line
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('tags:')) {
                tagsLineIndex = i;

                // Parse existing tags
                const tagsMatch = line.match(/tags:\s*\[(.*)\]/);
                if (tagsMatch) {
                    existingTags = tagsMatch[1]
                        .split(',')
                        .map(tag => tag.trim().replace(/['"]/g, ''))
                        .filter(tag => tag.length > 0);
                }
                break;
            }
        }

                 // 根据合并模式处理标签
        let finalTags: string[];
            
        switch (this.settings.tagMergeMode) {
        case 'append':
            finalTags = [...existingTags, ...newTags]; // 保留现有 + 添加新的
            break;
        case 'replace':
            finalTags = newTags; // 只使用新标签，完全替换
            break;
        case 'smart':
        default:
            // Merge tags (avoid duplicates)
            finalTags = [...new Set([...existingTags, ...newTags])];
            break;
        }  
        // Create new tags line
        const tagsLine = `tags: [${finalTags.map(tag => `"${tag}"`).join(', ')}]`;

        if (tagsLineIndex >= 0) {
            // Replace existing tags line
            lines[tagsLineIndex] = tagsLine;
        } else {
            // Add new tags line at the beginning
            lines.unshift(tagsLine);
        }

        return lines.join('\n');
    }
}