import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { mongoStorage } from "./services/mongoStorage";
import { upload, getFileUrl } from "./services/fileUpload";
import { azureOpenAIService } from "./services/azureOpenAI";
import { z } from "zod";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";
import { Types } from "mongoose";
import mongoose from "mongoose";
import { 
  loginSchema, registerSchema, createProjectSchema, createCommentSchema, 
  createEventSchema, updateUserSchema, updateProjectSchema, contactSchema,
  type ApiResponse, type PaginatedResponse 
} from "@shared/schema";
import { 
  User, Project, Comment, Event, UserActivity, Contact, getDatabaseStats
} from "./models/index";

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Session configuration
declare module 'express-session' {
  interface SessionData {
    userId?: string;
    user?: any;
  }
}

// Middleware for authentication
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session.userId) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  next();
};

// Helper functions for AI summary context building
function buildCommentHierarchy(comments: any[]) {
  const commentMap = new Map();
  const rootComments: any[] = [];

  // First pass: create map of all comments
  comments.forEach(comment => {
    commentMap.set(comment._id.toString(), {
      ...comment,
      replies: []
    });
  });

  // Second pass: build hierarchy
  comments.forEach(comment => {
    const commentWithReplies = commentMap.get(comment._id.toString());
    
    if (comment.parentCommentId) {
      const parent = commentMap.get(comment.parentCommentId.toString());
      if (parent) {
        parent.replies.push(commentWithReplies);
      }
    } else {
      rootComments.push(commentWithReplies);
    }
  });

  return rootComments;
}

function formatCommentsForAI(commentHierarchy: any[]): any[] {
  const formattedComments: any[] = [];

  function processComment(comment: any, depth = 0) {
    const indent = '  '.repeat(depth);
    const authorName = comment.authorId?.fullName || comment.authorId?.username || 'Anonymous';
    const commentType = comment.type !== 'general' ? ` [${comment.type.toUpperCase()}]` : '';
    const isPinned = comment.tags?.isPinned ? ' [PINNED]' : '';
    const isQuestion = comment.tags?.isQuestion ? ' [QUESTION]' : '';
    const isAnswered = comment.tags?.isAnswered ? ' [ANSWERED]' : '';
    const reactionCount = comment.reactions?.length || 0;
    const reactionInfo = reactionCount > 0 ? ` (${reactionCount} reactions)` : '';
    
    formattedComments.push({
      content: comment.content,
      authorName,
      createdAt: new Date(comment.createdAt),
      type: comment.type,
      depth,
      isPinned: comment.tags?.isPinned || false,
      isQuestion: comment.tags?.isQuestion || false,
      isAnswered: comment.tags?.isAnswered || false,
      reactionCount,
      formattedText: `${indent}${authorName}${commentType}${isPinned}${isQuestion}${isAnswered}${reactionInfo}: ${comment.content}`,
      hasReplies: comment.replies && comment.replies.length > 0
    });

    // Process replies
    if (comment.replies && comment.replies.length > 0) {
      comment.replies
        .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .forEach((reply: any) => processComment(reply, depth + 1));
    }
  }

  commentHierarchy
    .sort((a, b) => {
      // Sort by pinned first, then by creation date
      if (a.tags?.isPinned && !b.tags?.isPinned) return -1;
      if (!a.tags?.isPinned && b.tags?.isPinned) return 1;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    })
    .forEach(comment => processComment(comment));

  return formattedComments;
}

// Middleware for admin authentication
const requireAdmin = async (req: any, res: any, next: any) => {
  console.log('🔐 Admin auth check - Session userId:', req.session.userId);
  
  if (!req.session.userId) {
    console.log('❌ No session userId found');
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  
  try {
    const user = await mongoStorage.getUser(req.session.userId);
    console.log('👤 Found user:', user ? { id: user._id, username: user.username, role: user.role } : 'null');
    
    if (!user || user.role !== 'admin') {
      console.log('❌ Admin access denied - User role:', user?.role);
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }
    
    console.log('✅ Admin access granted for:', user.username);
    req.currentUser = user;
    next();
  } catch (error) {
    console.error('❌ Admin auth error:', error);
    res.status(500).json({ success: false, error: 'Authentication failed' });
  }
};

// Validation middleware
const validateBody = (schema: z.ZodSchema) => (req: any, res: any, next: any) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        error: 'Validation error', 
        details: error.errors 
      });
    }
    next(error);
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Session middleware
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Authentication Routes
  app.post('/api/auth/register', validateBody(registerSchema), async (req, res) => {
    try {
      const { email, username, password, fullName } = req.body;
      
      // Validate required fields
      if (!email || !username || !password || !fullName) {
        return res.status(400).json({ 
          success: false, 
          error: 'All required fields must be provided' 
        });
      }
      
      // Check if user already exists
      const existingUser = await mongoStorage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ 
          success: false, 
          error: 'User with this email already exists' 
        });
      }

      const existingUsername = await mongoStorage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ 
          success: false, 
          error: 'Username already taken' 
        });
      }

      // Create user
      const user = await mongoStorage.createUser(req.body);
      
      // Set up session
      req.session.userId = user._id.toString();
      req.session.user = user;

      // Return success response without password
      const userResponse = { ...user };
      delete userResponse.password;

      res.status(201).json({ 
        success: true, 
        data: { user: userResponse },
        message: 'User registered successfully' 
      });
    } catch (error) {
      console.error('Registration error:', error);
      
      // Handle MongoDB validation errors
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map((err: any) => err.message);
        return res.status(400).json({ 
          success: false, 
          error: `Validation failed: ${validationErrors.join(', ')}` 
        });
      }
      
      // Handle duplicate key errors
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        return res.status(400).json({ 
          success: false, 
          error: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists` 
        });
      }
      
      res.status(500).json({ 
        success: false, 
        error: 'Registration failed. Please try again.' 
      });
    }
  });

  app.post('/api/auth/login', validateBody(loginSchema), async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await mongoStorage.authenticateUser(email, password);
      
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid email or password' 
        });
      }

      req.session.userId = user._id.toString();
      req.session.user = user;

      res.json({ 
        success: true, 
        data: { user: { ...user, password: undefined } },
        message: 'Login successful' 
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ success: false, error: 'Login failed' });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ success: false, error: 'Logout failed' });
      }
      res.json({ success: true, message: 'Logged out successfully' });
    });
  });

  app.get('/api/auth/me', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    try {
      const user = await mongoStorage.getUser(req.session.userId);
      if (!user) {
        req.session.destroy(() => {});
        return res.status(401).json({ success: false, error: 'User not found' });
      }

      res.json({ 
        success: true, 
        data: { user: { ...user, password: undefined } } 
      });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({ success: false, error: 'Failed to get user info' });
    }
  });

  // Project Routes
  app.get('/api/projects', async (req, res) => {
    try {
      const filters = {
        status: req.query.status as string,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        featured: req.query.featured === 'true' ? true : undefined,
        ownerId: req.query.ownerId as string,
        search: req.query.search as string
      };

      const pagination = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        sortBy: req.query.sortBy as string || 'createdAt',
        sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc'
      };

      const result = await mongoStorage.getProjects(filters, pagination);
      const totalPages = Math.ceil(result.total / pagination.limit);

      const response: PaginatedResponse = {
        success: true,
        data: {
          items: result.projects,
          total: result.total,
          page: pagination.page,
          limit: pagination.limit,
          totalPages
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Get projects error:', error);
      res.status(500).json({ success: false, error: 'Failed to get projects' });
    }
  });

  app.get('/api/projects/featured', async (req, res) => {
    try {
      const projects = await mongoStorage.getFeaturedProjects();
      res.json({ success: true, data: { projects } });
    } catch (error) {
      console.error('Get featured projects error:', error);
      res.status(500).json({ success: false, error: 'Failed to get featured projects' });
    }
  });

  app.get('/api/projects/:id', async (req, res) => {
    try {
      // Pass the authenticated user ID for view tracking if available
      const userId = req.session.userId;
      const project = await mongoStorage.getProject(req.params.id, userId);
      if (!project) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }

      res.json({ success: true, data: { project } });
    } catch (error) {
      console.error('Get project error:', error);
      res.status(500).json({ success: false, error: 'Failed to get project' });
    }
  });

  app.post('/api/projects', requireAuth, validateBody(createProjectSchema), async (req, res) => {
    try {
      const projectData = {
        ...req.body,
        ownerId: req.session.userId
      };

      const project = await mongoStorage.createProject(projectData);
      res.status(201).json({ 
        success: true, 
        data: { project },
        message: 'Project created successfully' 
      });
    } catch (error) {
      console.error('Create project error:', error);
      res.status(500).json({ success: false, error: 'Failed to create project' });
    }
  });

  app.delete('/api/projects/:id', requireAuth, async (req, res) => {
    try {
      const currentUser = await mongoStorage.getUser(req.session.userId);
      if (!currentUser) {
        return res.status(401).json({ success: false, error: 'User not found' });
      }

      const project = await mongoStorage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }

      // Check if user owns the project or is admin
      if (project.ownerId._id.toString() !== req.session.userId && currentUser.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Permission denied' });
      }

      const deleted = await mongoStorage.deleteProject(req.params.id, req.session.userId);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Project not found or already deleted' });
      }

      res.json({ 
        success: true, 
        message: 'Project deleted successfully' 
      });
    } catch (error) {
      console.error('Delete project error:', error);
      res.status(500).json({ success: false, error: 'Failed to delete project' });
    }
  });

  app.delete('/api/admin/projects/:id', requireAdmin, async (req, res) => {
    try {
      const project = await mongoStorage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }

      const deleted = await mongoStorage.deleteProject(req.params.id, req.currentUser._id.toString());
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Project not found or already deleted' });
      }

      res.json({ 
        success: true, 
        message: 'Project deleted by admin successfully' 
      });
    } catch (error) {
      console.error('Admin delete project error:', error);
      res.status(500).json({ success: false, error: 'Failed to delete project' });
    }
  });

  // Project Like Routes - Toggle like status
  app.post('/api/projects/:id/like', requireAuth, async (req, res) => {
    try {
      console.log('Toggling project like:', { projectId: req.params.id, userId: req.session.userId });
      
      const project = await mongoStorage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }

      const userId = new Types.ObjectId(req.session.userId);
      const isCurrentlyLiked = project.likes.some(id => id.equals(userId));
      
      if (isCurrentlyLiked) {
        await project.removeLike(userId);
        console.log('Project unliked:', { projectId: req.params.id, totalLikes: project.analytics.totalLikes });
        
        res.json({ 
          success: true, 
          data: { 
            totalLikes: project.analytics.totalLikes,
            isLiked: false 
          },
          message: 'Project unliked successfully' 
        });
      } else {
        await project.addLike(userId);
        console.log('Project liked:', { projectId: req.params.id, totalLikes: project.analytics.totalLikes });
        
        res.json({ 
          success: true, 
          data: { 
            totalLikes: project.analytics.totalLikes,
            isLiked: true 
          },
          message: 'Project liked successfully' 
        });
      }
    } catch (error) {
      console.error('Toggle project like error:', error);
      res.status(500).json({ success: false, error: 'Failed to toggle project like' });
    }
  });

  app.delete('/api/projects/:id/like', requireAuth, async (req, res) => {
    try {
      console.log('Unliking project:', { projectId: req.params.id, userId: req.session.userId });
      
      const project = await mongoStorage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }

      await project.removeLike(new Types.ObjectId(req.session.userId));
      
      console.log('Project unliked successfully:', { 
        projectId: req.params.id, 
        totalLikes: project.analytics.totalLikes 
      });
      
      res.json({ 
        success: true, 
        data: { 
          totalLikes: project.analytics.totalLikes,
          isLiked: false 
        },
        message: 'Project unliked successfully' 
      });
    } catch (error) {
      console.error('Unlike project error:', error);
      res.status(500).json({ success: false, error: 'Failed to unlike project' });
    }
  });

  // Debug endpoint for Azure OpenAI testing
  app.get('/api/debug/azure-openai', requireAuth, async (req, res) => {
    try {
      const { azureOpenAIService } = await import('./services/azureOpenAI');
      
      console.log('Debug: Testing Azure OpenAI connection');
      console.log('Environment variables check:', {
        hasEndpoint: !!process.env.AZURE_OPENAI_ENDPOINT,
        endpoint: process.env.AZURE_OPENAI_ENDPOINT,
        hasApiKey: !!process.env.AZURE_OPENAI_API_KEY,
        apiKeyLength: process.env.AZURE_OPENAI_API_KEY?.length,
        deployment: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
        isConfigured: azureOpenAIService.isConfigured()
      });

      // Test with a simple conversation
      const testComments = [
        { content: 'This project looks interesting!', authorName: 'TestUser1', createdAt: new Date() },
        { content: 'I agree, the UI design is really clean.', authorName: 'TestUser2', createdAt: new Date() }
      ];
      
      const summary = await azureOpenAIService.generateThreadSummary(testComments);
      
      res.json({ 
        success: true, 
        data: { 
          summary,
          connectionTest: 'passed',
          endpoint: process.env.AZURE_OPENAI_ENDPOINT,
          deployment: process.env.AZURE_OPENAI_DEPLOYMENT_NAME
        } 
      });
    } catch (error: any) {
      console.error('Azure OpenAI debug test failed:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message,
        details: {
          endpoint: process.env.AZURE_OPENAI_ENDPOINT,
          hasApiKey: !!process.env.AZURE_OPENAI_API_KEY,
          deployment: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
          errorType: error.constructor.name,
          errorCode: error.code || error.status
        }
      });
    }
  });

  // Thread Summary Routes
  app.get('/api/projects/:id/summary', async (req, res) => {
    try {
      let ThreadSummary;
      
      try {
        const summaryModule = await import('./models/ThreadSummary');
        ThreadSummary = summaryModule.ThreadSummary;
      } catch (importError) {
        console.error('Failed to import ThreadSummary model:', importError);
        return res.status(500).json({ 
          success: false, 
          error: 'Summary service is not available.' 
        });
      }
      
      const summary = await ThreadSummary.findByProject(req.params.id);
      
      if (!summary) {
        return res.json({ 
          success: true, 
          data: { summary: null, hasSummary: false } 
        });
      }

      res.json({ 
        success: true, 
        data: { 
          summary: summary.summary,
          lastUpdated: summary.lastUpdated,
          commentCount: summary.commentCount,
          hasSummary: true
        } 
      });
    } catch (error) {
      console.error('Get thread summary error:', error);
      res.status(500).json({ success: false, error: 'Failed to get thread summary' });
    }
  });

  app.post('/api/projects/:id/summary/generate', requireAuth, async (req, res) => {
    try {
      // Import Azure OpenAI service and ThreadSummary model
      let azureOpenAIService;
      let ThreadSummary;
      
      try {
        const azureModule = await import('./services/azureOpenAI');
        const summaryModule = await import('./models/ThreadSummary');
        azureOpenAIService = azureModule.azureOpenAIService;
        ThreadSummary = summaryModule.ThreadSummary;
      } catch (importError) {
        console.error('Failed to import Azure OpenAI modules:', importError);
        return res.status(503).json({ 
          success: false, 
          error: 'AI summary service is not available. Please contact administrator.' 
        });
      }
      
      // Check if Azure OpenAI is configured
      if (!azureOpenAIService || !azureOpenAIService.isConfigured()) {
        return res.status(503).json({ 
          success: false, 
          error: 'AI summary service is not configured. Please contact administrator.' 
        });
      }

      // Get project details and comments
      const project = await mongoStorage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ 
          success: false, 
          error: 'Project not found' 
        });
      }

      const comments = await mongoStorage.getProjectComments(req.params.id);
      const updates = await mongoStorage.getProjectUpdates(req.params.id);
      
      if (comments.length === 0 && updates.length === 0) {
        return res.json({ 
          success: true, 
          data: { 
            summary: 'No comments or updates to summarize yet.',
            commentCount: 0,
            updateCount: 0,
            generated: true
          } 
        });
      }

      // Check if we need to generate/update summary
      const existingSummary = await ThreadSummary.findByProject(req.params.id);
      
      // Find the latest activity (comment or update)
      const latestComment = comments.length > 0 ? 
        comments.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] : null;
      const latestUpdate = updates.length > 0 ? 
        updates.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] : null;
      
      const totalActivityCount = comments.length + updates.length;
      const latestActivityId = latestComment && latestUpdate ? 
        (new Date(latestComment.createdAt) > new Date(latestUpdate.createdAt) ? latestComment._id : latestUpdate._id) :
        (latestComment?._id || latestUpdate?._id);

      if (existingSummary && latestActivityId && !existingSummary.needsUpdate(totalActivityCount, latestActivityId)) {
        return res.json({ 
          success: true, 
          data: { 
            summary: existingSummary.summary,
            lastUpdated: existingSummary.lastUpdated,
            commentCount: existingSummary.commentCount,
            updateCount: updates.length,
            generated: false // Using cached version
          } 
        });
      }

      // Prepare project context for AI
      const projectContext = {
        title: project.title,
        description: project.description,
        tags: project.tags || [],
        status: project.status,
        ownerName: project.ownerId?.fullName || project.ownerId?.username || 'Unknown',
        createdAt: new Date(project.createdAt),
        updateCount: updates.length,
        commentCount: comments.length
      };

      // Prepare project updates for AI processing
      const updatesForAI = updates.map((update: any) => ({
        title: update.title,
        content: update.content,
        createdAt: new Date(update.createdAt),
        type: 'update'
      }));

      // Prepare comments for AI processing
      const commentsForAI = comments.map((comment: any) => ({
        content: comment.content,
        authorName: comment.authorId?.fullName || comment.authorId?.username || 'Anonymous',
        createdAt: new Date(comment.createdAt),
        type: 'comment'
      }));

      // Combine updates and comments chronologically for comprehensive context
      const allContent = [...updatesForAI, ...commentsForAI]
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

      // Generate summary using Azure OpenAI with full context
      const generatedSummary = await azureOpenAIService.generateThreadSummary(allContent, {
        projectContext,
        commentCount: comments.length,
        updateCount: updates.length,
        maxTokens: 250, // Increased for richer context with updates
        temperature: 0.3
      });

      // Save summary to database
      const savedSummary = await ThreadSummary.createOrUpdate(
        req.params.id,
        generatedSummary,
        totalActivityCount,
        latestActivityId
      );

      res.json({ 
        success: true, 
        data: { 
          summary: savedSummary.summary,
          lastUpdated: savedSummary.lastUpdated,
          commentCount: comments.length,
          updateCount: updates.length,
          generated: true
        },
        message: 'Thread summary generated successfully' 
      });

    } catch (error) {
      console.error('Generate thread summary error:', error);
      
      // Return appropriate error based on the type
      if (error.message?.includes('Azure OpenAI credentials')) {
        return res.status(503).json({ 
          success: false, 
          error: 'AI summary service is not properly configured.' 
        });
      }
      
      res.status(500).json({ 
        success: false, 
        error: 'Failed to generate thread summary. Please try again later.' 
      });
    }
  });

  // Project Share Routes
  app.post('/api/projects/:id/share', async (req, res) => {
    try {
      const { platform } = req.body;
      const userId = req.session.userId;
      
      if (!platform) {
        return res.status(400).json({ success: false, error: 'Platform is required' });
      }

      // Validate platform
      const validPlatforms = ['twitter', 'facebook', 'linkedin', 'reddit', 'whatsapp', 'email', 'copy', 'native'];
      if (!validPlatforms.includes(platform)) {
        return res.status(400).json({ success: false, error: 'Invalid platform' });
      }

      // Record the share
      await mongoStorage.recordProjectShare(req.params.id, platform, userId);

      res.json({ 
        success: true, 
        message: 'Share recorded successfully' 
      });
    } catch (error) {
      console.error('Record share error:', error);
      res.status(500).json({ success: false, error: 'Failed to record share' });
    }
  });

  // Comment Reaction Routes
  app.post('/api/comments/:id/reaction', requireAuth, async (req, res) => {
    try {
      const { type = 'like' } = req.body;
      console.log('Adding reaction:', { commentId: req.params.id, userId: req.session.userId, type });
      
      const comment = await mongoStorage.getComment(req.params.id);
      if (!comment) {
        return res.status(404).json({ success: false, error: 'Comment not found' });
      }

      await comment.addReaction(new Types.ObjectId(req.session.userId), type);
      
      // Refresh the comment to get updated reactions
      const updatedComment = await mongoStorage.getComment(req.params.id);
      
      console.log('Reaction added successfully:', { 
        commentId: req.params.id, 
        totalReactions: updatedComment?.reactions?.length || 0 
      });
      
      res.json({ 
        success: true, 
        data: { 
          reactions: updatedComment?.reactions || [],
          totalReactions: updatedComment?.reactions?.length || 0
        },
        message: 'Reaction added successfully' 
      });
    } catch (error) {
      console.error('Add reaction error:', error);
      res.status(500).json({ success: false, error: 'Failed to add reaction' });
    }
  });

  app.delete('/api/comments/:id/reaction', requireAuth, async (req, res) => {
    try {
      console.log('Removing reaction:', { commentId: req.params.id, userId: req.session.userId });
      
      const comment = await mongoStorage.getComment(req.params.id);
      if (!comment) {
        return res.status(404).json({ success: false, error: 'Comment not found' });
      }

      await comment.removeReaction(new Types.ObjectId(req.session.userId));
      
      // Refresh the comment to get updated reactions
      const updatedComment = await mongoStorage.getComment(req.params.id);
      
      console.log('Reaction removed successfully:', { 
        commentId: req.params.id, 
        totalReactions: updatedComment?.reactions?.length || 0 
      });
      
      res.json({ 
        success: true, 
        data: { 
          reactions: updatedComment?.reactions || [],
          totalReactions: updatedComment?.reactions?.length || 0
        },
        message: 'Reaction removed successfully' 
      });
    } catch (error) {
      console.error('Remove reaction error:', error);
      res.status(500).json({ success: false, error: 'Failed to remove reaction' });
    }
  });

  // Project Updates Routes
  app.get('/api/projects/:id/updates', async (req, res) => {
    try {
      const updates = await mongoStorage.getProjectUpdates(req.params.id);
      res.json({ success: true, data: { updates } });
    } catch (error) {
      console.error('Get project updates error:', error);
      res.status(500).json({ success: false, error: 'Failed to get project updates' });
    }
  });

  app.post('/api/projects/:id/updates', requireAuth, async (req, res) => {
    try {
      const project = await mongoStorage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }

      // Check if user owns the project
      if (project.ownerId._id.toString() !== req.session.userId) {
        return res.status(403).json({ success: false, error: 'Only project owner can post updates' });
      }

      const updateData = {
        ...req.body,
        projectId: req.params.id,
        authorId: req.session.userId
      };

      const update = await mongoStorage.createProjectUpdate(updateData);
      res.status(201).json({ 
        success: true, 
        data: { update },
        message: 'Project update posted successfully' 
      });
    } catch (error) {
      console.error('Create project update error:', error);
      res.status(500).json({ success: false, error: 'Failed to create project update' });
    }
  });

  // Project Subscription Routes
  app.post('/api/projects/:id/subscribe', requireAuth, async (req, res) => {
    try {
      const subscribed = await mongoStorage.subscribeToProject(req.session.userId, req.params.id);
      if (subscribed) {
        res.json({ 
          success: true, 
          message: 'Successfully subscribed to project updates' 
        });
      } else {
        res.status(400).json({ success: false, error: 'Failed to subscribe to project' });
      }
    } catch (error) {
      console.error('Subscribe to project error:', error);
      res.status(500).json({ success: false, error: 'Failed to subscribe to project' });
    }
  });

  app.delete('/api/projects/:id/subscribe', requireAuth, async (req, res) => {
    try {
      const unsubscribed = await mongoStorage.unsubscribeFromProject(req.session.userId, req.params.id);
      if (unsubscribed) {
        res.json({ 
          success: true, 
          message: 'Successfully unsubscribed from project updates' 
        });
      } else {
        res.status(400).json({ success: false, error: 'Failed to unsubscribe from project' });
      }
    } catch (error) {
      console.error('Unsubscribe from project error:', error);
      res.status(500).json({ success: false, error: 'Failed to unsubscribe from project' });
    }
  });

  app.get('/api/projects/:id/subscription-status', requireAuth, async (req, res) => {
    try {
      const isSubscribed = await mongoStorage.isSubscribedToProject(req.session.userId, req.params.id);
      res.json({ 
        success: true, 
        data: { isSubscribed } 
      });
    } catch (error) {
      console.error('Get subscription status error:', error);
      res.status(500).json({ success: false, error: 'Failed to get subscription status' });
    }
  });

  // Comment Routes
  app.get('/api/projects/:projectId/comments', async (req, res) => {
    try {
      const filters = {
        parentCommentId: req.query.parentCommentId as string,
        type: req.query.type as 'general' | 'question' | 'improvement' | 'answer'
      };

      const comments = await mongoStorage.getProjectComments(req.params.projectId, filters);
      res.json({ success: true, data: { comments } });
    } catch (error) {
      console.error('Get comments error:', error);
      res.status(500).json({ success: false, error: 'Failed to get comments' });
    }
  });

  app.post('/api/projects/:projectId/comments', requireAuth, async (req, res) => {
    try {
      const commentData = {
        ...req.body,
        projectId: req.params.projectId,
        authorId: req.session.userId
      };

      const comment = await mongoStorage.createComment(commentData);
      res.status(201).json({ 
        success: true, 
        data: { comment },
        message: 'Comment created successfully' 
      });
    } catch (error) {
      console.error('Create comment error:', error);
      res.status(500).json({ success: false, error: 'Failed to create comment' });
    }
  });

  app.delete('/api/comments/:id', requireAuth, async (req, res) => {
    try {
      const currentUser = await mongoStorage.getUser(req.session.userId);
      if (!currentUser) {
        return res.status(401).json({ success: false, error: 'User not found' });
      }

      const deleted = await mongoStorage.deleteComment(req.params.id, req.session.userId);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Comment not found or permission denied' });
      }

      res.json({ 
        success: true, 
        message: 'Comment deleted successfully' 
      });
    } catch (error) {
      console.error('Delete comment error:', error);
      res.status(500).json({ success: false, error: 'Failed to delete comment' });
    }
  });

  app.delete('/api/admin/comments/:id', requireAdmin, async (req, res) => {
    try {
      const deleted = await mongoStorage.deleteComment(req.params.id, req.currentUser._id.toString());
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Comment not found' });
      }

      res.json({ 
        success: true, 
        message: 'Comment deleted by admin successfully' 
      });
    } catch (error) {
      console.error('Admin delete comment error:', error);
      res.status(500).json({ success: false, error: 'Failed to delete comment' });
    }
  });

  // Event Routes
  app.get('/api/events', async (req, res) => {
    try {
      const filters = {
        eventType: req.query.eventType as 'major' | 'minor' | 'workshop' | 'meetup',
        featured: req.query.featured === 'true' ? true : undefined,
        upcoming: req.query.upcoming === 'true' ? true : undefined,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined
      };

      const pagination = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20
      };

      const result = await mongoStorage.getEvents(filters, pagination);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Get events error:', error);
      res.status(500).json({ success: false, error: 'Failed to get events' });
    }
  });

  app.get('/api/events/:id', async (req, res) => {
    try {
      const event = await mongoStorage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ success: false, error: 'Event not found' });
      }

      res.json({ success: true, data: { event } });
    } catch (error) {
      console.error('Get event error:', error);
      res.status(500).json({ success: false, error: 'Failed to get event' });
    }
  });

  // User Routes
  app.get('/api/users/:id', async (req, res) => {
    try {
      const user = await mongoStorage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      res.json({ success: true, data: { user } });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ success: false, error: 'Failed to get user' });
    }
  });

  app.put('/api/users/:id', requireAuth, async (req, res) => {
    try {
      console.log('Update user request:', {
        userId: req.params.id,
        sessionUserId: req.session.userId,
        body: req.body
      });

      // Users can only update their own profile, unless they're admin
      const currentUser = await mongoStorage.getUser(req.session.userId);
      if (!currentUser) {
        return res.status(401).json({ success: false, error: 'User not found' });
      }
      
      if (req.params.id !== req.session.userId && currentUser.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Permission denied' });
      }

      const updatedUser = await mongoStorage.updateUser(req.params.id, req.body);
      if (!updatedUser) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      console.log('User updated successfully:', updatedUser._id);

      res.json({ 
        success: true, 
        data: { user: updatedUser },
        message: 'User updated successfully' 
      });
    } catch (error) {
      console.error('Update user error:', error);
      
      // Handle MongoDB validation errors
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map((err: any) => err.message);
        return res.status(400).json({ 
          success: false, 
          error: `Validation failed: ${validationErrors.join(', ')}` 
        });
      }
      
      res.status(500).json({ 
        success: false, 
        error: error.message || 'Failed to update user' 
      });
    }
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'API is healthy', timestamp: new Date().toISOString() });
  });

  // File Upload Routes
  app.post('/api/upload/images', requireAuth, upload.array('images', 10), (req, res) => {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ success: false, error: 'No files uploaded' });
      }

      const uploadedFiles = req.files.map(file => {
        // Convert file buffer to Base64
        const base64Data = file.buffer ? file.buffer.toString('base64') : '';
        const dataUrl = `data:${file.mimetype};base64,${base64Data}`;
        
        return {
          filename: file.originalname,
          originalName: file.originalname,
          data: dataUrl, // Base64 data URL
          size: file.size,
          mimetype: file.mimetype
        };
      });

      res.json({ 
        success: true, 
        data: { files: uploadedFiles },
        message: 'Files processed successfully' 
      });
    } catch (error) {
      console.error('File upload error:', error);
      res.status(500).json({ success: false, error: 'Failed to process files' });
    }
  });

  // Process pre-compressed images (already in Base64 format)
  app.post('/api/upload/processed-images', requireAuth, (req, res) => {
    try {
      const { images } = req.body;
      
      if (!images || !Array.isArray(images) || images.length === 0) {
        return res.status(400).json({ success: false, error: 'No images provided' });
      }

      // Validate that all images have required fields and are properly formatted
      const validatedImages = images.map((image, index) => {
        if (!image.data || !image.data.startsWith('data:image/')) {
          throw new Error(`Invalid image data format at index ${index}`);
        }
        
        if (!image.filename || !image.originalName || !image.mimetype) {
          throw new Error(`Missing required fields at index ${index}`);
        }

        // Ensure we have a size, calculate if missing
        let size = image.size;
        if (!size) {
          // Estimate size from base64 data
          const base64Data = image.data.split(',')[1];
          size = Math.round((base64Data.length * 3) / 4);
        }

        return {
          filename: image.filename,
          originalName: image.originalName,
          data: image.data,
          size: size,
          mimetype: image.mimetype
        };
      });

      res.json({ 
        success: true, 
        data: { files: validatedImages },
        message: `${validatedImages.length} processed images ready` 
      });
    } catch (error) {
      console.error('Processed images upload error:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to process images' });
    }
  });

  // Contact Form Submission
  app.post('/api/contact', validateBody(contactSchema), async (req, res) => {
    try {
      const { name, email, message } = req.body;
      
      // Create contact submission
      const contact = new Contact({
        name,
        email,
        message
      });
      
      await contact.save();
      
      console.log('📧 New contact form submission:', { name, email, message: message.substring(0, 50) + '...' });
      
      res.status(201).json({
        success: true,
        message: 'Contact form submitted successfully',
        data: {
          id: contact._id,
          createdAt: contact.createdAt
        }
      });
      
    } catch (error) {
      console.error('Contact form submission error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to submit contact form'
      });
    }
  });

  // Admin: Get all contact form submissions (protected route)
  app.get('/api/admin/contacts', requireAuth, async (req, res) => {
    try {
      // Check if user is admin
      const user = await mongoStorage.getUserById(req.session.userId!);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Access denied. Admin privileges required.'
        });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;

      // Get contact submissions with pagination
      const contacts = await Contact.find()
        .sort({ createdAt: -1 }) // Most recent first
        .skip(skip)
        .limit(limit)
        .lean();

      const totalContacts = await Contact.countDocuments();
      const totalPages = Math.ceil(totalContacts / limit);

      res.json({
        success: true,
        data: {
          contacts,
          pagination: {
            currentPage: page,
            totalPages,
            totalItems: totalContacts,
            itemsPerPage: limit,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
          }
        }
      });

    } catch (error) {
      console.error('Error fetching contact submissions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch contact submissions'
      });
    }
  });

  // ================================
  // ADMIN DASHBOARD ROUTES
  // ================================

  // Admin Analytics - Overview
  app.get('/api/admin/analytics', requireAdmin, async (req, res) => {
    try {
      console.log('📊 Admin analytics request received');
      const timeframe = req.query.timeframe as string || '7d';
      console.log('📅 Timeframe:', timeframe);
      
      const now = new Date();
      let startDate: Date;

      switch (timeframe) {
        case '24h':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }

      console.log('📊 Fetching analytics data...');

      // Get overview statistics
      console.log('📊 Fetching overview statistics...');
      const [totalUsers, totalProjects, totalComments, totalEvents, activeUsers] = await Promise.all([
        User.countDocuments(),
        Project.countDocuments({ $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] }),
        Comment.countDocuments(),
        Event.countDocuments(),
        User.countDocuments({ 
          isActive: true,
          lastLoginAt: { $gte: startDate }
        })
      ]);
      
      console.log('📊 Overview stats:', { totalUsers, totalProjects, totalComments, totalEvents, activeUsers });

      const [newUsersToday, newProjectsToday] = await Promise.all([
        User.countDocuments({
          createdAt: { $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) }
        }),
        Project.countDocuments({
          createdAt: { $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) },
          $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }]
        })
      ]);
      
      console.log('📊 Today stats:', { newUsersToday, newProjectsToday });

      const engagementRate = totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0;

      // User growth data
      const userGrowthData = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
        
        const users = await User.countDocuments({
          createdAt: { $lte: dayEnd }
        });
        const activeUsers = await User.countDocuments({
          lastLoginAt: { $gte: dayStart, $lt: dayEnd }
        });

        userGrowthData.push({
          date: date.toISOString().split('T')[0],
          users,
          activeUsers
        });
      }

      // Project categories  
      console.log('📊 Fetching project categories...');
      const projectStats = await Project.aggregate([
        { $match: { $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] } },
        { $unwind: '$tags' },
        { $group: { _id: '$tags', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 6 },
        { $project: { category: '$_id', count: 1, _id: 0 } }
      ]);
      
      console.log('📊 Project categories:', projectStats);

      // Add colors to project stats
      const colors = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];
      projectStats.forEach((stat, index) => {
        stat.color = colors[index % colors.length];
      });

      // Engagement data
      const engagementData = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        
        const comments = await Comment.countDocuments({
          createdAt: { $gte: monthStart, $lte: monthEnd }
        });

        const likes = await Project.aggregate([
          { $match: { createdAt: { $gte: monthStart, $lte: monthEnd } } },
          { $group: { _id: null, totalLikes: { $sum: '$analytics.totalLikes' } } }
        ]);

        const shares = await Project.aggregate([
          { $match: { createdAt: { $gte: monthStart, $lte: monthEnd } } },
          { $group: { _id: null, totalShares: { $sum: '$analytics.shares' } } }
        ]);

        engagementData.push({
          month: monthStart.toLocaleString('default', { month: 'short' }),
          comments,
          likes: likes[0]?.totalLikes || 0,
          shares: shares[0]?.totalShares || 0
        });
      }

      // Top projects
      console.log('📊 Fetching top projects...');
      const topProjects = await Project.find({ 
        $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] 
      })
        .sort({ 'analytics.views': -1 })
        .limit(5)
        .populate('ownerId', 'username')
        .select('title analytics.views analytics.totalLikes ownerId');
        
      console.log('📊 Top projects raw:', topProjects);

      const formattedTopProjects = topProjects.map(project => ({
        title: project.title,
        views: project.analytics?.views || 0,
        likes: project.analytics?.totalLikes || 0,
        owner: (project.ownerId as any)?.username || 'Unknown'
      }));
      
      console.log('📊 Formatted top projects:', formattedTopProjects);

      // College distribution
      const collegeDistribution = await User.aggregate([
        { $match: { college: { $exists: true, $ne: null } } },
        { $group: { _id: '$college', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $project: { college: '$_id', count: 1, _id: 0 } }
      ]);

      // Recent activity
      console.log('📊 Fetching recent activity...');
      const recentActivity = await UserActivity.find()
        .sort({ timestamp: -1 })
        .limit(10)
        .populate('userId', 'username')
        .select('action details timestamp userId');
        
      console.log('📊 Recent activity raw:', recentActivity);

      const formattedActivity = recentActivity.map(activity => ({
        id: activity._id.toString(),
        type: activity.action?.includes('project') ? 'project' : 
              activity.action?.includes('comment') ? 'comment' :
              activity.action?.includes('event') ? 'event' : 'user',
        description: `${activity.action || 'Unknown action'}: ${activity.details || 'No details'}`,
        timestamp: activity.timestamp?.toLocaleString() || new Date().toLocaleString(),
        user: (activity.userId as any)?.username || 'System'
      }));

      const analyticsData = {
        overview: {
          totalUsers: totalUsers || 0,
          totalProjects: totalProjects || 0,
          totalComments: totalComments || 0,
          totalEvents: totalEvents || 0,
          activeUsers: activeUsers || 0,
          newUsersToday: newUsersToday || 0,
          newProjectsToday: newProjectsToday || 0,
          engagementRate: engagementRate || 0
        },
        userGrowth: userGrowthData || [],
        projectStats: projectStats || [],
        engagementData: engagementData || [],
        topProjects: formattedTopProjects || [],
        collegeDistribution: collegeDistribution || [],
        recentActivity: formattedActivity || []
      };

      console.log('📊 Final analytics data:', JSON.stringify(analyticsData, null, 2));

      res.json({
        success: true,
        data: analyticsData
      });

    } catch (error) {
      console.error('❌ Admin analytics error:', error);
      console.error(error.stack);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch analytics data',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Admin Test Endpoint
  app.get('/api/admin/test', requireAdmin, async (req, res) => {
    try {
      console.log('🧪 Admin test endpoint accessed by:', req.currentUser?.username);
      res.json({
        success: true,
        data: {
          message: 'Admin access working correctly',
          user: {
            id: req.currentUser._id,
            username: req.currentUser.username,
            role: req.currentUser.role
          },
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Admin test error:', error);
      res.status(500).json({
        success: false,
        error: 'Admin test failed'
      });
    }
  });

  // Admin AI Query Agent
  app.post('/api/admin/ai-query', requireAdmin, async (req, res) => {
    try {
      const { query } = req.body;

      if (!query || typeof query !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Query is required and must be a string'
        });
      }

      // Get relevant data context for the AI
      const context = {
        totalUsers: await User.countDocuments(),
        totalProjects: await Project.countDocuments({ isDeleted: false }),
        totalComments: await Comment.countDocuments(),
        activeUsers: await User.countDocuments({ isActive: true }),
        recentUsers: await User.countDocuments({
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }),
        featuredProjects: await Project.countDocuments({ featured: true, isDeleted: false }),
        topCategories: await Project.aggregate([
          { $match: { isDeleted: false } },
          { $unwind: '$tags' },
          { $group: { _id: '$tags', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 5 }
        ])
      };

      // Create AI prompt with context
      const aiPrompt = `You are a ShipIts Forum Analytics AI Assistant. You have access to the following current platform data:

PLATFORM STATISTICS:
- Total Users: ${context.totalUsers}
- Active Users: ${context.activeUsers}
- Total Projects: ${context.totalProjects}
- Featured Projects: ${context.featuredProjects}
- Total Comments: ${context.totalComments}
- New Users (Last 7 days): ${context.recentUsers}
- Top Project Categories: ${context.topCategories.map(cat => `${cat._id} (${cat.count})`).join(', ')}

USER QUERY: "${query}"

Please provide a helpful, data-driven response based on the available statistics. If the query asks for specific data not provided above, explain what information would be needed and suggest how to gather it. Keep responses concise but informative.`;

      const response = await azureOpenAIService.generateThreadSummary(
        [{ 
          content: aiPrompt,
          authorName: 'Admin',
          createdAt: new Date(),
          type: 'comment'
        }],
        {
          maxTokens: 500,
          temperature: 0.3,
          systemPrompt: `You are an AI assistant specialized in forum analytics and community management. Provide accurate, helpful insights based on the data provided. Be conversational but professional.`
        }
      );

      res.json({
        success: true,
        data: {
          answer: response,
          context: {
            queryTime: new Date().toISOString(),
            dataSnapshot: context
          }
        }
      });

    } catch (error) {
      console.error('AI query error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process AI query. Please check Azure OpenAI configuration.'
      });
    }
  });

  // Admin User Management
  app.get('/api/admin/users', requireAdmin, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;
      const role = req.query.role as string;
      const isActive = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;
      const search = req.query.search as string;
      const sortBy = req.query.sortBy as string || 'createdAt';
      const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

      let filter: any = {};
      if (role) filter.role = role;
      if (isActive !== undefined) filter.isActive = isActive;
      if (search) {
        filter.$or = [
          { username: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { fullName: { $regex: search, $options: 'i' } }
        ];
      }

      const [users, total] = await Promise.all([
        User.find(filter)
          .sort({ [sortBy]: sortOrder })
          .skip(skip)
          .limit(limit)
          .select('-password'),
        User.countDocuments(filter)
      ]);

      res.json({
        success: true,
        data: {
          items: users,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });

    } catch (error) {
      console.error('Admin users fetch error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch users'
      });
    }
  });

  // Admin Update User Role
  app.put('/api/admin/users/:userId/role', requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      if (!['user', 'moderator', 'admin'].includes(role)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid role'
        });
      }

      const user = await User.findByIdAndUpdate(
        userId,
        { role },
        { new: true }
      ).select('-password');

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Log the action
      await UserActivity.create({
        userId: req.currentUser._id,
        action: 'admin_role_update',
        details: `Changed user ${user.username} role to ${role}`,
        timestamp: new Date()
      });

      res.json({
        success: true,
        data: { user }
      });

    } catch (error) {
      console.error('Admin role update error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update user role'
      });
    }
  });

  // Admin Toggle User Status
  app.put('/api/admin/users/:userId/toggle-status', requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      user.isActive = !user.isActive;
      await user.save();

      // Log the action
      await UserActivity.create({
        userId: req.currentUser._id,
        action: 'admin_user_status_toggle',
        details: `${user.isActive ? 'Activated' : 'Deactivated'} user ${user.username}`,
        timestamp: new Date()
      });

      res.json({
        success: true,
        data: { user: { ...user.toObject(), password: undefined } }
      });

    } catch (error) {
      console.error('Admin user status toggle error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to toggle user status'
      });
    }
  });

  // Admin System Statistics
  app.get('/api/admin/system/stats', requireAdmin, async (req, res) => {
    try {
      const stats = await getDatabaseStats();
      
      // Add more detailed system stats
      const systemStats = {
        ...stats,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version,
        platform: process.platform
      };

      res.json({
        success: true,
        data: systemStats
      });

    } catch (error) {
      console.error('System stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch system statistics'
      });
    }
  });

  // Admin Recent Activity
  app.get('/api/admin/activity/recent', requireAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;

      const activities = await UserActivity.find()
        .sort({ timestamp: -1 })
        .limit(limit)
        .populate('userId', 'username')
        .select('action details timestamp userId');

      const formattedActivities = activities.map(activity => ({
        id: activity._id.toString(),
        action: activity.action,
        details: activity.details,
        timestamp: activity.timestamp.toISOString(),
        user: (activity.userId as any)?.username || 'System'
      }));

      res.json({
        success: true,
        data: formattedActivities
      });

    } catch (error) {
      console.error('Recent activity error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch recent activity'
      });
    }
  });

  // Admin Health Check
  app.get('/api/admin/system/health', requireAdmin, async (req, res) => {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: {
          connected: mongoose.connection.readyState === 1,
          status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
        },
        azureOpenAI: {
          configured: azureOpenAIService.isConfigured(),
          status: azureOpenAIService.isConfigured() ? 'ready' : 'not configured'
        },
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          nodeVersion: process.version
        }
      };

      res.json({
        success: true,
        data: health
      });

    } catch (error) {
      console.error('Health check error:', error);
      res.status(500).json({
        success: false,
        error: 'Health check failed'
      });
    }
  });

  // Serve uploaded files
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

  const httpServer = createServer(app);
  return httpServer;
}