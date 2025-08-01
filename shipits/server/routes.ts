import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { mongoStorage } from "./services/mongoStorage";
import { upload, getFileUrl } from "./services/fileUpload";
import { z } from "zod";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";
import { 
  loginSchema, registerSchema, createProjectSchema, createCommentSchema, 
  createEventSchema, updateUserSchema, updateProjectSchema,
  type ApiResponse, type PaginatedResponse 
} from "@shared/schema";

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

// Middleware for admin authentication
const requireAdmin = async (req: any, res: any, next: any) => {
  if (!req.session.userId) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  
  try {
    const user = await mongoStorage.getUser(req.session.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }
    req.currentUser = user;
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
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
      const { email, username } = req.body;
      
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

      const user = await mongoStorage.createUser(req.body);
      req.session.userId = user._id.toString();
      req.session.user = user;

      res.json({ 
        success: true, 
        data: { user: { ...user, password: undefined } },
        message: 'User registered successfully' 
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ success: false, error: 'Registration failed' });
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
      const project = await mongoStorage.getProject(req.params.id);
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

      res.json({ 
        success: true, 
        data: { user: updatedUser },
        message: 'User updated successfully' 
      });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ success: false, error: 'Failed to update user' });
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

  // Serve uploaded files
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

  const httpServer = createServer(app);
  return httpServer;
}