import { TFile } from 'obsidian';
import { TagSuggestion } from './types';

interface TagHistoryEntry {
  file: string;
  timestamp: number;
  appliedTags: string[];
  rejectedTags: string[];
  confidence: number;
}

export class TagHistory {
  private history: TagHistoryEntry[] = [];
  private maxHistorySize = 1000;

  addEntry(file: TFile, applied: TagSuggestion[], rejected: TagSuggestion[]) {
    const entry: TagHistoryEntry = {
      file: file.path,
      timestamp: Date.now(),
      appliedTags: applied.map(tag => tag.tag),
      rejectedTags: rejected.map(tag => tag.tag),
      confidence: applied.reduce((sum, tag) => sum + tag.confidence, 0) / applied.length || 0
    };

    this.history.unshift(entry);
    
    // Limit history size
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(0, this.maxHistorySize);
    }
  }

  getRecommendations(content: string): string[] {
    // Analyze history to recommend tags based on similar content
    const keywords = content.toLowerCase().split(/\s+/);
    const recommendations = new Map<string, number>();

    for (const entry of this.history) {
      // Simple content similarity check
      const entryKeywords = entry.file.toLowerCase().split(/[\s\/\-\.]/);
      const commonKeywords = keywords.filter(k => entryKeywords.some(ek => ek.includes(k) || k.includes(ek)));
      
      if (commonKeywords.length > 0) {
        const similarity = commonKeywords.length / Math.max(keywords.length, entryKeywords.length);
        
        for (const tag of entry.appliedTags) {
          recommendations.set(tag, (recommendations.get(tag) || 0) + similarity * entry.confidence);
        }
      }
    }

    return Array.from(recommendations.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag]) => tag);
  }

  getPopularTags(limit: number = 20): Array<{tag: string, count: number}> {
    const tagCounts = new Map<string, number>();
    
    for (const entry of this.history) {
      for (const tag of entry.appliedTags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }

    return Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([tag, count]) => ({ tag, count }));
  }

  getTagPerformance(): Array<{tag: string, successRate: number}> {
    const tagStats = new Map<string, {applied: number, rejected: number}>();
    
    for (const entry of this.history) {
      for (const tag of entry.appliedTags) {
        const stats = tagStats.get(tag) || {applied: 0, rejected: 0};
        stats.applied++;
        tagStats.set(tag, stats);
      }
      
      for (const tag of entry.rejectedTags) {
        const stats = tagStats.get(tag) || {applied: 0, rejected: 0};
        stats.rejected++;
        tagStats.set(tag, stats);
      }
    }

    return Array.from(tagStats.entries())
      .map(([tag, stats]) => ({
        tag,
        successRate: stats.applied / (stats.applied + stats.rejected)
      }))
      .filter(item => item.successRate > 0)
      .sort((a, b) => b.successRate - a.successRate);
  }

  exportHistory(): string {
    return JSON.stringify(this.history, null, 2);
  }

  importHistory(data: string): boolean {
    try {
      const imported = JSON.parse(data);
      if (Array.isArray(imported)) {
        this.history = imported;
        return true;
      }
    } catch (error) {
      console.error('Failed to import history:', error);
    }
    return false;
  }

  clearHistory() {
    this.history = [];
  }
}