/**
 * Azure OpenAI Service
 * Handles AI-powered summary generation for comment threads
 */

import OpenAI from 'openai';
import { config } from 'dotenv';

// Ensure environment variables are loaded
config();

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
    updateCount?: number;
    commentCount?: number;
  };
  commentCount?: number;
  updateCount?: number;
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
        defaultQuery: { 'api-version': '2024-10-21' }, // Use stable GA API version
        defaultHeaders: {
          'api-key': apiKey,
        },
        timeout: 30000, // 30 second timeout
        maxRetries: 2,  // Retry failed requests
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
   * Check if the service is properly configured
   */
  isConfigured(): boolean {
    return this.client !== null && !!this.deploymentName;
  }

  /**
   * Generate a summary of a comment thread
   */
  async generateThreadSummary(
    content: Array<{ 
      content?: string;
      title?: string;
      authorName?: string; 
      createdAt: Date;
      type: 'comment' | 'update';
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
      
      if (content.length === 0) {
        return 'No activity in this project yet.';
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
Updates: ${config.updateCount || 0} project updates
Comments: ${config.commentCount || 0} discussion comments
` : '';

      // Prepare the conversation context with hierarchy and metadata
      const conversationText = content
        .map(item => {
          if (item.type === 'update') {
            return `[PROJECT UPDATE] ${item.title}: ${item.content}`;
          } else {
            return item.formattedText || `${item.authorName}: ${item.content}`;
          }
        })
        .join('\n');

      // Enhanced system prompt for better context understanding
      const systemPrompt = config.systemPrompt || `
You are an AI assistant that creates comprehensive, insightful summaries of technical project discussions. 
Your task is to analyze the project context and comment thread to provide a meaningful summary.

ANALYSIS GUIDELINES:
- Understand the project's purpose and current status
- Analyze project updates for progress, milestones, and announcements
- Identify key discussion themes, technical issues, and solutions
- Note important questions and whether they were resolved
- Highlight community engagement (reactions, participation patterns)
- Recognize threaded conversations and their relationships
- Track project evolution through updates and user feedback
- Identify consensus, disagreements, or unresolved topics

SUMMARY STRUCTURE:
- Keep summaries 3-4 sentences (75-100 words)
- Start with project context if relevant
- Highlight significant project updates and progress
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
PROJECT ACTIVITY (${config.updateCount || 0} updates, ${config.commentCount || 0} comments):
${conversationText}

Please provide a comprehensive summary that captures the project context, key updates, and discussion highlights:`;

      console.log('Azure OpenAI Request:', {
        endpoint: process.env.AZURE_OPENAI_ENDPOINT,
        deployment: this.deploymentName,
        hasApiKey: !!process.env.AZURE_OPENAI_API_KEY,
        apiKeyLength: process.env.AZURE_OPENAI_API_KEY?.length,
        messagesCount: 2,
        maxTokens: config.maxTokens || 200
      });

      const response = await this.client.chat.completions.create({
        model: this.deploymentName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: config.maxTokens || 200,
        temperature: config.temperature || 0.3,
      });

      const summary = response.choices[0]?.message?.content?.trim();
      
      if (!summary) {
        throw new Error('No summary generated from Azure OpenAI');
      }

      console.log('Azure OpenAI Response:', {
        id: response.id,
        model: response.model,
        hasChoices: response.choices.length > 0,
        finishReason: response.choices[0]?.finish_reason
      });

      return summary;

    } catch (error: any) {
      console.error('Error generating thread summary:', {
        message: error.message,
        status: error.status,
        type: error.type,
        details: error.error?.message,
        endpoint: process.env.AZURE_OPENAI_ENDPOINT,
        deployment: this.deploymentName,
        stack: error.stack
      });

      // Provide more specific error messages based on the error type
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new Error('Cannot reach Azure OpenAI endpoint. Please check your endpoint URL and internet connection.');
      } else if (error.status === 401) {
        throw new Error('Azure OpenAI authentication failed. Please check your API key.');
      } else if (error.status === 429) {
        throw new Error('Azure OpenAI rate limit exceeded. Please try again later.');
      } else if (error.status === 404) {
        throw new Error('Azure OpenAI deployment not found. Please check your deployment name.');
      } else if (error.message?.includes('timeout')) {
        throw new Error('Azure OpenAI request timed out. Please try again.');
      } else if (error.type === 'invalid_request_error') {
        throw new Error(`Azure OpenAI request error: ${error.message}`);
      } else {
        throw new Error(`Failed to generate summary: ${error.message || 'Unknown error'}`);
      }
    }
  }

  /**
   * Get the required environment variables for this service
   */
  static getRequiredEnvVars(): string[] {
    return [
      'AZURE_OPENAI_ENDPOINT',
      'AZURE_OPENAI_API_KEY',
      'AZURE_OPENAI_DEPLOYMENT_NAME'
    ];
  }
}

// Create and export a singleton instance
export const azureOpenAIService = new AzureOpenAIService();