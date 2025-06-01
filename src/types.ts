export interface ContentAnalysis {
  keywords: string[];
  topics: string[];
  wordCount: number;
  complexity: number;
}

export interface TagSuggestion {
  tag: string;
  confidence: number;
  source?: 'keyword' | 'topic' | 'existing' | 'llm';
  category?: string;
  description?: string;
}

export interface TagGenerationResult {
  suggestions: TagSuggestion[];
  processingTime: number;
  provider: string;
  error?: string;
}

export interface LLMProvider {
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  enabled: boolean;
}

export type ProviderType = 'openai' | 'claude' | 'ollama';

export interface PluginSettings {
  activeProvider: 'openai' | 'claude' | 'ollama';
  providers: {
    openai: ProviderConfig;
    claude: ProviderConfig;
    ollama: ProviderConfig;
  };
  customPrompt: string;
  maxTags: number;
  minConfidence: number;
  enableHierarchy: boolean;
  tagFormat: 'hashtag' | 'yaml' | 'inline' | 'both';
  autoTrigger: boolean;
  tagMergeMode?: 'append' | 'replace' | 'smart';
}

export interface ProviderConfig {
  name: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  enabled: boolean;
}

export type TagFormat = "hashtag" | "yaml" | "inline" | "both";

export interface ProcessingOptions {
  maxTags?: number;
  minConfidence?: number;
  format?: TagFormat;
}