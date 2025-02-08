export class AIAssistant {
  constructor() {
    this.initialized = false;
    this.API_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
  }

  async initialize() {
    try {
      // Get API key from secure storage
      const result = await chrome.storage.local.get(['openai_api_key']);
      if (!result.openai_api_key) {
        throw new Error('API key not found');
      }
      this.apiKey = result.openai_api_key;
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Initialization failed:', error);
      throw new Error('Failed to initialize AI Assistant');
    }
  }

  async simplifyText(text) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const response = await fetch(this.API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that simplifies complex text while maintaining its core meaning. Make the text more concise and easier to understand.'
            },
            {
              role: 'user',
              content: `Please simplify this text: ${text}`
            }
          ],
          temperature: 0.7,
          max_tokens: 150
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'API request failed');
      }

      const data = await response.json();
      const simplifiedText = data.choices[0].message.content.trim();

      // Cache the result
      await chrome.storage.local.set({
        currentSimplification: simplifiedText,
        originalText: text
      });

      return {
        success: true,
        simplified: simplifiedText,
        original: text
      };

    } catch (error) {
      console.error('Text simplification failed:', error);
      return {
        success: false,
        error: error.message,
        original: text
      };
    }
  }

  async processQuery(query) {
    if (!this.initialized) {
      throw new Error('AI Assistant not initialized');
    }
    return this.simplifyText(query);
  }
}

// Create and export a default instance
export const aiAssistant = new AIAssistant();

// For non-module contexts (content scripts)
if (typeof window !== 'undefined') {
  window.aiAssistant = aiAssistant;
} 