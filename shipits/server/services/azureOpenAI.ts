/**
 * Azure OpenAI Service
 * Handles AI-powered summary generation for comment threads
 */

import { OpenAIApi } from '@azure/openai';
import { AzureKeyCredential } from '@azure/core-auth';

export interface ThreadSummaryConfig {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export class AzureOpenAIService {
  private client: OpenAIApi;
  private deploymentName: string;

  constructor() {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o';

    if (!endpoint || !apiKey) {
      throw new Error('Azure OpenAI credentials not configured. Please check your .env file.');
    }

    this.client = new OpenAIApi(endpoint, new AzureKeyCredential(apiKey));
    this.deploymentName = deployment;
  }

  /**
   * Generate a summary of a comment thread
   */
  async generateThreadSummary(
    comments: Array<{ content: string; authorName: string; createdAt: Date }>,
    config: ThreadSummaryConfig = {}
  ): Promise<string> {
    try {
      if (comments.length === 0) {
        return 'No comments in this thread yet.';
      }

      // Prepare the conversation context
      const conversationText = comments
        .map(comment => `${comment.authorName}: ${comment.content}`)
        .join('\n\n');

      const systemPrompt = config.systemPrompt || `
You are an AI assistant that creates concise, helpful summaries of forum discussions. 
Your task is to summarize the key points, main topics, and any conclusions or decisions made in comment threads.

Guidelines:
- Keep summaries under 2-3 sentences
- Focus on the main topics and key insights
- Include any actionable items or decisions if present
- Use a professional, neutral tone
- Don't include specific usernames unless crucial to understanding
`.trim();

      const userPrompt = `
Please provide a concise summary of this discussion thread:

${conversationText}

Summary:`;

      const response = await this.client.getChatCompletions(
        this.deploymentName,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        {
          maxTokens: config.maxTokens || 150,
          temperature: config.temperature || 0.3,
        }
      );

      const summary = response.choices[0]?.message?.content?.trim();
      
      if (!summary) {
        throw new Error('No summary generated');
      }

      return summary;
    } catch (error) {
      console.error('Error generating thread summary:', error);
      throw new Error('Failed to generate summary. Please try again later.');
    }
  }

  /**
   * Check if the service is properly configured
   */
  isConfigured(): boolean {
    return !!(
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