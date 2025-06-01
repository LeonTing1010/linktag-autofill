import { PluginSettings, TagGenerationResult, TagSuggestion, ProviderType } from './types';
import { OpenAIProvider, ClaudeProvider, OllamaProvider, BaseLLMProvider } from './llm-providers';
import { ContentProcessor } from './content-processor';

export class TagGenerator {
  private settings: PluginSettings;
  private providers: Map<string, BaseLLMProvider>;

  constructor(settings: PluginSettings) {
    this.settings = settings;
    this.providers = new Map();
    this.initializeProviders();
  }

  private initializeProviders() {
    this.providers.set('openai', new OpenAIProvider(this.settings.providers.openai));
    this.providers.set('claude', new ClaudeProvider(this.settings.providers.claude));
    this.providers.set('ollama', new OllamaProvider(this.settings.providers.ollama));
  }

  async generateTagsForContent(content: string): Promise<TagGenerationResult> {
    const provider = this.providers.get(this.settings.activeProvider);
    if (!provider) {
      return {
        suggestions: [],
        processingTime: 0,
        provider: this.settings.activeProvider,
        error: 'Provider not found'
      };
    }

    // Check if API key is provided (except for Ollama)
    const activeProvider = this.settings.activeProvider;
    const providerConfig = this.settings.providers[activeProvider];
    
    if (activeProvider !== 'ollama' && !providerConfig.apiKey) {
      return {
        suggestions: [],
        processingTime: 0,
        provider: activeProvider,
        error: 'API key not configured'
      };
    }

    const result = await provider.generateTags(
      content,
      this.settings.customPrompt,
      this.settings.maxTags
    );

    // Filter by confidence
    result.suggestions = result.suggestions.filter(
      tag => tag.confidence >= this.settings.minConfidence
    );

    // Generate hierarchical tags if enabled
    if (this.settings.enableHierarchy) {
      result.suggestions = this.generateHierarchicalTags(result.suggestions);
    }

    return result;
  }

  private generateHierarchicalTags(suggestions: TagSuggestion[]): TagSuggestion[] {
    const hierarchicalTags: TagSuggestion[] = [];
    const categories = new Map<string, TagSuggestion[]>();

    // Group tags by potential categories
    for (const suggestion of suggestions) {
      const category = this.inferCategory(suggestion.tag);
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category)!.push(suggestion);
    }

    // Create hierarchical structure
    for (const [category, tags] of categories) {
      if (tags.length > 1) {
        // Add parent category
        hierarchicalTags.push({
          tag: category,
          confidence: Math.max(...tags.map(t => t.confidence)) * 0.9,
          category: 'parent',
          source: 'keyword'
        });

        // Add child tags
        for (const tag of tags) {
          hierarchicalTags.push({
            ...tag,
            tag: `${category}/${tag.tag}`,
            category: 'child'
          });
        }
      } else {
        hierarchicalTags.push(...tags);
      }
    }

    return hierarchicalTags;
  }

  private inferCategory(tag: string): string {
    const categoryMap: { [key: string]: string[] } = {
      'technology': ['programming', 'software', 'computer', 'tech', 'digital', 'ai', 'ml', 'data'],
      'science': ['research', 'study', 'analysis', 'experiment', 'theory', 'hypothesis'],
      'business': ['management', 'strategy', 'marketing', 'finance', 'economics', 'startup'],
      'personal': ['life', 'health', 'fitness', 'hobby', 'travel', 'family', 'relationship'],
      'education': ['learning', 'course', 'tutorial', 'knowledge', 'skill', 'training'],
      'creative': ['art', 'design', 'music', 'writing', 'photography', 'creative']
    };

    const lowerTag = tag.toLowerCase();
    for (const [category, keywords] of Object.entries(categoryMap)) {
      if (keywords.some(keyword => lowerTag.includes(keyword))) {
        return category;
      }
    }

    return 'general';
  }

  updateSettings(settings: PluginSettings) {
    this.settings = settings;
    this.initializeProviders();
  }
}