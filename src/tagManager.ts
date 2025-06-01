import { TFile, App } from 'obsidian';
import { PluginSettings } from './types';

export class TagManager {
  constructor(private app: App, private settings: PluginSettings) {}

  async applyTags(file: TFile, newTags: string[]): Promise<void> {
    const content = await this.app.vault.read(file);
    
    // 根据合并模式处理标签
    let finalTags: string[];
    
    switch (this.settings.tagMergeMode) {
      case 'append':
        const existingTags = this.extractExistingTags(content);
        finalTags = [...existingTags, ...newTags]; // 保留现有 + 添加新的
        break;
      case 'replace':
        finalTags = newTags; // 只使用新标签，完全替换
        break;
      case 'smart':
      default:
        const existing = this.extractExistingTags(content);
        finalTags = this.smartMergeTags(existing, newTags);
        break;
    }

    const updatedContent = await this.updateContentWithTags(content, finalTags);
    await this.app.vault.modify(file, updatedContent);
  }

  // 添加 applyTagsToFile 方法以兼容 main.ts 中的调用
  async applyTagsToFile(file: TFile, selectedTags: any[]): Promise<void> {
    // 将 TagSuggestion 对象转换为字符串数组
    const tagStrings = selectedTags.map(tag => 
      typeof tag === 'string' ? tag : tag.tag
    );
    await this.applyTags(file, tagStrings);
  }

  // 添加 clearTagsFromFile 方法
  async clearTagsFromFile(file: TFile): Promise<void> {
    await this.applyTags(file, []); // 传入空数组，相当于 replace 模式
  }

  // 添加 updateSettings 方法
  updateSettings(settings: PluginSettings): void {
    this.settings = settings;
  }

  private smartMergeTags(existingTags: string[], newTags: string[]): string[] {
    // 智能合并：去重并保持现有标签顺序
    const tagSet = new Set(existingTags.map(tag => tag.toLowerCase()));
    const mergedTags = [...existingTags];
    
    for (const newTag of newTags) {
      if (!tagSet.has(newTag.toLowerCase())) {
        mergedTags.push(newTag);
        tagSet.add(newTag.toLowerCase());
      }
    }
    
    return mergedTags;
  }

  private extractExistingTags(content: string): string[] {
    const tags: string[] = [];
    
    // 根据设置的标签格式提取现有标签
    switch (this.settings.tagFormat) {
      case 'yaml':
      case 'both':
        tags.push(...this.extractYamlTags(content));
        if (this.settings.tagFormat === 'yaml') break;
        // 如果是 'both'，继续执行下面的 hashtag 提取
      case 'hashtag':
        tags.push(...this.extractHashtags(content));
        break;
      case 'inline':
        tags.push(...this.extractInlineTags(content));
        break;
    }
    
    return tags;
  }

  private extractYamlTags(content: string): string[] {
    const yamlRegex = /^---\s*\n([\s\S]*?)\n---/;
    const match = content.match(yamlRegex);
    
    if (!match) return [];
    
    const yamlContent = match[1];
    const tagsMatch = yamlContent.match(/^tags:\s*(.+)$/m);
    
    if (!tagsMatch) return [];
    
    const tagsString = tagsMatch[1].trim();
    
    // 处理数组格式: ["tag1", "tag2"] 或 [tag1, tag2]
    if (tagsString.startsWith('[') && tagsString.endsWith(']')) {
      const arrayContent = tagsString.slice(1, -1);
      return arrayContent
        .split(',')
        .map(tag => tag.trim().replace(/^["']|["']$/g, ''))
        .filter(tag => tag.length > 0);
    }
    
    // 处理列表格式
    const listMatch = yamlContent.match(/^tags:\s*\n((?:\s*-\s*.+\n?)+)/m);
    if (listMatch) {
      return listMatch[1]
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.startsWith('-'))
        .map(line => line.substring(1).trim())
        .filter(tag => tag.length > 0);
    }
    
    return [];
  }

 

  private async updateContentWithTags(content: string, tags: string[]): Promise<string> {
    switch (this.settings.tagFormat) {
      case 'yaml':
        return this.updateYamlTags(content, tags);
      case 'hashtag':
        return this.updateHashtags(content, tags);
      case 'inline':
        return this.updateInlineTags(content, tags);
      case 'both':
        let updatedContent = this.updateYamlTags(content, tags);
        updatedContent = this.updateHashtags(updatedContent, tags);
        return updatedContent;
      default:
        return content;
    }
  }

  private updateYamlTags(content: string, tags: string[]): string {
    const yamlRegex = /^---\s*\n([\s\S]*?)\n---/;
    const match = content.match(yamlRegex);
    
    if (tags.length === 0) {
      // 如果没有标签，移除 YAML 中的 tags 字段
      if (match) {
        let yamlContent = match[1];
        yamlContent = yamlContent.replace(/^tags:\s*.*$/m, '');
        yamlContent = yamlContent.replace(/^tags:\s*\n((?:\s*-\s*.+\n?)+)/m, '');
        yamlContent = yamlContent.trim();
        
        if (yamlContent) {
          return content.replace(yamlRegex, `---\n${yamlContent}\n---`);
        } else {
          // 如果 YAML 为空，移除整个 frontmatter
          return content.replace(yamlRegex, '').trim();
        }
      }
      return content;
    }
    
    const tagsArray = `[${tags.map(tag => `"${tag}"`).join(', ')}]`;
    const tagsLine = `tags: ${tagsArray}`;
    
    if (match) {
      // 更新现有的 YAML frontmatter
      let yamlContent = match[1];
      
      // 移除现有的 tags 行
      yamlContent = yamlContent.replace(/^tags:\s*.*$/m, '');
      yamlContent = yamlContent.replace(/^tags:\s*\n((?:\s*-\s*.+\n?)+)/m, '');
      
      // 添加新的 tags 行
      yamlContent = yamlContent.trim();
      if (yamlContent) {
        yamlContent += '\n' + tagsLine;
      } else {
        yamlContent = tagsLine;
      }
      
      return content.replace(yamlRegex, `---\n${yamlContent}\n---`);
    } else {
      // 添加新的 YAML frontmatter
      return `---\n${tagsLine}\n---\n\n${content}`;
    }
  }


  private updateHashtags(content: string, tags: string[]): string {
    // 改进的 hashtag 正则，支持中英文、数字、下划线、连字符等
    // 匹配 # 后跟任意非空白字符，直到遇到空白字符或行尾
    content = content.replace(/#[\w\u4e00-\u9fff\-_\/]+/g, '').replace(/\s+/g, ' ').trim();
    
    if (tags.length > 0) {
      const hashtagsString = tags.map(tag => `#${tag}`).join(' ');
      return content.trim() + '\n\n' + hashtagsString;
    }
    
    return content;
  }

  private updateInlineTags(content: string, tags: string[]): string {
    // Inline tags 的正则相对简单，但可以更精确
    content = content.replace(/\[\[[^\[\]]+\]\]/g, '').replace(/\s+/g, ' ').trim();
    
    if (tags.length > 0) {
      const inlineTagsString = tags.map(tag => `[[${tag}]]`).join(' ');
      return content.trim() + '\n\n' + inlineTagsString;
    }
    
    return content;
  }

  private extractHashtags(content: string): string[] {
    // 同样改进提取 hashtags 的正则
    const hashtagRegex = /#([\w\u4e00-\u9fff\-_\/]+)/g;
    const tags: string[] = [];
    let match;
    
    while ((match = hashtagRegex.exec(content)) !== null) {
      tags.push(match[1]);
    }
    
    return tags;
  }

  private extractInlineTags(content: string): string[] {
    // 改进 inline tags 提取
    const inlineRegex = /\[\[([^\[\]]+)\]\]/g;
    const tags: string[] = [];
    let match;
    
    while ((match = inlineRegex.exec(content)) !== null) {
      tags.push(match[1]);
    }
    
    return tags;
  }

}
