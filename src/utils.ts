export class Utils {
  static sanitizeTag(tag: string): string {
    return tag
      .toLowerCase()
      .replace(/[^\w\s\-\/]/g, '')
      .replace(/\s+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50); // Limit tag length
  }

  static validateApiKey(provider: string, apiKey: string): boolean {
    if (provider === 'ollama') return true; // Ollama doesn't require API key
    
    switch (provider) {
      case 'openai':
        return apiKey.startsWith('sk-') && apiKey.length > 20;
      case 'claude':
        return apiKey.startsWith('sk-ant-') && apiKey.length > 20;
      default:
        return false;
    }
  }

  static formatProcessingTime(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`;
    } else {
      return `${(ms / 1000).toFixed(1)}s`;
    }
  }

  static truncateContent(content: string, maxLength: number = 4000): string {
    if (content.length <= maxLength) {
      return content;
    }
    
    // Try to truncate at sentence boundary
    const truncated = content.substring(0, maxLength);
    const lastSentence = truncated.lastIndexOf('.');
    
    if (lastSentence > maxLength * 0.8) {
      return truncated.substring(0, lastSentence + 1);
    }
    
    return truncated + '...';
  }

  static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  static async retry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (i === maxRetries) {
          throw lastError;
        }
        
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
    
    throw lastError!;
  }

  static extractKeywords(text: string, maxKeywords: number = 10): string[] {
    // Simple keyword extraction
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3);

    // Count word frequency
    const wordCount = new Map<string, number>();
    words.forEach(word => {
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    });

    // Sort by frequency and return top keywords
    return Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxKeywords)
      .map(([word]) => word);
  }

  static calculateSimilarity(str1: string, str2: string): number {
    // Simple Jaccard similarity
    const set1 = new Set(str1.toLowerCase().split(/\s+/));
    const set2 = new Set(str2.toLowerCase().split(/\s+/));
    
    const intersection = new Set(Array.from(set1).filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }
}