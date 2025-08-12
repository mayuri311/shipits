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
  private embeddingClient: OpenAI | null;
  private embeddingDeploymentName: string | null;
  private apiVersion: string;

  constructor() {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o';
    const embeddingDeployment = process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT || process.env.EMBEDDING_MODEL || null;
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-10-21';

    if (!endpoint || !apiKey) {
      console.warn('Azure OpenAI credentials not configured. AI summary features will be disabled.');
      // Don't throw error to allow app to start without Azure OpenAI
      this.client = null;
      this.deploymentName = deployment;
      this.embeddingClient = null;
      this.embeddingDeploymentName = embeddingDeployment;
      this.apiVersion = apiVersion;
      return;
    }

    try {
      // Create OpenAI client configured for Azure (chat/completions)
      this.client = new OpenAI({
        apiKey: apiKey,
        baseURL: `${endpoint.replace(/\/$/, '')}/openai/deployments/${deployment}`,
        defaultQuery: { 'api-version': apiVersion },
        defaultHeaders: {
          'api-key': apiKey,
        },
        timeout: 30000, // 30 second timeout
        maxRetries: 2,  // Retry failed requests
      });
      this.deploymentName = deployment;
      // Create embeddings client if deployment provided
      if (embeddingDeployment) {
        this.embeddingClient = new OpenAI({
          apiKey: apiKey,
          baseURL: `${endpoint.replace(/\/$/, '')}/openai/deployments/${embeddingDeployment}`,
          defaultQuery: { 'api-version': apiVersion },
          defaultHeaders: {
            'api-key': apiKey,
          },
          timeout: 30000,
          maxRetries: 2,
        });
        this.embeddingDeploymentName = embeddingDeployment;
      } else {
        this.embeddingClient = null;
        this.embeddingDeploymentName = null;
      }
      this.apiVersion = apiVersion;
      console.log('✅ Azure OpenAI service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Azure OpenAI service:', error);
      this.client = null;
      this.deploymentName = deployment;
      this.embeddingClient = null;
      this.embeddingDeploymentName = embeddingDeployment;
      this.apiVersion = apiVersion;
    }
  }

  /**
   * Check if the service is properly configured
   */
  isConfigured(): boolean {
    return this.client !== null && !!this.deploymentName;
  }

  /**
   * Check if embedding service is configured
   */
  isEmbeddingConfigured(): boolean {
    return this.embeddingClient !== null && !!this.embeddingDeploymentName;
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
   * Generate embeddings for one or more texts. Returns an array of vectors.
   * Falls back to returning empty arrays if not configured.
   */
  async getEmbeddings(texts: string | string[]): Promise<number[][]> {
    const inputs = Array.isArray(texts) ? texts : [texts];
    try {
      if (!this.embeddingClient || !this.embeddingDeploymentName) {
        return inputs.map(() => []);
      }

      // Azure Embeddings endpoint; auto-truncate overly long inputs
      const safeInputs = inputs.map((t) => {
        if (!t) return '';
        const str = String(t);
        return str.length > 12000 ? str.slice(0, 12000) : str;
      });

      const resp = await this.embeddingClient.embeddings.create({
        input: safeInputs,
        model: this.embeddingDeploymentName,
      } as any);

      const vectors = (resp.data || []).map((d: any) => d.embedding as number[]);
      // Ensure 1:1 mapping, pad with [] if missing
      while (vectors.length < safeInputs.length) vectors.push([]);
      return vectors;
    } catch (error: any) {
      console.error('Error generating embeddings via Azure OpenAI:', {
        message: error.message,
        status: error.status,
        type: error.type,
      });
      return inputs.map(() => []);
    }
  }

  /**
   * Suggest query corrections and alternates (Did you mean?)
   */
  async suggestQueryCorrections(query: string): Promise<{ didYouMean?: string; alternates?: string[] }> {
    try {
      if (!this.client) return {};
      const system = `You are a search query assistant. Given a user query, return JSON with optional spelling correction and 1-3 alternate queries (synonyms/expanded terms). Schema: {"didYouMean":"string|optional","alternates":["string",...]}. No explanations, strictly JSON.`;
      const resp = await this.client.chat.completions.create({
        model: this.deploymentName,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: `QUERY: ${query}\nReturn JSON as specified.` },
        ],
        temperature: 0.1,
        max_tokens: 120,
      });
      const raw = resp.choices[0]?.message?.content?.trim() || '';
      const parsed = AzureOpenAIService.safeJsonParse(raw) || {};
      const out: { didYouMean?: string; alternates?: string[] } = {};
      if (typeof parsed.didYouMean === 'string' && parsed.didYouMean.trim()) out.didYouMean = parsed.didYouMean.trim();
      if (Array.isArray(parsed.alternates)) out.alternates = parsed.alternates.filter((s: any) => typeof s === 'string' && s.trim()).slice(0, 3);
      return out;
    } catch (error) {
      return {};
    }
  }

  /**
   * Translate text using Azure OpenAI chat model with system prompt.
   * Falls back to returning original text if service not configured.
   */
  async translateText(params: {
    text: string;
    sourceLanguage?: string;
    targetLanguage: string;
    preserveMarkdown?: boolean;
  }): Promise<string> {
    const { text, sourceLanguage, targetLanguage, preserveMarkdown = true } = params;
    try {
      if (!this.client) {
        // If not configured, return original text so UI can display something
        return text;
      }

      const system = `You are a professional translator. Translate the user's text${preserveMarkdown ? ' while preserving markdown formatting and code blocks' : ''}. Keep meaning, tone, and style. Return only the translated text with no explanations.
Source language: ${sourceLanguage || 'auto-detect'}
Target language: ${targetLanguage}`;

      const resp = await this.client.chat.completions.create({
        model: this.deploymentName,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: text },
        ],
        temperature: 0.2,
        max_tokens: Math.min(2000, Math.max(256, Math.ceil(text.length * 1.2 / 4))),
      });
      const translated = resp.choices[0]?.message?.content?.trim();
      return translated || text;
    } catch (error: any) {
      console.error('Error translating text via Azure OpenAI:', {
        message: error.message,
        status: error.status,
        type: error.type,
      });
      return text;
    }
  }

  /**
   * Get the required environment variables for this service
   */
  static getRequiredEnvVars(): string[] {
    return [
      'AZURE_OPENAI_ENDPOINT',
      'AZURE_OPENAI_API_KEY',
      'AZURE_OPENAI_DEPLOYMENT_NAME',
      // Optional but recommended for embeddings
      'AZURE_OPENAI_EMBEDDING_DEPLOYMENT',
      'AZURE_OPENAI_API_VERSION'
    ];
  }

  /**
   * Basic content moderation classifier using the chat model
   * Returns a risk score 0-1 and category scores
   */
  async classifyContentModeration(text: string): Promise<{ score: number; categories: Record<string, number> }> {
    try {
      if (!this.client) {
        // Fallback to heuristic if no client configured
        const lowered = text.toLowerCase();
        const spamSignals = ['buy now', 'free money', 'http://', 'https://', 'viagra', 'crypto'];
        const hits = spamSignals.filter(s => lowered.includes(s)).length;
        const score = Math.min(1, hits * 0.25 + (text.length < 5 ? 0.3 : 0));
        return { score, categories: { spam: score } };
      }

      const system = `You are a strict content moderation classifier. Given a user message, return a JSON object with overall risk score between 0 and 1 and category scores for: spam, sexual, hate, harassment, self-harm, violence. Be conservative about spam if the message is unsolicited ads, repetitive links, or irrelevant promotions.`;
      const user = `TEXT:\n${text}\n\nReturn ONLY JSON like {"score": number, "categories": {"spam": number, "sexual": number, "hate": number, "harassment": number, "self-harm": number, "violence": number}}`;

      const resp = await this.client.chat.completions.create({
        model: this.deploymentName,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0,
        max_tokens: 120,
      });

      const raw = resp.choices[0]?.message?.content?.trim() || '{}';
      let parsed: any = {};
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = {};
      }
      const score = typeof parsed.score === 'number' ? Math.max(0, Math.min(1, parsed.score)) : 0;
      const categories = typeof parsed.categories === 'object' && parsed.categories ? parsed.categories : {};
      return { score, categories };
    } catch (err) {
      console.error('Moderation classify error:', err);
      return { score: 0, categories: {} };
    }
  }

  /**
   * Suggest UI personalization: theme preset, accent color, mode, and layout
   */
  async suggestThemeAndLayout(input: {
    usageSignals: Array<{ name: string; value: number }>;
    preferences?: Partial<{ prefersDark: boolean; prefersReducedMotion: boolean; highContrast: boolean }>;
    current?: Partial<{ preset: string; accentColor: string; mode: string; layout: string }>;
  }): Promise<{ preset: string; accentColor: 'blue'|'purple'|'green'|'orange'|'red'|'pink'; mode: 'light'|'dark'|'system'; layout: 'standard'|'compact'|'cards'; reason?: string }>
  {
    try {
      if (!this.client) {
        return { preset: 'default', accentColor: 'blue', mode: 'system', layout: 'standard', reason: 'Fallback defaults' } as any;
      }

      const system = `You are a UI personalization assistant. Based on usage signals and accessibility prefs, pick a theme preset, accent color, mode, and layout. Reply ONLY JSON with keys preset, accentColor, mode, layout, reason. Allowed accentColor: blue,purple,green,orange,red,pink. Allowed mode: light,dark,system. Allowed layout: standard,compact,cards.`;

      const user = `USAGE_SIGNALS: ${JSON.stringify(input.usageSignals)}\nPREFERENCES: ${JSON.stringify(input.preferences || {})}\nCURRENT: ${JSON.stringify(input.current || {})}\nReturn strict JSON.`;

      const resp = await this.client.chat.completions.create({
        model: this.deploymentName,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.2,
        max_tokens: 160,
      });
      const raw = resp.choices[0]?.message?.content?.trim() || '';
      const parsed = AzureOpenAIService.safeJsonParse(raw) || {};
      const out = {
        preset: typeof parsed.preset === 'string' ? parsed.preset : 'default',
        accentColor: ['blue','purple','green','orange','red','pink'].includes(parsed.accentColor) ? parsed.accentColor : 'blue',
        mode: ['light','dark','system'].includes(parsed.mode) ? parsed.mode : 'system',
        layout: ['standard','compact','cards'].includes(parsed.layout) ? parsed.layout : 'standard',
        reason: typeof parsed.reason === 'string' ? parsed.reason : undefined,
      } as any;
      return out;
    } catch (error) {
      return { preset: 'default', accentColor: 'blue', mode: 'system', layout: 'standard', reason: 'Error, using defaults' } as any;
    }
  }

  /**
   * Suggest tags based on project content (title, description), updates, and comments
   */
  async suggestTags(input: {
    title: string;
    description: string;
    existingTags?: string[];
    updates?: Array<{ title: string; content: string; createdAt?: Date }>;
    comments?: Array<{ content: string; createdAt?: Date }>;
    maxTags?: number;
  }): Promise<Array<{ tag: string; confidence?: number; reason?: string }>> {
    try {
      if (!this.client) {
        throw new Error('Azure OpenAI service is not properly initialized. Please check your configuration.');
      }

      const maxTags = input.maxTags ?? 8;

      const systemPrompt = `You are an assistant that suggests concise, discovery-friendly tags for user projects.
Requirements:
- Output strictly valid minified JSON only, no commentary.
- JSON schema: {"tags":[{"tag":"string","confidence":0-1,"reason":"string"}]}.
- Tags must be lowercase, kebab-case, 1-3 words, no emojis, no duplicates.
- Prefer domain/topic/tech/tool tags over generic words.
- Avoid tags already present unless highly relevant.
- Return at most ${maxTags} tags.`;

      const updatesText = (input.updates || [])
        .map(u => `- [Update] ${u.title}: ${u.content}`)
        .join('\n');
      const commentsText = (input.comments || [])
        .map(c => `- [Comment] ${c.content}`)
        .join('\n');

      const userPrompt = `PROJECT TITLE: ${input.title}\nPROJECT DESCRIPTION:\n${input.description}\n\nEXISTING TAGS: ${(input.existingTags || []).join(', ') || 'none'}\n\nPROJECT UPDATES:\n${updatesText || 'none'}\n\nDISCUSSION HIGHLIGHTS:\n${commentsText || 'none'}\n\nReturn JSON as specified.`;

      const response = await this.client.chat.completions.create({
        model: this.deploymentName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 300,
        temperature: 0.2,
      });

      const raw = response.choices[0]?.message?.content?.trim() || '';
      const parsed = AzureOpenAIService.safeJsonParse(raw);
      if (!parsed || !Array.isArray(parsed.tags)) {
        throw new Error('Invalid AI response format for tag suggestions');
      }
      return parsed.tags
        .filter((t: any) => typeof t?.tag === 'string' && t.tag.trim().length > 0)
        .slice(0, maxTags);
    } catch (error: any) {
      console.error('Error suggesting tags:', {
        message: error.message,
        details: error.error?.message,
        stack: error.stack,
      });
      throw new Error(error.message || 'Failed to suggest tags');
    }
  }

  /**
   * Improve or shorten a project description
   */
  async improveDescription(input: {
    title?: string;
    description: string;
    intent: 'shorten' | 'clarify' | 'improve';
    maxWords?: number;
  }): Promise<{ improved: string; suggestions?: string[] }>
  {
    try {
      if (!this.client) {
        throw new Error('Azure OpenAI service is not properly initialized. Please check your configuration.');
      }

      const maxWords = input.maxWords ?? (input.intent === 'shorten' ? 120 : 200);
      const systemPrompt = `You edit project descriptions.
Output strictly valid JSON only, no commentary.
Schema: {"improved":"string","suggestions":["string",...]}.
Guidelines:
- Preserve meaning, remove fluff, avoid repetition.
- Use plain language and active voice.
- Keep markdown formatting when present.
- Max ${maxWords} words for the improved version.
- Be precise about technologies and outcomes.`;

      const userPrompt = `TITLE: ${input.title || ''}\nINTENT: ${input.intent}\nDESCRIPTION:\n${input.description}\n\nReturn JSON object strictly per schema.`;

      const response = await this.client.chat.completions.create({
        model: this.deploymentName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 400,
        temperature: 0.3,
      });

      const raw = response.choices[0]?.message?.content?.trim() || '';
      const parsed = AzureOpenAIService.safeJsonParse(raw);
      if (!parsed || typeof parsed.improved !== 'string') {
        throw new Error('Invalid AI response format for description improvement');
      }
      return {
        improved: parsed.improved,
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      };
    } catch (error: any) {
      console.error('Error improving description:', {
        message: error.message,
        details: error.error?.message,
        stack: error.stack,
      });
      throw new Error(error.message || 'Failed to improve description');
    }
  }

  // Helper to robustly parse JSON from model output
  private static safeJsonParse(text: string): any | null {
    try {
      // If already valid JSON
      return JSON.parse(text);
    } catch {}
    try {
      // Attempt to extract first {...} block
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start !== -1 && end !== -1 && end > start) {
        const slice = text.slice(start, end + 1);
        return JSON.parse(slice);
      }
    } catch {}
    return null;
  }
}

// Create and export a singleton instance
export const azureOpenAIService = new AzureOpenAIService();