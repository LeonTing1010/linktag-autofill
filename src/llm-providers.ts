import { TagSuggestion, LLMProvider, TagGenerationResult } from './types';
import { requestUrl } from 'obsidian';

export abstract class BaseLLMProvider {
  protected provider: LLMProvider;

  constructor(provider: LLMProvider) {
    this.provider = provider;
  }

  abstract generateTags(content: string, prompt: string, maxTags: number): Promise<TagGenerationResult>;

  protected parseTagResponse(response: string): TagSuggestion[] {
    try {
      // Try to parse as JSON first
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed)) {
          return parsed.map(item => ({
            tag: typeof item === 'string' ? item : item.tag || item.name,
            confidence: typeof item === 'object' ? (item.confidence || 0.8) : 0.8,
            category: typeof item === 'object' ? item.category : undefined,
            description: typeof item === 'object' ? item.description : undefined,
            source: 'llm' as const
          }));
        }
      }
    } catch (e) {
      // Fallback to text parsing
    }

    // Fallback: extract tags from text
    const lines = response.split('\n');
    const tags: TagSuggestion[] = [];
    
    for (const line of lines) {
      const tagMatch = line.match(/(?:^|\s)([a-zA-Z][\w\-\/]*)/);
      if (tagMatch && tagMatch[1].length > 1) {
        tags.push({
          tag: tagMatch[1],
          confidence: 0.7,
          source: 'llm'
        });
      }
    }
    
    return tags;
  }
}

export class OpenAIProvider extends BaseLLMProvider {
  async generateTags(content: string, prompt: string, maxTags: number): Promise<TagGenerationResult> {
    const startTime = Date.now();
    
    try {
      const response = await requestUrl({
        url: `${this.provider.baseUrl}/chat/completions`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.provider.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.provider.model,
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that generates relevant tags for text content. Return tags as a JSON array of objects with "tag" and "confidence" fields.'
            },
            {
              role: 'user',
              content: prompt.replace('{content}', content)
            }
          ],
          max_tokens: 500,
          temperature: 0.3
        })
      });

      const data = response.json;
      const suggestions = this.parseTagResponse(data.choices[0].message.content);
      
      return {
        suggestions: suggestions.slice(0, maxTags),
        processingTime: Date.now() - startTime,
        provider: 'openai'
      };
    } catch (error) {
      return {
        suggestions: [],
        processingTime: Date.now() - startTime,
        provider: 'openai',
        error: error.message
      };
    }
  }
}

export class ClaudeProvider extends BaseLLMProvider {
  async generateTags(content: string, prompt: string, maxTags: number): Promise<TagGenerationResult> {
    const startTime = Date.now();
    
    try {
      const response = await requestUrl({
        url: `${this.provider.baseUrl}/v1/messages`,
        method: 'POST',
        headers: {
          'x-api-key': this.provider.apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: this.provider.model,
          max_tokens: 500,
          messages: [
            {
              role: 'user',
              content: prompt.replace('{content}', content)
            }
          ]
        })
      });

      const data = response.json;
      const suggestions = this.parseTagResponse(data.content[0].text);
      
      return {
        suggestions: suggestions.slice(0, maxTags),
        processingTime: Date.now() - startTime,
        provider: 'claude'
      };
    } catch (error) {
      return {
        suggestions: [],
        processingTime: Date.now() - startTime,
        provider: 'claude',
        error: error.message
      };
    }
  }
}

export class OllamaProvider extends BaseLLMProvider {
  async generateTags(content: string, prompt: string, maxTags: number): Promise<TagGenerationResult> {
    const startTime = Date.now();
    
    try {
      const response = await requestUrl({
        url: `${this.provider.baseUrl}/api/generate`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.provider.model,
          prompt: prompt.replace('{content}', content),
          stream: false,
          options: {
            temperature: 0.3,
            num_predict: 200
          }
        })
      });

      const data = response.json;
      const suggestions = this.parseTagResponse(data.response);
      
      return {
        suggestions: suggestions.slice(0, maxTags),
        processingTime: Date.now() - startTime,
        provider: 'ollama'
      };
    } catch (error) {
      return {
        suggestions: [],
        processingTime: Date.now() - startTime,
        provider: 'ollama',
        error: error.message
      };
    }
  }
}