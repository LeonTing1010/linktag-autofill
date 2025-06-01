import { TFile, App } from 'obsidian';

export class TagApplier {
    private app: App;
    
    constructor(app: App) {
        this.app = app;
    }
    
    async applyTagsWithPreCreation(tags: string[], file: TFile) {
        console.log('LinkTag: Starting enhanced tag application with pre-creation');
        
        // 步骤1: 预创建标签（验证你的假设）
        await this.preCreateTagsInObsidian(tags);
        
        // 步骤2: 等待 Obsidian 处理
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 步骤3: 正常应用标签
        await this.applyTagsToDocument(tags, file);
        
        // 步骤4: 验证结果
        setTimeout(() => {
            this.verifyFinalResult(tags, file);
        }, 1000);
    }
    
    async preCreateTagsInObsidian(tags: string[]) {
        console.log('LinkTag: Pre-creating tags in Obsidian');
        
        for (const tag of tags) {
            try {
                const tempContent = `#${tag}\n\nTemporary file to register tag.`;
                const tempFileName = `temp-tag-${tag.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now()}.md`;
                
                const tempFile = await this.app.vault.create(tempFileName, tempContent);
                console.log(`LinkTag: Created temp file for tag #${tag}: ${tempFileName}`);
                
                await new Promise(resolve => setTimeout(resolve, 200));
                this.app.metadataCache.getFileCache(tempFile);
                await new Promise(resolve => setTimeout(resolve, 100));
                
                await this.app.vault.delete(tempFile);
                console.log(`LinkTag: Deleted temp file for tag #${tag}`);
                
            } catch (error) {
                console.error(`LinkTag: Error pre-creating tag #${tag}:`, error);
            }
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    async applyTagsToDocument(tags: string[], file: TFile) {
        console.log('LinkTag: Applying tags to document');
        
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
        console.log('LinkTag: Verifying final result');
        
        const content = await this.app.vault.read(file);
        console.log('LinkTag: Final document content preview:', content.substring(0, 200));
        
        tags.forEach(tag => {
            const tagInContent = content.includes(`#${tag}`) || content.includes(`"${tag}"`);
            console.log(`LinkTag: Tag "${tag}" found in content:`, tagInContent);
        });
        
        const fileCache = this.app.metadataCache.getFileCache(file);
        console.log('LinkTag: File metadata cache:', fileCache);
        console.log('LinkTag: File tags from cache:', fileCache?.tags);
        console.log('LinkTag: File frontmatter tags:', fileCache?.frontmatter?.tags);
    }
}