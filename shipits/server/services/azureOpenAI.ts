/**
 * Azure OpenAI Service
 * Handles AI-powered summary generation for comment threads
 */

import OpenAI from 'openai';

export interface ThreadSummaryConfig {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  projectContext?: {
    title: string;
    description: string;
    tags: string[];
    status: string;
    ownerName: string;
    createdAt: Date;
  };
  commentCount?: number;
}

export class AzureOpenAIService {
  private client: OpenAI | null;
  private deploymentName: string;

  constructor() {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o';

    if (!endpoint || !apiKey) {
      console.warn('Azure OpenAI credentials not configured. AI summary features will be disabled.');
      // Don't throw error to allow app to start without Azure OpenAI
      this.client = null;
      this.deploymentName = deployment;
      return;
    }

    try {
      // Create OpenAI client configured for Azure
      this.client = new OpenAI({
        apiKey: apiKey,
        baseURL: `${endpoint.replace(/\/$/, '')}/openai/deployments/${deployment}`,
        defaultQuery: { 'api-version': '2024-02-01' },
        defaultHeaders: {
          'api-key': apiKey,
        },
      });
      this.deploymentName = deployment;
      console.log('✅ Azure OpenAI service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Azure OpenAI service:', error);
      this.client = null;
      this.deploymentName = deployment;
    }
  }

  /**
   * Generate a summary of a comment thread
   */
  async generateThreadSummary(
    comments: Array<{ 
      content: string; 
      authorName: string; 
      createdAt: Date;
      type?: string;
      depth?: number;
      isPinned?: boolean;
      isQuestion?: boolean;
      isAnswered?: boolean;
      reactionCount?: number;
      formattedText?: string;
    }>,
    config: ThreadSummaryConfig = {}
  ): Promise<string> {
    try {
      if (!this.client) {
        throw new Error('Azure OpenAI service is not properly initialized. Please check your configuration.');
      }
      
      if (comments.length === 0) {
        return 'No comments in this thread yet.';
      }

      // Prepare project context
      const projectInfo = config.projectContext ? `
PROJECT CONTEXT:
Title: ${config.projectContext.title}
Description: ${config.projectContext.description}
Tags: ${config.projectContext.tags.join(', ')}
Status: ${config.projectContext.status}
Owner: ${config.projectContext.ownerName}
Created: ${config.projectContext.createdAt.toLocaleDateString()}
` : '';

      // Prepare the conversation context with hierarchy and metadata
      const conversationText = comments
        .map(comment => comment.formattedText || `${comment.authorName}: ${comment.content}`)
        .join('\n');

      // Enhanced system prompt for better context understanding
      const systemPrompt = config.systemPrompt || `
You are an AI assistant that creates comprehensive, insightful summaries of technical project discussions. 
Your task is to analyze the project context and comment thread to provide a meaningful summary.

ANALYSIS GUIDELINES:
- Understand the project's purpose and current status
- Identify key discussion themes, technical issues, and solutions
- Note important questions and whether they were resolved
- Highlight community engagement (reactions, participation patterns)
- Recognize threaded conversations and their relationships
- Identify consensus, disagreements, or unresolved topics

SUMMARY STRUCTURE:
- Keep summaries 3-4 sentences (75-100 words)
- Start with project context if relevant
- Include main discussion points and outcomes
- Mention key technical insights or decisions
- Note community engagement level
- End with current status or next steps if apparent

FORMATTING:
- Use clear, professional language
- Focus on substance over individual names
- Highlight important technical details
- Note conversation patterns (Q&A, debates, collaborations)
`.trim();

      const userPrompt = `${projectInfo}
DISCUSSION THREAD (${config.commentCount || comments.length} comments):
${conversationText}

Please provide a comprehensive summary that captures the project context and key discussion points:`;

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
        max_tokens: config.maxTokens || 200,
        temperature: config.temperature || 0.3,
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
      process.env.AZURE_OPENAI_API_KEY &&
      this.deploymentName
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