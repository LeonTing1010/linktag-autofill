import { TFile, App } from 'obsidian';
import { ContentAnalysis } from './types';
import { Utils } from './utils';

export class ContentProcessor {
  static async extractContent(file: TFile): Promise<string> {
    const app = (window as any).app as App;
    const content = await app.vault.read(file);
    
    // Remove frontmatter
    const withoutFrontmatter = content.replace(/^---[\s\S]*?---\n?/, '');
    
    // Remove existing tags
    const withoutTags = withoutFrontmatter.replace(/#[\w\-\/]+/g, '');
    
    // Remove markdown formatting
    const cleanContent = withoutTags
      .replace(/!\[.*?\]\(.*?\)/g, '') // Images
      .replace(/\[.*?\]\(.*?\)/g, '$1') // Links
      .replace(/[\s\S]*?/g, '') // Code blocks
      .replace(/`.*?`/g, '') // Inline code
      .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
      .replace(/\*(.*?)\*/g, '$1') // Italic
      .replace(/~~(.*?)~~/g, '$1') // Strikethrough
      .replace(/#{1,6}\s/g, '') // Headers
      .replace(/^\s*[-*+]\s/gm, '') // List items
      .replace(/^\s*\d+\.\s/gm, '') // Numbered lists
      .replace(/^\s*>\s/gm, '') // Blockquotes
      .replace(/\n{3,}/g, '\n\n') // Multiple newlines
      .trim();

    return cleanContent;
  }

  static extractExistingTags(content: string): string[] {
    const tags = new Set<string>();
    
    // Extract hashtags
    const hashtagMatches = content.match(/#[\w\-\/]+/g);
    if (hashtagMatches) {
      hashtagMatches.forEach(tag => tags.add(tag.substring(1)));
    }
    
    // Extract YAML frontmatter tags
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (frontmatterMatch) {
      const frontmatter = frontmatterMatch[1];
      const tagsMatch = frontmatter.match(/tags:\s*\[(.*?)\]/);
      if (tagsMatch) {
        const yamlTags = tagsMatch[1].split(',').map(tag => tag.trim().replace(/['"]/g, ''));
        yamlTags.forEach(tag => tags.add(tag));
      }
    }
    
    return Array.from(tags);
  }

  static analyzeContent(content: string): ContentAnalysis {
    const words = content.toLowerCase().split(/\s+/).filter(word => word.length > 2);
    const wordCount = words.length;
    
    // Extract keywords using simple frequency analysis
    const wordFreq = new Map<string, number>();
    words.forEach(word => {
      const cleaned = word.replace(/[^\w]/g, '');
      if (cleaned.length > 3) {
        wordFreq.set(cleaned, (wordFreq.get(cleaned) || 0) + 1);
      }
    });
    
    const keywords = Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
    
    // Simple topic extraction based on common patterns
    const topics = this.extractTopics(content);
    
    return {
      keywords,
      topics,
      wordCount,
      complexity: this.calculateComplexity(content)
    };
  }

  private static extractTopics(content: string): string[] {
    const topics = new Set<string>();
    
    // Look for common topic indicators
    const topicPatterns = [
      /(?:about|regarding|concerning)\s+([a-zA-Z\s]{3,20})/gi,
      /(?:study|research|analysis)\s+(?:of|on)\s+([a-zA-Z\s]{3,20})/gi,
      /([A-Z][a-zA-Z\s]{3,20})\s+(?:theory|concept|principle)/gi
    ];
    
    topicPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const topic = match.replace(pattern, '$1').trim().toLowerCase();
          if (topic.length > 3 && topic.length < 30) {
            topics.add(topic);
          }
        });
      }
    });
    
    return Array.from(topics).slice(0, 5);
  }

  private static calculateComplexity(content: string): number {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = content.split(/\s+/).filter(w => w.length > 0);
    
    if (sentences.length === 0) return 0;
    
    const avgWordsPerSentence = words.length / sentences.length;
    const avgCharsPerWord = words.reduce((sum, word) => sum + word.length, 0) / words.length;
    
    // Simple complexity score (0-1)
    return Math.min(1, (avgWordsPerSentence * avgCharsPerWord) / 100);
  }
}