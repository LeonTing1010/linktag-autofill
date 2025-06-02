import { TFile, App } from 'obsidian';

export class TagApplier {
    private app: App;
    
    constructor(app: App) {
        this.app = app;
    }
    
    async applyTagsWithPreCreation(tags: string[], file: TFile) {
        await this.preCreateTagsInObsidian(tags);
        await new Promise(resolve => setTimeout(resolve, 500));
        await this.applyTagsToDocument(tags, file);
        setTimeout(() => {
            this.verifyFinalResult(tags, file);
        }, 1000);
    }
    
    async preCreateTagsInObsidian(tags: string[]) {
        for (const tag of tags) {
            try {
                const tempContent = `#${tag}\n\nTemporary file to register tag.`;
                const tempFileName = `temp-tag-${tag.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now()}.md`;
                
                const tempFile = await this.app.vault.create(tempFileName, tempContent);
                
                await new Promise(resolve => setTimeout(resolve, 200));
                this.app.metadataCache.getFileCache(tempFile);
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // await this.app.vault.delete(tempFile);
                await this.app.fileManager.trashFile(tempFile);
            } catch (error) {
                console.error(`LinkTag: Error pre-creating tag #${tag}:`, error);
            }
        }
    }
    
    async applyTagsToDocument(tags: string[], file: TFile) {
        const content = await this.app.vault.read(file);
        const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
        const hasFrontmatter = frontmatterRegex.test(content);
        
        let updatedContent: string;
        
        if (hasFrontmatter) {
            updatedContent = content.replace(frontmatterRegex, (match, frontmatterContent) => {
                const updatedFrontmatter = this.updateFrontmatterTags(frontmatterContent, tags);
                return `---\n${updatedFrontmatter}\n---`;
            });
        } else {
            const newFrontmatter = `---\ntags: [${tags.map(tag => `"${tag}"`).join(', ')}]\n---\n\n`;
            updatedContent = newFrontmatter + content;
        }
        
        await this.app.vault.modify(file, updatedContent);
    }
    
    updateFrontmatterTags(frontmatterContent: string, newTags: string[]): string {
        const lines = frontmatterContent.split('\n');
        let tagsLineIndex = -1;
        let existingTags: string[] = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('tags:')) {
                tagsLineIndex = i;
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
        
        const allTags = [...new Set([...existingTags, ...newTags])];
        const tagsLine = `tags: [${allTags.map(tag => `"${tag}"`).join(', ')}]`;
        
        if (tagsLineIndex >= 0) {
            lines[tagsLineIndex] = tagsLine;
        } else {
            lines.unshift(tagsLine);
        }
        
        return lines.join('\n');
    }
    
    async verifyFinalResult(tags: string[], file: TFile) {
        const content = await this.app.vault.read(file);
        
        tags.forEach(tag => {
            const tagInContent = content.includes(`#${tag}`) || content.includes(`"${tag}"`);
        });
        
        const fileCache = this.app.metadataCache.getFileCache(file);
    }
}