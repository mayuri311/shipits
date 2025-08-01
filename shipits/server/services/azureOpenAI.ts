/**
 * Azure OpenAI Service
 * Handles AI-powered summary generation for comment threads
 */

import { AzureOpenAI } from '@azure/openai';

export interface ThreadSummaryConfig {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export class AzureOpenAIService {
  private client: AzureOpenAI;
  private deploymentName: string;

  constructor() {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o';

    if (!endpoint || !apiKey) {
      console.warn('Azure OpenAI credentials not configured. AI summary features will be disabled.');
      // Don't throw error to allow app to start without Azure OpenAI
      this.client = null as any;
      this.deploymentName = deployment;
      return;
    }

    try {
      // Create Azure OpenAI client - matching the exact pattern from your docs
      this.client = new AzureOpenAI({
        azure_endpoint: endpoint,
        api_key: apiKey,
        api_version: "2024-12-01-preview", // Updated to match your sample
      });
      this.deploymentName = deployment;
      console.log('✅ Azure OpenAI service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Azure OpenAI service:', error);
      this.client = null as any;
      this.deploymentName = deployment;
    }
  }

  /**
   * Generate a summary of a comment thread
   */
  async generateThreadSummary(
    comments: Array<{ content: string; authorName: string; createdAt: Date }>,
    config: ThreadSummaryConfig = {}
  ): Promise<string> {
    try {
      if (!this.client) {
        throw new Error('Azure OpenAI service is not properly initialized. Please check your configuration.');
      }
      
      if (comments.length === 0) {
        return 'No comments in this thread yet.';
      }

      // Prepare the conversation context
      const conversationText = comments
        .map(comment => `${comment.authorName}: ${comment.content}`)
        .join('\n\n');

      const systemPrompt = config.systemPrompt || `
You are an AI assistant that creates concise, helpful summaries of technical forum discussions. 
Your task is to summarize the key points, main topics, solutions, and any conclusions in comment threads.

Guidelines:
- Keep summaries under 2-3 sentences (max 50 words)
- Focus on technical insights, solutions, and key decisions
- Highlight any resolved issues or actionable outcomes
- Include consensus or disagreements if significant
- Use clear, professional language
- Avoid mentioning specific usernames unless crucial
- Prioritize substance over politeness markers
`.trim();

      const userPrompt = `
Please provide a concise summary of this discussion thread:

${conversationText}

Summary:`;

      console.log('Azure OpenAI Request:', {
        endpoint: process.env.AZURE_OPENAI_ENDPOINT,
        deployment: this.deploymentName,
        hasApiKey: !!process.env.AZURE_OPENAI_API_KEY,
        apiKeyLength: process.env.AZURE_OPENAI_API_KEY?.length,
        messagesCount: 2,
        maxTokens: config.maxTokens || 150
      });

      const response = await this.client.chat.completions.create({
        model: this.deploymentName, // This should match your deployment name exactly
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: config.maxTokens || 150,
        temperature: config.temperature || 0.3,
        top_p: 1.0, // Added to match your sample
      });

      console.log('Azure OpenAI Response:', {
        id: response.id,
        model: response.model,
        hasChoices: response.choices?.length > 0,
        finishReason: response.choices[0]?.finish_reason
      });

      const summary = response.choices[0]?.message?.content?.trim();
      
      if (!summary) {
        throw new Error('No summary generated');
      }

      return summary;
    } catch (error: any) {
      console.error('Error generating thread summary:', {
        message: error.message,
        status: error.status || error.code,
        type: error.type,
        details: error.error || error.response?.data || error.body,
        endpoint: process.env.AZURE_OPENAI_ENDPOINT,
        deployment: this.deploymentName,
        stack: error.stack
      });
      
      // Provide more specific error messages based on error type
      if (error.status === 404 || error.code === 'DeploymentNotFound') {
        throw new Error(`Azure OpenAI deployment '${this.deploymentName}' not found. Please check your deployment name.`);
      } else if (error.status === 401 || error.status === 403 || error.code === 'Unauthorized') {
        throw new Error('Azure OpenAI authentication failed. Please check your API key and endpoint.');
      } else if (error.message?.includes('<!DOCTYPE') || error.message?.includes('HTML')) {
        throw new Error('Azure OpenAI endpoint returned HTML instead of JSON. Please verify your endpoint URL format (should end with .openai.azure.com/).');
      } else if (error.code === 'ENOTFOUND' || error.message?.includes('getaddrinfo')) {
        throw new Error('Cannot reach Azure OpenAI endpoint. Please check your endpoint URL and internet connection.');
      } else if (error.type === 'invalid_request_error') {
        throw new Error(`Azure OpenAI request error: ${error.message}`);
      } else {
        throw new Error(`Failed to generate summary: ${error.message || 'Unknown error'}`);
      }
    }
  }

  /**
   * Check if the service is properly configured
   */
  isConfigured(): boolean {
    return !!(
      this.client &&
      process.env.AZURE_OPENAI_ENDPOINT && 
      process.env.AZURE_OPENAI_API_KEY
    );
  }

  /**
   * Get the required environment variables for setup
   */
  static getRequiredEnvVars(): string[] {
    return [
      'AZURE_OPENAI_ENDPOINT',
      'AZURE_OPENAI_API_KEY',
      'AZURE_OPENAI_DEPLOYMENT_NAME'
    ];
  }
}

// Export a singleton instance
export const azureOpenAIService = new AzureOpenAIService();