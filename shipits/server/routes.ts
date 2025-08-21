import type { Express, Request } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { mongoStorage } from "./services/mongoStorage";
import { upload, getFileUrl, getFileCategory, saveFileToDisk, generateUniqueFilename, getFileIcon } from "./services/fileUpload";
import { s3Storage } from "./services/s3Storage";
import { azureOpenAIService } from "./services/azureOpenAI";
import { z } from "zod";
import session from "express-session";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { Types } from "mongoose";
import mongoose from "mongoose";

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      currentUser?: any;
    }
  }
}
// Simple in-memory rate limiter to avoid external deps in server build
type RateRecord = { count: number; resetAt: number };
const rateBuckets: Map<string, RateRecord> = new Map();
function createRateLimiter(max: number, windowMs: number) {
  return (req: any, res: any, next: any) => {
    try {
      const key = `${req.ip || req.connection?.remoteAddress || 'unknown'}:${req.path}`;
      const now = Date.now();
      const rec = rateBuckets.get(key);
      if (!rec || rec.resetAt <= now) {
        rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
        return next();
      }
      if (rec.count >= max) {
        const retryAfterSec = Math.max(1, Math.ceil((rec.resetAt - now) / 1000));
        res.setHeader('Retry-After', String(retryAfterSec));
        return res.status(429).json({ success: false, error: 'Too many requests. Please try again later.' });
      }
      rec.count += 1;
      return next();
    } catch (e) {
      return next();
    }
  };
}
import { 
  loginSchema, registerSchema, createProjectSchema, createCommentSchema, 
  createEventSchema, updateUserSchema, updateProjectSchema, contactSchema,
  createReportSchema, updateReportStatusSchema,
  translateRequestSchema, communityTranslationSchema,
  createListSchema, createListItemSchema, updateListSchema, updateListItemSchema,
  type ApiResponse, type PaginatedResponse, type ListFilters, type ListItemFilters
} from "@shared/schema";
import { 
  User, Project, Comment, Event, UserActivity, Contact, Notification, Report, getDatabaseStats,
  Translation, List, ListItem
} from "./models/index";
import { nanoid } from 'nanoid';
import { sendEmailViaSES, buildVerificationEmailHtml, buildCommentNotificationEmailHtml, buildPasswordResetEmailHtml } from './services/sesEmail';
import { Conversation } from './models/Conversation';
import { Message } from './models/Message';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Utility: safe regex escape for autocomplete endpoints
const escapeRegex = (str: string): string => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Session configuration
declare module 'express-session' {
  interface SessionData {
    userId?: string;
    user?: any;
  }
}

// Middleware for authentication
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session.userId!) {
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
  console.log('🔐 Admin auth check - Session userId:', req.session.userId!);
  
  if (!req.session.userId!) {
    console.log('❌ No session userId found');
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  
  try {
    const user = await mongoStorage.getUser(req.session.userId!);
    console.log('👤 Found user:', user ? { id: user._id, username: user.username, role: user.role } : 'null');
    
    if (!user || user.role !== 'admin') {
      console.log('❌ Admin access denied - User role:', user?.role);
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }
    
    console.log('✅ Admin access granted for:', user.username);
    req.currentUser = user;
    next();
  } catch (error: any) {
    console.error('❌ Admin auth error:', error);
    res.status(500).json({ success: false, error: 'Authentication failed' });
  }
};

// Validation middleware
const validateBody = (schema: z.ZodSchema) => (req: any, res: any, next: any) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error: any) {
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
    secret: process.env.SESSION_SECRET || 'fallback-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,           // MUST be false for HTTP
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax',        // Important for cross-origin
      domain: undefined       // Don't set domain for localhost/IP
    }
  }));

  // Rate limiters
  const registerLimiter = createRateLimiter(20, 60 * 60 * 1000);
  const postLimiter = createRateLimiter(30, 60 * 1000);

  // Authentication Routes
  app.post('/api/auth/register', registerLimiter, validateBody(registerSchema), async (req, res) => {
    try {
      const { email, username, password, fullName, captchaToken } = req.body;
      // Optional hCaptcha verification if configured
      if (captchaToken && process.env.HCAPTCHA_SECRET) {
        try {
          const verifyResp = await fetch('https://hcaptcha.com/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              secret: process.env.HCAPTCHA_SECRET,
              response: captchaToken,
            }),
          });
          const verifyJson = await verifyResp.json();
          if (!verifyJson.success) {
            return res.status(400).json({ success: false, error: 'CAPTCHA verification failed' });
          }
        } catch (e) {
          console.warn('CAPTCHA verify error:', e);
        }
      }
      
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

      // Issue email verification token
      try {
        const token = nanoid(48);
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h
        await User.findByIdAndUpdate(String(user._id), {
          emailVerificationToken: token,
          emailVerificationExpiresAt: expiresAt,
          emailVerified: false
        });

        const baseUrl = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
        const verifyUrl = `${baseUrl}/api/auth/verify?token=${encodeURIComponent(token)}`;
        const html = buildVerificationEmailHtml({
          fullName: fullName || username,
          username,
          email,
          verifyUrl,
        });
        await sendEmailViaSES({
          to: email,
          subject: 'Verify your email for Osprey @ CMU',
          html,
          text: `Welcome to Osprey@CMU. Verify your email: ${verifyUrl}`,
        });
      } catch (e: any) {
        console.error('Failed to send verification email:', e);
      }
      
      // Return success response without password (no session until verified)
      const userResponse = { ...user } as any;
      delete userResponse.password;

      res.status(201).json({ 
        success: true, 
        data: { user: userResponse },
        message: 'Registration successful. Please verify your email before logging in.' 
      });
    } catch (error: any) {
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

      // Enforce email verification for non-admins
      if (!user.emailVerified && user.role !== 'admin') {
        // Re-issue token if missing/expired
        try {
          const freshToken = nanoid(48);
          const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);
          await User.findByIdAndUpdate(String(user._id), {
            emailVerificationToken: freshToken,
            emailVerificationExpiresAt: expiresAt,
          });
          const baseUrl = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
          const verifyUrl = `${baseUrl}/api/auth/verify?token=${encodeURIComponent(freshToken)}`;
          const html = buildVerificationEmailHtml({
            fullName: user.fullName || user.username,
            username: user.username,
            email: user.email,
            verifyUrl,
          });
          await sendEmailViaSES({
            to: user.email,
            subject: 'Verify your email for Osprey @ CMU',
            html,
            text: `Verify your email: ${verifyUrl}`,
          });
        } catch (e: any) {
          console.error('Failed to send verification email on login:', e);
        }
        return res.status(403).json({ success: false, error: "Email not verified. We have sent you a verification link." });
      }

      req.session.userId = user._id?.toString();
      req.session.user = user;

      res.json({ 
        success: true, 
        data: { user: { ...user, password: undefined } },
        message: 'Login successful' 
      });
    } catch (error: any) {
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
    if (!req.session.userId!) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    try {
      const user = await mongoStorage.getUser(req.session.userId!);
      if (!user) {
        req.session.destroy(() => {});
        return res.status(401).json({ success: false, error: 'User not found' });
      }

      res.json({ 
        success: true, 
        data: { user: { ...user, password: undefined } } 
      });
    } catch (error: any) {
      console.error('Get current user error:', error);
      res.status(500).json({ success: false, error: 'Failed to get user info' });
    }
  });

  // Email verification endpoint
  app.get('/api/auth/verify', async (req, res) => {
    try {
      const token = String(req.query.token || '');
      if (!token || token.length < 10) {
        return res.status(400).json({ success: false, error: 'Invalid or missing verification token' });
      }
      const user = await User.findOne({ emailVerificationToken: token });
      if (!user) {
        return res.status(400).json({ success: false, error: 'Invalid verification token' });
      }
      if (user.emailVerified) {
        // Redirect to success landing page
        const baseUrl = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
        return res.redirect(302, `${baseUrl}/verify-success`);
      }
      if (user.emailVerificationExpiresAt && user.emailVerificationExpiresAt.getTime() < Date.now()) {
        return res.status(400).json({ success: false, error: 'Verification token expired. Please request a new one.' });
      }
      user.emailVerified = true;
      user.emailVerifiedAt = new Date();
      user.emailVerificationToken = null as any;
      user.emailVerificationExpiresAt = null as any;
      await user.save();
      // Redirect to success landing page
      const baseUrl = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
      return res.redirect(302, `${baseUrl}/verify-success`);
    } catch (e: any) {
      console.error('Email verify error:', e);
      return res.status(500).json({ success: false, error: 'Verification failed' });
    }
  });

  // Resend verification
  app.post('/api/auth/resend-verification', async (req, res) => {
    try {
      const email = String(req.body?.email || '').toLowerCase();
      if (!email) return res.status(400).json({ success: false, error: 'Email required' });
      const user = await User.findOne({ email });
      if (!user) return res.status(404).json({ success: false, error: 'User not found' });
      if (user.emailVerified) return res.json({ success: true, message: 'Email already verified' });
      const token = nanoid(48);
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);
      await User.findByIdAndUpdate(user._id, {
        emailVerificationToken: token,
        emailVerificationExpiresAt: expiresAt,
      });
      const baseUrl = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
      const verifyUrl = `${baseUrl}/api/auth/verify?token=${encodeURIComponent(token)}`;
      const html = buildVerificationEmailHtml({
        fullName: user.fullName || user.username,
        username: user.username,
        email: user.email,
        verifyUrl,
      });
      await sendEmailViaSES({ to: user.email, subject: 'Verify your email for Osprey@CMU', html, text: `Verify your email: ${verifyUrl}` });
      return res.json({ success: true, message: 'Verification email sent' });
    } catch (e: any) {
      console.error('Resend verify error:', e);
      return res.status(500).json({ success: false, error: 'Failed to resend verification' });
    }
  });

  // Password reset: request
  app.post('/api/auth/password-reset/request', async (req, res) => {
    try {
      const email = String(req.body?.email || '').toLowerCase();
      if (!email) return res.status(400).json({ success: false, error: 'Email required' });
      const user = await User.findOne({ email });
      // Always return success to avoid email enumeration
      if (!user) return res.json({ success: true, message: 'If the email exists, a reset link has been sent' });
      if (!user.emailVerified) return res.json({ success: true, message: 'If the email exists, a reset link has been sent' });
      const token = nanoid(48);
      const expiresAt = new Date(Date.now() + 1000 * 60 * 30); // 30m
      user.passwordResetToken = token as any;
      user.passwordResetExpiresAt = expiresAt as any;
      await user.save();
      const baseUrl = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
      const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
      const html = buildPasswordResetEmailHtml({ fullNameOrUsername: user.fullName || user.username, resetUrl });
      await sendEmailViaSES({ to: email, subject: 'Reset your Osprey @ CMU password', html, text: `Reset your password: ${resetUrl}` });
      return res.json({ success: true, message: 'If the email exists, a reset link has been sent' });
    } catch (e) {
      console.error('Password reset request error:', e);
      return res.status(500).json({ success: false, error: 'Failed to process request' });
    }
  });

  // Password reset: confirm
  app.post('/api/auth/password-reset/confirm', async (req, res) => {
    try {
      const { token, newPassword, confirmPassword } = req.body || {};
      if (!token || typeof token !== 'string' || token.length < 10) return res.status(400).json({ success: false, error: 'Invalid token' });
      if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) return res.status(400).json({ success: false, error: 'Invalid password' });
      if (newPassword !== confirmPassword) return res.status(400).json({ success: false, error: 'Passwords do not match' });
      const user = await User.findOne({ passwordResetToken: token });
      if (!user) return res.status(400).json({ success: false, error: 'Invalid or expired token' });
      if (!user.passwordResetExpiresAt || user.passwordResetExpiresAt.getTime() < Date.now()) {
        return res.status(400).json({ success: false, error: 'Invalid or expired token' });
      }
      user.password = newPassword; // will be hashed by pre-save hook
      user.passwordResetToken = null as any;
      user.passwordResetExpiresAt = null as any;
      await user.save();
      return res.json({ success: true, message: 'Password reset successful. Please log in.' });
    } catch (e) {
      console.error('Password reset confirm error:', e);
      return res.status(500).json({ success: false, error: 'Failed to reset password' });
    }
  });

  // Project Routes
  app.get('/api/projects', async (req, res) => {
    try {
      const statusParam = (req.query.status as string) || undefined;
      const statusNorm: 'active' | 'inactive' | 'archived' | 'completed' | undefined = (statusParam === 'active' || statusParam === 'inactive' || statusParam === 'archived' || statusParam === 'completed') ? statusParam : undefined;
      const filters: import('@shared/schema').ProjectFilters = {
        status: statusNorm,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        featured: req.query.featured === 'true' ? true : undefined,
        ownerId: req.query.ownerId as string,
        search: req.query.search as string
      };

      const pagination = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        sortBy: (req.query.sortBy as string) || 'createdAt',
        sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc'
      };

      const result = await mongoStorage.getProjects(filters as any, pagination);
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
    } catch (error: any) {
      console.error('Get projects error:', error);
      res.status(500).json({ success: false, error: 'Failed to get projects' });
    }
  });

  // Autocomplete endpoint: projects, tags, users
  app.get('/api/search/autocomplete', async (req, res) => {
    try {
      const q = String(req.query.q || '').trim();
      const limit = Math.min(parseInt((req.query.limit as string) || '10', 10), 50);

      // use top-level escapeRegex
      const safe = escapeRegex(q);

      const [projectMatches, tagMatches, userMatches] = await Promise.all([
        q ? Project.find({
          isDeleted: false,
          status: 'active',
          $or: [
            { title: { $regex: safe, $options: 'i' } },
            { description: { $regex: safe, $options: 'i' } },
            { tags: { $regex: safe, $options: 'i' } },
          ]
        }).select('title tags ownerId').limit(limit).populate('ownerId', 'username fullName').lean() : [],
        // popular tags starting with query
        q ? Project.aggregate([
          { $match: { status: 'active', isDeleted: false, tags: { $exists: true, $ne: [] } } },
          { $unwind: '$tags' },
          { $match: { tags: { $regex: '^' + safe, $options: 'i' } } },
          { $group: { _id: '$tags', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: limit },
          { $project: { tag: '$_id', count: 1, _id: 0 } }
        ]) : [],
        q ? User.find({ $or: [
          { username: { $regex: safe, $options: 'i' } },
          { fullName: { $regex: safe, $options: 'i' } }
        ] }).select('username fullName profileImage').limit(limit).lean() : []
      ]);

      res.json({ success: true, data: { projects: projectMatches, tags: tagMatches, users: userMatches } });
    } catch (error: any) {
      console.error('Autocomplete error:', error);
      res.status(500).json({ success: false, error: 'Failed to get suggestions' });
    }
  });

  // Did you mean endpoint
  app.get('/api/search/did-you-mean', async (req, res) => {
    try {
      const q = String(req.query.q || '').trim();
      if (!q) return res.json({ success: true, data: {} });
      const { azureOpenAIService } = await import('./services/azureOpenAI');
      const suggestion = await azureOpenAIService.suggestQueryCorrections(q);
      res.json({ success: true, data: suggestion });
    } catch (error: any) {
      console.error('Did you mean error:', error);
      res.status(200).json({ success: true, data: {} });
    }
  });

  // Admin: backfill/reindex embeddings for projects
  app.post('/api/admin/embeddings/reindex', requireAdmin, async (req, res) => {
    try {
      const force = Boolean((req.body && (req.body as any).force) || false);
      const max = Math.min(parseInt((req.body && (req.body as any).limit) || '200', 10), 2000);
      const { azureOpenAIService } = await import('./services/azureOpenAI');
      if (!azureOpenAIService.isEmbeddingConfigured()) {
        return res.status(400).json({ success: false, error: 'Embeddings not configured' });
      }
      const query: any = { isDeleted: false };
      if (!force) query.embedding = { $exists: false };
      const candidates = await Project.find(query).select('title description tags').limit(max).lean();
      if (candidates.length === 0) {
        return res.json({ success: true, data: { updated: 0 } });
      }
      const batchSize = 64;
      let updated = 0;
      for (let i = 0; i < candidates.length; i += batchSize) {
        const batch = candidates.slice(i, i + batchSize);
        const texts = batch.map((p: any) => `${p.title}\n${p.description}\nTags: ${(p.tags || []).join(', ')}`.slice(0, 12000));
        const vectors = await azureOpenAIService.getEmbeddings(texts);
        const ops = batch.map((p: any, idx: number) => ({
          updateOne: {
            filter: { _id: p._id },
            update: { $set: { embedding: vectors[idx] || [] } }
          }
        }));
        if (ops.length > 0) {
          const r = await (Project as any).bulkWrite(ops);
          updated += r.modifiedCount || 0;
        }
      }
      res.json({ success: true, data: { updated } });
    } catch (error: any) {
      console.error('Embeddings reindex error:', error);
      res.status(500).json({ success: false, error: 'Failed to reindex embeddings' });
    }
  });

  app.get('/api/projects/featured', async (req, res) => {
    try {
      const projects = await mongoStorage.getFeaturedProjects();
      res.json({ success: true, data: { projects } });
    } catch (error: any) {
      console.error('Get featured projects error:', error);
      res.status(500).json({ success: false, error: 'Failed to get featured projects' });
    }
  });

  // Trending projects
  app.get('/api/projects/trending', async (req, res) => {
    try {
      const projects = await mongoStorage.getTrendingProjects();
      res.json({ success: true, data: { projects } });
    } catch (error: any) {
      console.error('Get trending projects error:', error);
      res.status(500).json({ success: false, error: 'Failed to get trending projects' });
    }
  });

  app.get('/api/projects/:id', async (req, res) => {
    try {
      // Pass the authenticated user ID for view tracking if available
      const userId = req.session.userId!;
      const project = await mongoStorage.getProject(req.params.id, userId);
      if (!project) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }

      res.json({ success: true, data: { project } });
    } catch (error: any) {
      console.error('Get project error:', error);
      res.status(500).json({ success: false, error: 'Failed to get project' });
    }
  });
  // Reports - public create
  app.post('/api/reports', requireAuth, validateBody(createReportSchema), async (req, res) => {
    try {
      const { targetType, targetId, reason, details } = req.body;
      // Validate target exists
      const objId = new Types.ObjectId(targetId);
      let exists = false;
      if (targetType === 'comment') exists = !!(await Comment.findById(objId));
      if (targetType === 'project') exists = !!(await Project.findById(objId));
      if (targetType === 'user') exists = !!(await User.findById(objId));
      if (targetType === 'listItem') exists = !!(await ListItem.findById(objId));
      if (!exists) {
        return res.status(404).json({ success: false, error: 'Target not found' });
      }

      const report = await Report.create({
        reporterId: new Types.ObjectId(req.session.userId!),
        targetType,
        targetId: objId,
        reason,
        details,
        status: 'pending',
        autoFlagged: false,
      });
      res.status(201).json({ success: true, data: { reportId: report._id } });
    } catch (error: any) {
      console.error('Create report error:', error);
      res.status(500).json({ success: false, error: 'Failed to submit report' });
    }
  });

  // Admin - list reports (enriched with context for comment/project/user)
  app.get('/api/admin/reports', requireAdmin, async (req, res) => {
    try {
      const page = parseInt((req.query.page as string) || '1');
      const limit = parseInt((req.query.limit as string) || '20');
      const status = req.query.status as string | undefined;
      const targetType = req.query.targetType as string | undefined;
      const filter: any = {};
      if (status) filter.status = status;
      if (targetType) filter.targetType = targetType;

      const total = await Report.countDocuments(filter);
      const rawItems = await Report.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      // Enrich reports with minimal context to aid moderation UI
      const items = await Promise.all(rawItems.map(async (r: any) => {
        try {
          if (r.targetType === 'comment') {
            const comment = await Comment.findById(r.targetId)
              .populate('authorId', 'username fullName profileImage')
              .lean();
            if (comment) {
              return {
                ...r,
                context: {
                  comment: {
                    _id: comment._id,
                    content: comment.content,
                    projectId: comment.projectId,
                    author: comment.authorId,
                    isDeleted: !!comment.isDeleted,
                  }
                }
              };
            }
          } else if (r.targetType === 'project') {
            const project = await Project.findById(r.targetId).select('title ownerId').populate('ownerId', 'username fullName').lean();
            if (project) {
              return {
                ...r,
                context: {
                  project: {
                    _id: project._id,
                    title: project.title,
                    owner: project.ownerId,
                  }
                }
              };
            }
          } else if (r.targetType === 'user') {
            const user = await User.findById(r.targetId).select('username fullName profileImage').lean();
            if (user) {
              return {
                ...r,
                context: {
                  user
                }
              };
            }
          } else if (r.targetType === 'listItem') {
            const listItem = await ListItem.findById(r.targetId)
              .populate('createdBy', 'username fullName profileImage')
              .select('title content createdBy listId')
              .lean();
            if (listItem) {
              return {
                ...r,
                context: {
                  listItem: {
                    _id: listItem._id,
                    title: listItem.title,
                    content: listItem.content,
                    createdBy: listItem.createdBy,
                    listId: listItem.listId,
                  }
                }
              };
            }
          }
        } catch (e) {
          // fall through and return raw report if enrichment fails
        }
        return r;
      }));

      res.json({ success: true, data: { items, total, page, limit, totalPages: Math.ceil(total / limit) } });
    } catch (error: any) {
      console.error('List reports error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch reports' });
    }
  });

  // Admin - update report status
  app.put('/api/admin/reports/:id', requireAdmin, validateBody(updateReportStatusSchema), async (req, res) => {
    try {
      const { status, adminNotes } = req.body;
      const report = await Report.findByIdAndUpdate(
        req.params.id,
        { status, adminNotes, processedBy: new Types.ObjectId(req.currentUser?._id) },
        { new: true }
      );
      if (!report) return res.status(404).json({ success: false, error: 'Report not found' });
      res.json({ success: true, data: { report } });
    } catch (error: any) {
      console.error('Update report error:', error);
      res.status(500).json({ success: false, error: 'Failed to update report' });
    }
  });

  app.post('/api/projects', requireAuth, validateBody(createProjectSchema), async (req, res) => {
    try {
      const projectData = {
        ...req.body,
        ownerId: req.session.userId!
      };

      const project = await mongoStorage.createProject(projectData);
      // Heuristic spam check on title/description (after creation so we can reference ID)
      const text = `${project.title}\n${project.description}`.toLowerCase();
      const hasSuspicious = /free money|buy now|viagra|crypto|casino|adult|porn/i.test(text) || /https?:\/\/\S{30,}/i.test(text);
      if (hasSuspicious) {
        try {
          await Report.create({
            reporterId: new Types.ObjectId(req.session.userId! as string),
            targetType: 'project',
            targetId: new Types.ObjectId(project._id),
            reason: 'spam',
            details: 'Auto-flagged by heuristic spam filter on project submit',
            autoFlagged: true,
            status: 'pending',
            scores: { heuristicScore: 0.85 },
          });
        } catch (e) {
          console.warn('Failed to auto-flag project:', e);
        }
      }
      res.status(201).json({ 
        success: true, 
        data: { project },
        message: 'Project created successfully' 
      });
    } catch (error: any) {
      console.error('Create project error:', error);
      res.status(500).json({ success: false, error: 'Failed to create project' });
    }
  });

  // Update project (for project owners)
  app.put('/api/projects/:id', requireAuth, async (req, res) => {
    try {
      const currentUser = await mongoStorage.getUser(req.session.userId!!);
      if (!currentUser) {
        return res.status(401).json({ success: false, error: 'User not found' });
      }

      const project = await mongoStorage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }

      // Check if user owns the project or is admin
      if (project.ownerId._id.toString() !== req.session.userId! && currentUser.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Permission denied' });
      }

      // Validate the updates using updateProjectSchema
      const validatedUpdates = updateProjectSchema.parse(req.body);
      
      const updatedProject = await mongoStorage.updateProject(req.params.id, validatedUpdates);
      if (!updatedProject) {
        return res.status(404).json({ success: false, error: 'Project not found or update failed' });
      }

      res.json({ 
        success: true,
        data: { project: updatedProject },
        message: 'Project updated successfully' 
      });
    } catch (error: any) {
      console.error('Update project error:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ success: false, error: 'Invalid project data', details: error.errors });
      }
      res.status(500).json({ success: false, error: 'Failed to update project' });
    }
  });

  app.delete('/api/projects/:id', requireAuth, async (req, res) => {
    try {
      const currentUser = await mongoStorage.getUser(req.session.userId!!);
      if (!currentUser) {
        return res.status(401).json({ success: false, error: 'User not found' });
      }

      const project = await mongoStorage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }

      // Check if user is owner, collaborator, or admin
      const isOwner = project.ownerId._id.toString() === req.session.userId!;
      const isCollaborator = project.collaborators?.some(c => c.toString() === req.session.userId!) || false;
      const isAdmin = currentUser.role === 'admin';

      if (!isOwner && !isCollaborator && !isAdmin) {
        return res.status(403).json({ success: false, error: 'Permission denied' });
      }

      const deleted = await mongoStorage.deleteProject(req.params.id, req.session.userId!!);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Project not found or already deleted' });
      }

      res.json({ 
        success: true, 
        message: 'Project deleted successfully' 
      });
    } catch (error: any) {
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

      // Check if user is owner, collaborator, or admin
      const currentUser = await mongoStorage.getUser(req.session.userId!!);
      if (!currentUser) {
        return res.status(401).json({ success: false, error: 'User not found' });
      }

      const isOwner = project.ownerId._id.toString() === req.session.userId!;
      const isCollaborator = project.collaborators?.some(c => c.toString() === req.session.userId!) || false;
      const isAdmin = currentUser.role === 'admin';

      if (!isOwner && !isCollaborator && !isAdmin) {
        return res.status(403).json({ success: false, error: "You don't have permission to delete this project." });
      }

      // Soft delete the project using mongoStorage
      const deleted = await mongoStorage.deleteProject(req.params.id, req.session.userId!);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Failed to delete project' });
      }

      res.json({ 
        success: true, 
        message: 'Project deleted by admin successfully' 
      });
    } catch (error: any) {
      console.error('Admin delete project error:', error);
      res.status(500).json({ success: false, error: 'Failed to delete project' });
    }
  });

  // Project Like Routes - Toggle like status
  app.post('/api/projects/:id/like', requireAuth, async (req, res) => {
    try {
      console.log('Toggling project like:', { projectId: req.params.id, userId: req.session.userId! });
      
      const project = await Project.findById(req.params.id);
      if (!project) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }

      const userId = new Types.ObjectId(req.session.userId!!);
      const isCurrentlyLiked = project.likes?.some(id => id.equals(userId)) || false;
      
      if (isCurrentlyLiked) {
        await project.removeLike(userId);
        console.log('Project unliked:', { projectId: req.params.id, totalLikes: project.analytics?.totalLikes });
        
        res.json({ 
          success: true, 
          data: { 
            totalLikes: project.analytics?.totalLikes || 0,
            isLiked: false 
          },
          message: 'Project unliked successfully' 
        });
      } else {
        await project.addLike(userId);
        console.log('Project liked:', { projectId: req.params.id, totalLikes: project.analytics?.totalLikes });
        
        // Create notification for project owner (if not self-like)
        try {
          await Notification.createProjectLikeNotification(
            new Types.ObjectId(req.params.id),
            userId,
            project.ownerId
          );
        } catch (notificationError) {
          console.error('Failed to create like notification:', notificationError);
          // Don't fail the request if notification creation fails
        }
        
        res.json({ 
          success: true, 
          data: { 
            totalLikes: project.analytics?.totalLikes || 0,
            isLiked: true 
          },
          message: 'Project liked successfully' 
        });
      }
    } catch (error: any) {
      console.error('Toggle project like error:', error);
      res.status(500).json({ success: false, error: 'Failed to toggle project like' });
    }
  });

  app.delete('/api/projects/:id/like', requireAuth, async (req, res) => {
    try {
      console.log('Unliking project:', { projectId: req.params.id, userId: req.session.userId! });
      
      const project = await Project.findById(req.params.id);
      if (!project) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }

      await project.removeLike(new Types.ObjectId(req.session.userId!!));
      
      console.log('Project unliked successfully:', { 
        projectId: req.params.id, 
        totalLikes: project.analytics?.totalLikes 
      });
      
      res.json({ 
        success: true, 
        data: { 
          totalLikes: project.analytics?.totalLikes || 0,
          isLiked: false 
        },
        message: 'Project unliked successfully' 
      });
    } catch (error: any) {
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
        { content: 'This project looks interesting!', authorName: 'TestUser1', createdAt: new Date(), type: 'comment' as const },
        { content: 'I agree, the UI design is really clean.', authorName: 'TestUser2', createdAt: new Date(), type: 'comment' as const }
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
      
      const summary = await ThreadSummary.findOne({ projectId: new Types.ObjectId(req.params.id) });
      
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
    } catch (error: any) {
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
      const existingSummary = await ThreadSummary.findOne({ projectId: new Types.ObjectId(req.params.id) });
      
      // Find the latest activity (comment or update)
      const latestComment = comments.length > 0 ? 
        comments.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] : null;
      const latestUpdate = updates.length > 0 ? 
        updates.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] : null;
      
      const totalActivityCount = comments.length + updates.length;
      const latestActivityId = latestComment && latestUpdate ? 
        (new Date(latestComment.createdAt || 0) > new Date(latestUpdate.createdAt || 0) ? latestComment._id : latestUpdate._id) :
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
        ownerName: 'Project Owner',
        createdAt: new Date(project.createdAt || 0),
        updateCount: updates.length,
        commentCount: comments.length
      };

      // Prepare project updates for AI processing
      const updatesForAI = updates.map((update: any) => ({
        title: update.title,
        content: update.content,
        createdAt: new Date(update.createdAt),
        type: 'update' as const
      }));

      // Prepare comments for AI processing
      const commentsForAI = comments.map((comment: any) => ({
        content: comment.content,
        authorName: comment.authorId?.fullName || comment.authorId?.username || 'Anonymous',
        createdAt: new Date(comment.createdAt),
        type: 'comment' as const
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
      const savedSummary = await ThreadSummary.findOneAndUpdate(
        { projectId: new Types.ObjectId(req.params.id) },
        {
          summary: generatedSummary,
          commentCount: totalActivityCount,
          lastCommentId: latestActivityId,
          lastUpdated: new Date()
        },
        {
          upsert: true,
          new: true,
          runValidators: true
        }
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

    } catch (error: any) {
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

  // AI: Suggest Tags for a Project
  app.post('/api/projects/:id/tags/suggest', requireAuth, async (req, res) => {
    try {
      let azureOpenAIService;
      try {
        const azureModule = await import('./services/azureOpenAI');
        azureOpenAIService = azureModule.azureOpenAIService;
      } catch (importError) {
        console.error('Failed to import Azure OpenAI modules:', importError);
        return res.status(503).json({ success: false, error: 'AI service unavailable' });
      }

      if (!azureOpenAIService || !azureOpenAIService.isConfigured()) {
        return res.status(503).json({ success: false, error: 'AI service not configured' });
      }

      const currentUser = await mongoStorage.getUser(req.session.userId!!);
      if (!currentUser) {
        return res.status(401).json({ success: false, error: 'User not found' });
      }

      const project = await mongoStorage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }

      // Allow project owners and admins to request suggestions
      if (project.ownerId._id.toString() !== req.session.userId! && currentUser.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Permission denied' });
      }

      const comments = await mongoStorage.getProjectComments(req.params.id);
      const updates = await mongoStorage.getProjectUpdates(req.params.id);

      const suggestions = await azureOpenAIService.suggestTags({
        title: project.title,
        description: project.description,
        existingTags: project.tags || [],
        updates: updates.map((u: any) => ({ title: u.title, content: u.content, createdAt: new Date(u.createdAt) })),
        comments: comments.map((c: any) => ({ content: c.content, createdAt: new Date(c.createdAt) })),
        maxTags: 10,
      });

      // Persist suggestions to project for convenience (non-authoritative)
      const updated = await mongoStorage.updateProject(req.params.id, {
        aiSuggestedTags: suggestions.map(s => s.tag)
      });

      res.json({ success: true, data: { suggestions, project: updated } });
    } catch (error: any) {
      console.error('Suggest tags error:', error);
      res.status(500).json({ success: false, error: 'Failed to suggest tags' });
    }
  });

  // AI: Improve/Shorten Project Description
  app.post('/api/projects/:id/description/improve', requireAuth, async (req, res) => {
    try {
      let azureOpenAIService;
      try {
        const azureModule = await import('./services/azureOpenAI');
        azureOpenAIService = azureModule.azureOpenAIService;
      } catch (importError) {
        console.error('Failed to import Azure OpenAI modules:', importError);
        return res.status(503).json({ success: false, error: 'AI service unavailable' });
      }

      if (!azureOpenAIService || !azureOpenAIService.isConfigured()) {
        return res.status(503).json({ success: false, error: 'AI service not configured' });
      }

      const currentUser = await mongoStorage.getUser(req.session.userId!!);
      if (!currentUser) {
        return res.status(401).json({ success: false, error: 'User not found' });
      }

      const project = await mongoStorage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }

      // Only owners or admins can run improvements for a project
      if (project.ownerId._id.toString() !== req.session.userId! && currentUser.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Permission denied' });
      }

      const { intent = 'improve', maxWords } = req.body || {};
      const result = await azureOpenAIService.improveDescription({
        title: project.title,
        description: project.description,
        intent,
        maxWords,
      });

      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('Improve description error:', error);
      res.status(500).json({ success: false, error: 'Failed to improve description' });
    }
  });

  // AI: Manually set or regenerate project AI summary (owner/admin), independent of thread summary cache
  app.post('/api/projects/:id/summary/save', requireAuth, async (req, res) => {
    try {
      const currentUser = await mongoStorage.getUser(req.session.userId!!);
      if (!currentUser) {
        return res.status(401).json({ success: false, error: 'User not found' });
      }

      const project = await mongoStorage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }

      if (project.ownerId._id.toString() !== req.session.userId! && currentUser.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Permission denied' });
      }

      const { summary } = req.body || {};
      if (typeof summary !== 'string' || summary.trim().length === 0) {
        return res.status(400).json({ success: false, error: 'Summary is required' });
      }

      const updated = await mongoStorage.updateProject(req.params.id, {
        aiSummary: summary.trim(),
        aiSummaryUpdatedAt: new Date(),
      });

      res.json({ success: true, data: { project: updated } });
    } catch (error: any) {
      console.error('Save AI summary error:', error);
      res.status(500).json({ success: false, error: 'Failed to save AI summary' });
    }
  });

  // Project Share Routes
  app.post('/api/projects/:id/share', async (req, res) => {
    try {
      const { platform } = req.body;
      const userId = req.session.userId!;
      
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
    } catch (error: any) {
      console.error('Record share error:', error);
      res.status(500).json({ success: false, error: 'Failed to record share' });
    }
  });

  // Comment Reaction Routes
  app.post('/api/comments/:id/reaction', requireAuth, async (req, res) => {
    try {
      const { type = 'like' } = req.body;
      console.log('Adding reaction:', { commentId: req.params.id, userId: req.session.userId!, type });
      
      const comment = await Comment.findById(req.params.id);
      if (!comment) {
        return res.status(404).json({ success: false, error: 'Comment not found' });
      }

      await comment.addReaction(new Types.ObjectId(req.session.userId!!), type);
      
      // Create notification for comment author if it's a like
      if (type === 'like') {
        try {
          await Notification.createCommentLikeNotification(
            new Types.ObjectId(req.params.id),
            new Types.ObjectId(req.session.userId!),
            comment.authorId,
            comment.projectId
          );
        } catch (notificationError) {
          console.error('Failed to create comment like notification:', notificationError);
          // Don't fail the request if notification creation fails
        }
      }
      
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
    } catch (error: any) {
      console.error('Add reaction error:', error);
      res.status(500).json({ success: false, error: 'Failed to add reaction' });
    }
  });

  app.delete('/api/comments/:id/reaction', requireAuth, async (req, res) => {
    try {
      console.log('Removing reaction:', { commentId: req.params.id, userId: req.session.userId! });
      
      const comment = await Comment.findById(req.params.id);
      if (!comment) {
        return res.status(404).json({ success: false, error: 'Comment not found' });
      }

      await comment.removeReaction(new Types.ObjectId(req.session.userId!!));
      
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
    } catch (error: any) {
      console.error('Remove reaction error:', error);
      res.status(500).json({ success: false, error: 'Failed to remove reaction' });
    }
  });

  // Project Updates Routes
  app.get('/api/projects/:id/updates', async (req, res) => {
    try {
      const updates = await mongoStorage.getProjectUpdates(req.params.id);
      res.json({ success: true, data: { updates } });
    } catch (error: any) {
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
      if (project.ownerId._id.toString() !== req.session.userId!) {
        return res.status(403).json({ success: false, error: 'Only project owner can post updates' });
      }

      const updateData = {
        ...req.body,
        projectId: req.params.id,
        authorId: req.session.userId!
      };

      const update = await mongoStorage.createProjectUpdate(updateData);
      
      // Create notifications for all project subscribers
      try {
        await Notification.createProjectUpdateNotification(
          new Types.ObjectId(req.params.id),
          update.title,
          new Types.ObjectId(req.session.userId!)
        );
      } catch (notificationError) {
        console.error('Failed to create project update notification:', notificationError);
        // Don't fail the request if notification creation fails
      }
      
      res.status(201).json({ 
        success: true, 
        data: { update },
        message: 'Project update posted successfully' 
      });
    } catch (error: any) {
      console.error('Create project update error:', error);
      res.status(500).json({ success: false, error: 'Failed to create project update' });
    }
  });

  // Project Subscription Routes
  app.post('/api/projects/:id/subscribe', requireAuth, async (req, res) => {
    try {
      const subscribed = await mongoStorage.subscribeToProject(req.session.userId!!, req.params.id);
      if (subscribed) {
        // Create notification for project owner
        try {
          const project = await Project.findById(req.params.id).select('ownerId');
          if (project) {
            await Notification.createNewSubscriberNotification(
              new Types.ObjectId(req.params.id),
              new Types.ObjectId(req.session.userId!),
              project.ownerId
            );
          }
        } catch (notificationError) {
          console.error('Failed to create subscription notification:', notificationError);
          // Don't fail the request if notification creation fails
        }
        
        res.json({ 
          success: true, 
          message: 'Successfully subscribed to project updates' 
        });
      } else {
        res.status(400).json({ success: false, error: 'Failed to subscribe to project' });
      }
    } catch (error: any) {
      console.error('Subscribe to project error:', error);
      res.status(500).json({ success: false, error: 'Failed to subscribe to project' });
    }
  });

  app.delete('/api/projects/:id/subscribe', requireAuth, async (req, res) => {
    try {
      const unsubscribed = await mongoStorage.unsubscribeFromProject(req.session.userId!!, req.params.id);
      if (unsubscribed) {
        res.json({ 
          success: true, 
          message: 'Successfully unsubscribed from project updates' 
        });
      } else {
        res.status(400).json({ success: false, error: 'Failed to unsubscribe from project' });
      }
    } catch (error: any) {
      console.error('Unsubscribe from project error:', error);
      res.status(500).json({ success: false, error: 'Failed to unsubscribe from project' });
    }
  });

  app.get('/api/projects/:id/subscription-status', requireAuth, async (req, res) => {
    try {
      const isSubscribed = await mongoStorage.isSubscribedToProject(req.session.userId!!, req.params.id);
      res.json({ 
        success: true, 
        data: { isSubscribed } 
      });
    } catch (error: any) {
      console.error('Get subscription status error:', error);
      res.status(500).json({ success: false, error: 'Failed to get subscription status' });
    }
  });

  // Category and Tag Routes
  app.get('/api/categories', async (req, res) => {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const categories = await mongoStorage.getCategories(includeInactive);
      res.json({ success: true, data: { categories } });
    } catch (error: any) {
      console.error('Get categories error:', error);
      res.status(500).json({ success: false, error: 'Failed to get categories' });
    }
  });

  app.get('/api/categories/:id', async (req, res) => {
    try {
      const category = await mongoStorage.getCategory(req.params.id);
      if (!category) {
        return res.status(404).json({ success: false, error: 'Category not found' });
      }
      res.json({ success: true, data: { category } });
    } catch (error: any) {
      console.error('Get category error:', error);
      res.status(500).json({ success: false, error: 'Failed to get category' });
    }
  });

  app.post('/api/categories', requireAdmin, async (req, res) => {
    try {
      const categoryData = {
        ...req.body,
        createdBy: req.session.userId!
      };
      const category = await mongoStorage.createCategory(categoryData);
      res.status(201).json({ 
        success: true, 
        data: { category }, 
        message: 'Category created successfully' 
      });
    } catch (error: any) {
      console.error('Create category error:', error);
      res.status(500).json({ success: false, error: 'Failed to create category' });
    }
  });

  app.put('/api/categories/:id', requireAdmin, async (req, res) => {
    try {
      const category = await mongoStorage.updateCategory(req.params.id, req.body);
      if (!category) {
        return res.status(404).json({ success: false, error: 'Category not found' });
      }
      res.json({ 
        success: true, 
        data: { category }, 
        message: 'Category updated successfully' 
      });
    } catch (error: any) {
      console.error('Update category error:', error);
      res.status(500).json({ success: false, error: 'Failed to update category' });
    }
  });

  app.delete('/api/categories/:id', requireAdmin, async (req, res) => {
    try {
      const success = await mongoStorage.deleteCategory(req.params.id);
      if (!success) {
        return res.status(404).json({ success: false, error: 'Category not found' });
      }
      res.json({ 
        success: true, 
        message: 'Category deactivated successfully' 
      });
    } catch (error: any) {
      console.error('Delete category error:', error);
      res.status(500).json({ success: false, error: 'Failed to delete category' });
    }
  });

  app.get('/api/tags/popular', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const tags = await mongoStorage.getPopularTags(limit);
      res.json({ success: true, data: { tags } });
    } catch (error: any) {
      console.error('Get popular tags error:', error);
      res.status(500).json({ success: false, error: 'Failed to get popular tags' });
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
    } catch (error: any) {
      console.error('Get comments error:', error);
      res.status(500).json({ success: false, error: 'Failed to get comments' });
    }
  });

  app.post('/api/projects/:projectId/comments', requireAuth, postLimiter, async (req, res) => {
    try {
      // Normalize large base64 images in markdown: ensure it's a string and under server limits
      if (typeof req.body.content !== 'string' || req.body.content.trim().length === 0) {
        return res.status(400).json({ success: false, error: 'Content is required' });
      }
      // Convert any embedded data:image base64 to saved files with stable /uploads URLs
      const originalContent: string = req.body.content;
      const dataImgRegex = /!\[[^\]]*\]\((data:image\/[a-zA-Z0-9.+-]+;base64,[^)]+)\)/g;
      let match: RegExpExecArray | null;
      let processedContent = originalContent;
      const seen = new Set<string>();
      while ((match = dataImgRegex.exec(originalContent)) !== null) {
        const dataUrl = match[1];
        if (seen.has(dataUrl)) continue;
        seen.add(dataUrl);
        try {
          const [meta, base64Data] = dataUrl.split(',');
          const mime = meta.substring(meta.indexOf(':') + 1, meta.indexOf(';')) || 'image/jpeg';
          const ext = mime.split('/')[1] || 'jpg';
          const buffer = Buffer.from(base64Data, 'base64');
          const uniqueName = generateUniqueFilename(`comment_${Date.now()}.${ext}`);
          await saveFileToDisk(buffer, uniqueName);
          const url = getFileUrl(uniqueName);
          processedContent = processedContent.replaceAll(dataUrl, url);
        } catch (e) {
          // If conversion fails, keep original content (may exceed DB max length otherwise)
        }
      }
      req.body.content = processedContent;

      const commentData = {
        ...req.body,
        projectId: req.params.projectId,
        authorId: req.session.userId!
      };

      const comment = await mongoStorage.createComment(commentData);

      // Spam filtering after creation (so we can reference comment ID)
      try {
        const text = (comment.content || '').toLowerCase();
        const hasManyLinks = (text.match(/https?:\/\//g) || []).length >= 3;
        const forbidden = /free money|buy now|viagra|crypto|sex|porn|casino/i.test(text);
        let aiScore: number | undefined;
        try {
          const ai = await azureOpenAIService.classifyContentModeration(text);
          aiScore = ai.score;
        } catch {}
        if (hasManyLinks || forbidden || (aiScore !== undefined && aiScore > 0.8)) {
          await Report.create({
            reporterId: new Types.ObjectId(req.session.userId! as string),
            targetType: 'comment',
            targetId: new Types.ObjectId(comment._id),
            reason: 'spam',
            details: 'Auto-flagged by spam filter',
            autoFlagged: true,
            status: 'pending',
            scores: { heuristicScore: hasManyLinks || forbidden ? 0.9 : undefined, aiScore },
          });
        }
      } catch (e) {
        console.warn('Auto spam report failed:', e);
      }
      
      // Create notifications
      try {
        // If it's a reply to another comment, notify the parent comment author
        if (req.body.parentCommentId) {
          await Notification.createCommentReplyNotification(
            comment._id!,
            new Types.ObjectId(req.body.parentCommentId),
            new Types.ObjectId(req.session.userId!!),
            new Types.ObjectId(req.params.projectId)
          );
        } else {
          // If it's a new top-level comment, notify the project owner
          const project = await Project.findById(req.params.projectId).select('ownerId title');
          if (project) {
            await Notification.createNewCommentNotification(
              comment._id!,
              new Types.ObjectId(req.session.userId!!),
              new Types.ObjectId(req.params.projectId),
              project.ownerId
            );

            // Send owner an email (no actor name) if verified
            try {
              const owner = await User.findById(project.ownerId).select('email emailVerified');
              if (owner?.email && owner.emailVerified) {
                const baseUrl = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
                const viewUrl = `${baseUrl}/forum/project/${req.params.projectId}`;
                const html = buildCommentNotificationEmailHtml({ projectTitle: (project as any).title || 'Your project', viewUrl });
                await sendEmailViaSES({
                  to: owner.email,
                  subject: 'New comment on your project',
                  html,
                  text: `Someone commented on your project. View it: ${viewUrl}`,
                });
              }
            } catch (emailErr) {
              console.warn('Comment email notify failed:', emailErr);
            }
          }
        }
      } catch (notificationError) {
        console.error('Failed to create comment notification:', notificationError);
        // Don't fail the request if notification creation fails
      }
      
      res.status(201).json({ 
        success: true, 
        data: { comment },
        message: 'Comment created successfully' 
      });
    } catch (error: any) {
      console.error('Create comment error:', error);
      res.status(500).json({ success: false, error: 'Failed to create comment' });
    }
  });

  // Update comment (for comment authors)
  app.put('/api/comments/:id', requireAuth, async (req, res) => {
    try {
      const currentUser = await mongoStorage.getUser(req.session.userId!!);
      if (!currentUser) {
        return res.status(401).json({ success: false, error: 'User not found' });
      }

      const { content } = req.body;
      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return res.status(400).json({ success: false, error: 'Comment content is required' });
      }

      if (content.length > 2000) {
        return res.status(400).json({ success: false, error: 'Comment content too long (max 2000 characters)' });
      }

      const updatedComment = await mongoStorage.updateComment(req.params.id, content.trim(), req.session.userId!);
      if (!updatedComment) {
        return res.status(404).json({ success: false, error: 'Comment not found or permission denied' });
      }

      res.json({ 
        success: true,
        data: { comment: updatedComment },
        message: 'Comment updated successfully' 
      });
    } catch (error: any) {
      console.error('Update comment error:', error);
      res.status(500).json({ success: false, error: 'Failed to update comment' });
    }
  });

  app.delete('/api/comments/:id', requireAuth, async (req, res) => {
    try {
      const currentUser = await mongoStorage.getUser(req.session.userId!!);
      if (!currentUser) {
        return res.status(401).json({ success: false, error: 'User not found' });
      }

      const deleted = await mongoStorage.deleteComment(req.params.id, req.session.userId!);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Comment not found or permission denied' });
      }

      res.json({ 
        success: true, 
        message: 'Comment deleted successfully' 
      });
    } catch (error: any) {
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
    } catch (error: any) {
      console.error('Admin delete comment error:', error);
      res.status(500).json({ success: false, error: 'Failed to delete comment' });
    }
  });

  // Admin - delete list item
  app.delete('/api/admin/list-items/:id', requireAdmin, async (req, res) => {
    try {
      const itemId = req.params.id;

      // Find the list item
      const listItem = await ListItem.findById(itemId);
      if (!listItem) {
        return res.status(404).json({ success: false, error: 'List item not found' });
      }

      // Check if already deleted
      if (listItem.status === 'deleted') {
        return res.status(400).json({ success: false, error: 'List item already deleted' });
      }

      // Soft delete the item
      await ListItem.findByIdAndUpdate(itemId, {
        status: 'deleted',
        lastEditedBy: req.currentUser._id
      });

      // Update parent list analytics
      await List.findByIdAndUpdate(listItem.listId, {
        $inc: { 'analytics.totalItems': -1 },
        $set: { 'analytics.lastActivity': new Date() }
      });

      res.json({
        success: true,
        message: 'List item deleted by admin successfully'
      });
    } catch (error: any) {
      console.error('Admin delete list item error:', error);
      res.status(500).json({ success: false, error: 'Failed to delete list item' });
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
    } catch (error: any) {
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
    } catch (error: any) {
      console.error('Get event error:', error);
      res.status(500).json({ success: false, error: 'Failed to get event' });
    }
  });

  // User search (for DM picker and group creation) - authenticated, limited fields, better ranking
  // This route must come BEFORE all /api/users/:id routes to avoid conflicts
  app.get('/api/users/search', requireAuth, async (req, res) => {
    try {
      const q = (req.query.q as string) || '';
      const limit = Math.min(parseInt((req.query.limit as string) || '10', 10), 50);
      const currentUserId = new Types.ObjectId(req.session.userId!);

      // use top-level escapeRegex

      if (!q) {
        // default: all users (excluding self) for group creation
        const users = await User.find({ _id: { $ne: currentUserId } })
          .select('username fullName profileImage')
          .sort({ lastLoginAt: -1, createdAt: -1 })
          .limit(limit);
        return res.json({ success: true, data: { items: users } });
      }

      const safe = escapeRegex(q);
      const pipeline = [
        { $match: { _id: { $ne: currentUserId }, $or: [
          { username: { $regex: safe, $options: 'i' } },
          { fullName: { $regex: safe, $options: 'i' } },
          { email: { $regex: safe, $options: 'i' } },
        ] } },
        { $addFields: {
          usernamePrefix: { $regexMatch: { input: '$username', regex: new RegExp('^' + safe, 'i') } },
          fullNamePrefix: { $regexMatch: { input: '$fullName', regex: new RegExp('^' + safe, 'i') } },
        } },
        { $sort: { usernamePrefix: -1, fullNamePrefix: -1, lastLoginAt: -1, createdAt: -1 } },
        { $limit: limit },
        { $project: { username: 1, fullName: 1, profileImage: 1 } },
      ];

      const users = await User.aggregate(pipeline as any);
      res.json({ success: true, data: { items: users } });
    } catch (error: any) {
      console.error('User search error:', error);
      res.status(500).json({ success: false, error: 'Failed to search users' });
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
    } catch (error: any) {
      console.error('Get user error:', error);
      res.status(500).json({ success: false, error: 'Failed to get user' });
    }
  });

  // Gamification: user contribution metrics
  app.get('/api/users/:id/metrics', async (req, res) => {
    try {
      const user = await User.findById(req.params.id).select('statistics streaks badges createdAt');
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      const ownedProjects = await Project.find({ ownerId: user._id, isDeleted: false }).select('analytics likes');
      const totalLikesReceived = ownedProjects.reduce((sum, p: any) => sum + (p.analytics?.totalLikes || (p.likes?.length || 0)), 0);
      const totalViews = ownedProjects.reduce((sum, p: any) => sum + (p.analytics?.views || 0), 0);
      const data = {
        statistics: user.statistics,
        streaks: user.streaks,
        badges: (user as any).badges || [],
        totals: {
          totalLikesReceived,
          totalViews,
        }
      };
      res.json({ success: true, data });
    } catch (error: any) {
      console.error('Get user metrics error:', error);
      res.status(500).json({ success: false, error: 'Failed to get user metrics' });
    }
  });

  // Gamification: leaderboard (contributors)
  app.get('/api/leaderboard', async (req, res) => {
    try {
      const period = parseInt((req.query.period as string) || '30');
      const limit = parseInt((req.query.limit as string) || '10');
      const items = await mongoStorage.getContributorLeaderboard(period, limit);
      // Optionally award "Top Contributor" badges to top 3
      try {
        const top = items.slice(0, Math.min(3, items.length));
        for (const entry of top) {
          await User.findByIdAndUpdate(entry.userId, {
            $addToSet: {
              badges: {
                key: 'top_contributor',
                name: 'Top Contributor',
                description: `Ranked among top contributors in the last ${period} days`,
                icon: 'star',
                awardedAt: new Date(),
              }
            }
          });
        }
      } catch (e) {
        // ignore badge failures
      }
      res.json({ success: true, data: { items } });
    } catch (error: any) {
      console.error('Get leaderboard error:', error);
      res.status(500).json({ success: false, error: 'Failed to get leaderboard' });
    }
  });

  // Gamification: badges for a user
  app.get('/api/users/:id/badges', async (req, res) => {
    try {
      const user = await User.findById(req.params.id).select('badges');
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      res.json({ success: true, data: { badges: (user as any).badges || [] } });
    } catch (error: any) {
      console.error('Get user badges error:', error);
      res.status(500).json({ success: false, error: 'Failed to get badges' });
    }
  });

  // Follow a user
  app.post('/api/users/:id/follow', requireAuth, async (req, res) => {
    try {
      const targetUserId = req.params.id;
      const followerId = req.session.userId!;
      const ok = await mongoStorage.followUser(followerId, targetUserId);
      if (!ok) return res.status(400).json({ success: false, error: 'Unable to follow user' });
      res.json({ success: true });
    } catch (error: any) {
      console.error('Follow user error:', error);
      res.status(500).json({ success: false, error: 'Failed to follow user' });
    }
  });

  // Unfollow a user
  app.delete('/api/users/:id/follow', requireAuth, async (req, res) => {
    try {
      const targetUserId = req.params.id;
      const followerId = req.session.userId!;
      const ok = await mongoStorage.unfollowUser(followerId, targetUserId);
      if (!ok) return res.status(400).json({ success: false, error: 'Unable to unfollow user' });
      res.json({ success: true });
    } catch (error: any) {
      console.error('Unfollow user error:', error);
      res.status(500).json({ success: false, error: 'Failed to unfollow user' });
    }
  });

  // Followers list (respects privacy)
  app.get('/api/users/:id/followers', async (req, res) => {
    try {
      const users = await mongoStorage.getFollowers(req.params.id);
      res.json({ success: true, data: { users } });
    } catch (error: any) {
      console.error('Get followers error:', error);
      res.status(500).json({ success: false, error: 'Failed to get followers' });
    }
  });

  // Following list (respects privacy)
  app.get('/api/users/:id/following', async (req, res) => {
    try {
      const users = await mongoStorage.getFollowing(req.params.id);
      res.json({ success: true, data: { users } });
    } catch (error: any) {
      console.error('Get following error:', error);
      res.status(500).json({ success: false, error: 'Failed to get following' });
    }
  });

  // Personalized feed
  app.get('/api/feed/personalized', requireAuth, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const result = await mongoStorage.getPersonalizedFeed(req.session.userId!, { page, limit });
      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('Get personalized feed error:', error);
      res.status(500).json({ success: false, error: 'Failed to get personalized feed' });
    }
  });

  // Recommendations for current user
  app.get('/api/projects/recommended', requireAuth, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 12;
      const projects = await mongoStorage.getRecommendedProjects(req.session.userId!, limit);
      res.json({ success: true, data: { projects } });
    } catch (error: any) {
      console.error('Get recommended projects error:', error);
      res.status(500).json({ success: false, error: 'Failed to get recommended projects' });
    }
  });

  app.put('/api/users/:id', requireAuth, async (req, res) => {
    try {
      console.log('Update user request:', {
        userId: req.params.id,
        sessionUserId: req.session.userId!,
        body: req.body
      });

      // Users can only update their own profile, unless they're admin
      const currentUser = await mongoStorage.getUser(req.session.userId!!);
      if (!currentUser) {
        return res.status(401).json({ success: false, error: 'User not found' });
      }
      
      if (req.params.id !== req.session.userId! && currentUser.role !== 'admin') {
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
    } catch (error: any) {
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

  // Onboarding & UI tips: mark tour complete, dismiss tips, save dashboard pins
  app.post('/api/users/:id/onboarding/complete', requireAuth, async (req, res) => {
    try {
      if (req.params.id !== req.session.userId!) return res.status(403).json({ success: false, error: 'Permission denied' });
      const { stepsCompleted = [], version = 1 } = req.body || {};
      const user = await User.findByIdAndUpdate(req.params.id, {
        onboarding: { completed: true, version, stepsCompleted, completedAt: new Date() }
      }, { new: true });
      if (!user) return res.status(404).json({ success: false, error: 'User not found' });
      res.json({ success: true, data: { user } });
    } catch (e) {
      res.status(500).json({ success: false, error: 'Failed to save onboarding' });
    }
  });

  app.post('/api/users/:id/ui-tips/dismiss', requireAuth, async (req, res) => {
    try {
      if (req.params.id !== req.session.userId!) return res.status(403).json({ success: false, error: 'Permission denied' });
      const { tipId } = req.body || {};
      if (!tipId) return res.status(400).json({ success: false, error: 'tipId required' });
      const user = await User.findByIdAndUpdate(req.params.id, { $addToSet: { 'uiTips.dismissed': tipId } }, { new: true });
      if (!user) return res.status(404).json({ success: false, error: 'User not found' });
      res.json({ success: true, data: { user } });
    } catch (e) {
      res.status(500).json({ success: false, error: 'Failed to dismiss tip' });
    }
  });

  app.post('/api/users/:id/dashboard/pins', requireAuth, async (req, res) => {
    try {
      if (req.params.id !== req.session.userId!) return res.status(403).json({ success: false, error: 'Permission denied' });
      const { pinnedProjectIds = [], pinnedStats = [], layout } = req.body || {};
      const user = await User.findByIdAndUpdate(req.params.id, {
        dashboardPreferences: {
          pinnedProjectIds,
          pinnedStats,
          layout: ['standard','compact','cards'].includes(layout) ? layout : 'standard'
        }
      }, { new: true });
      if (!user) return res.status(404).json({ success: false, error: 'User not found' });
      res.json({ success: true, data: { user } });
    } catch (e) {
      res.status(500).json({ success: false, error: 'Failed to save dashboard preferences' });
    }
  });

  // AI: UI personalization (theme/layout suggestion)
  app.post('/api/ai/personalize-ui', requireAuth, async (req, res) => {
    try {
      const { azureOpenAIService } = await import('./services/azureOpenAI');
      const usageSignals = Array.isArray(req.body?.usageSignals) ? req.body.usageSignals : [];
      const preferences = req.body?.preferences || {};
      const current = req.body?.current || {};
      const suggestion = await azureOpenAIService.suggestThemeAndLayout({ usageSignals, preferences, current });
      // Persist last suggestion on user
      await User.findByIdAndUpdate(req.session.userId!, { lastAiPersonalization: { ...suggestion, generatedAt: new Date() } });
      res.json({ success: true, data: suggestion });
    } catch (e: any) {
      console.error('AI personalize error:', e);
      res.status(200).json({ success: true, data: { preset: 'default', accentColor: 'blue', mode: 'system', layout: 'standard' } });
    }
  });

  app.get('/api/users/:id/subscriptions', requireAuth, async (req, res) => {
    try {
      // Users can only view their own subscriptions, unless they're admin
      const currentUser = await mongoStorage.getUser(req.session.userId!!);
      if (!currentUser) {
        return res.status(401).json({ success: false, error: 'User not found' });
      }
      
      if (req.params.id !== req.session.userId! && currentUser.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Permission denied' });
      }

      const projects = await mongoStorage.getUserSubscriptions(req.params.id);
      res.json({ 
        success: true, 
        data: { projects },
        message: 'User subscriptions retrieved successfully' 
      });
    } catch (error: any) {
      console.error('Get user subscriptions error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get user subscriptions' 
      });
    }
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'API is healthy', timestamp: new Date().toISOString() });
  });

  // File Upload Routes - Enhanced to handle all file types
  app.post('/api/upload/files', requireAuth, upload.array('files', 15), async (req, res) => {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ success: false, error: 'No files uploaded' });
      }

      const uploadedFiles = [];

      for (const file of req.files) {
        const fileCategory = getFileCategory(file.mimetype);
        const uniqueFilename = generateUniqueFilename(file.originalname);
        
        let fileData;
        let filePath;
        
        if (fileCategory === 'image') {
          // For images, try S3 first, then fallback to disk
          console.log('🔧 S3 Debug - isConfigured():', s3Storage.isConfigured(), 'AWS_S3_BUCKET:', process.env.AWS_S3_BUCKET);
          if (s3Storage.isConfigured()) {
            const s3Result = await s3Storage.uploadFile(file.buffer, uniqueFilename, file.mimetype, file.originalname);
            filePath = s3Result.url;
            fileData = filePath;
          } else {
            await saveFileToDisk(file.buffer, uniqueFilename);
            filePath = getFileUrl(uniqueFilename);
            fileData = filePath;
          }
        } else {
          // For documents and other files, try S3 first, then fallback to disk
          if (s3Storage.isConfigured()) {
            const s3Result = await s3Storage.uploadFile(file.buffer, uniqueFilename, file.mimetype, file.originalname);
            filePath = s3Result.url;
            fileData = filePath;
          } else {
            filePath = await saveFileToDisk(file.buffer, uniqueFilename);
            fileData = getFileUrl(uniqueFilename);
          }
        }
        
        uploadedFiles.push({
          type: fileCategory === 'image' ? 'image' : fileCategory,
          filename: uniqueFilename,
          originalName: file.originalname,
          data: fileCategory === 'image' ? undefined : undefined,
          url: fileData,
          size: file.size,
          mimetype: file.mimetype,
          category: fileCategory,
          icon: getFileIcon(file.mimetype)
        });
      }

      res.json({ 
        success: true, 
        data: { files: uploadedFiles },
        message: `${uploadedFiles.length} file(s) processed successfully` 
      });
    } catch (error: any) {
      console.error('File upload error:', error);
      res.status(500).json({ success: false, error: 'Failed to process files' });
    }
  });

  // Legacy route for backward compatibility
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
    } catch (error: any) {
      console.error('File upload error:', error);
      res.status(500).json({ success: false, error: 'Failed to process files' });
    }
  });

  // Process pre-compressed images (already in Base64 format)
  app.post('/api/upload/processed-images', requireAuth, async (req, res) => {
    try {
      const { images } = req.body;
      
      if (!images || !Array.isArray(images) || images.length === 0) {
        return res.status(400).json({ success: false, error: 'No images provided' });
      }

      const savedImages = [] as Array<{ filename: string; originalName: string; url: string; size: number; mimetype: string }>;

      for (let index = 0; index < images.length; index++) {
        const image = images[index];
        if (!image.data || !image.data.startsWith('data:image/')) {
          throw new Error(`Invalid image data format at index ${index}`);
        }
        if (!image.filename || !image.originalName || !image.mimetype) {
          throw new Error(`Missing required fields at index ${index}`);
        }

        const base64Data = image.data.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        const extFromMime = image.mimetype.split('/')[1] || 'jpg';
        const uniqueFilename = generateUniqueFilename(
          image.originalName.endsWith(`.${extFromMime}`)
            ? image.originalName
            : `${image.originalName}.${extFromMime}`
        );
        // Prefer S3 when configured, otherwise fall back to local disk
        let url: string;
        let size = image.size || buffer.byteLength;
        try {
          if (s3Storage.isConfigured()) {
            // Debug info to verify S3 path is taken
            console.log('🔧 S3 Debug (processed-images) - isConfigured():', s3Storage.isConfigured(), 'AWS_S3_BUCKET:', process.env.AWS_S3_BUCKET);
            const s3Result = await s3Storage.uploadFile(buffer, uniqueFilename, image.mimetype, image.originalName);
            url = s3Result.url;
            size = size || buffer.byteLength;
          } else {
            await saveFileToDisk(buffer, uniqueFilename);
            url = getFileUrl(uniqueFilename);
          }
        } catch (e) {
          console.error('S3 upload failed, falling back to local disk for processed-images:', (e as any)?.message || e);
          await saveFileToDisk(buffer, uniqueFilename);
          url = getFileUrl(uniqueFilename);
        }

        savedImages.push({
          filename: uniqueFilename,
          originalName: image.originalName,
          url,
          size,
          mimetype: image.mimetype,
        });
      }

      res.json({ 
        success: true, 
        data: { files: savedImages },
        message: `${savedImages.length} processed images saved` 
      });
    } catch (error: any) {
      console.error('Processed images upload error:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to process images' });
    }
  });

  // File download route
  app.get('/api/download/:filename', async (req, res) => {
    try {
      const { filename } = req.params;
      const uploadsDir = path.join(__dirname, '../uploads');
      const filePath = path.join(uploadsDir, filename);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, error: 'File not found' });
      }
      
      // Update download count in database (optional)
      // This would require finding the project with this file and incrementing the count
      
      // Send the file
      res.download(filePath, (err) => {
        if (err) {
          console.error('File download error:', err);
          res.status(500).json({ success: false, error: 'Failed to download file' });
        }
      });
    } catch (error: any) {
      console.error('Download error:', error);
      res.status(500).json({ success: false, error: 'Failed to download file' });
    }
  });

  // Serve uploaded files from S3 (or local fallback)
  app.get('/uploads/:filename', async (req, res) => {
    try {
      const { filename } = req.params;
      
      // Try S3 first if configured
      if (s3Storage.isConfigured()) {
        try {
          const { stream, contentType, contentLength, lastModified } = await s3Storage.getFileStream(filename);
          
          // Set appropriate headers
          res.set({
            'Content-Type': contentType,
            'Content-Length': contentLength.toString(),
            'Last-Modified': lastModified.toUTCString(),
            'Cache-Control': 'public, max-age=31536000', // 1 year cache
            'ETag': `"${filename}-${lastModified.getTime()}"`,
          });
          
          // Stream the file
          stream.pipe(res);
          return;
        } catch (s3Error) {
          console.warn('S3 file not found, trying local fallback:', filename);
        }
      }
      
      // Fallback to local filesystem
      const localPath = path.join(__dirname, '../uploads', filename);
      if (fs.existsSync(localPath)) {
        return res.sendFile(localPath);
      }
      
      // File not found anywhere
      res.status(404).json({ error: 'File not found' });
    } catch (error) {
      console.error('Error serving file:', error);
      res.status(500).json({ error: 'Internal server error' });
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
      
    } catch (error: any) {
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
      const user = await mongoStorage.getUser(req.session.userId!);
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

    } catch (error: any) {
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
      const userActivitiesData = await UserActivity.find()
        .sort({ date: -1 })
        .limit(10)
        .populate('userId', 'username')
        .select('activities date userId');
        
      console.log('📊 Recent activity raw:', userActivitiesData);

      // Flatten activities and format them
      const recentActivity = [];
      for (const userActivity of userActivitiesData) {
        for (const activity of userActivity.activities) {
          recentActivity.push({
            _id: activity.relatedId,
            action: activity.type.replace(/_/g, ' '),
            details: `${activity.type.replace(/_/g, ' ')} activity`,
            timestamp: activity.timestamp || userActivity.date,
            userId: userActivity.userId
          });
        }
      }
      
      // Sort by timestamp and limit to 10 most recent
      recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      const limitedActivity = recentActivity.slice(0, 10);

      const formattedActivity = limitedActivity.map(activity => ({
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

    } catch (error: any) {
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
    } catch (error: any) {
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

    } catch (error: any) {
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

    } catch (error: any) {
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

    } catch (error: any) {
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

    } catch (error: any) {
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

    } catch (error: any) {
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

      const userActivitiesData = await UserActivity.find()
        .sort({ date: -1 })
        .limit(limit)
        .populate('userId', 'username')
        .select('activities date userId');

      // Flatten activities and format them
      const activities = [];
      for (const userActivity of userActivitiesData) {
        for (const activity of userActivity.activities) {
          activities.push({
            _id: activity.relatedId,
            action: activity.type.replace(/_/g, ' '),
            details: `${activity.type.replace(/_/g, ' ')} activity`,
            timestamp: activity.timestamp || userActivity.date,
            userId: userActivity.userId
          });
        }
      }
      
      // Sort by timestamp and limit
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      const limitedActivities = activities.slice(0, limit);

      const formattedActivities = limitedActivities.map(activity => ({
        id: activity._id.toString(),
        action: activity.action,
        details: activity.details,
        timestamp: activity.timestamp instanceof Date ? activity.timestamp.toISOString() : new Date(activity.timestamp).toISOString(),
        user: (activity.userId as any)?.username || 'System'
      }));

      res.json({
        success: true,
        data: formattedActivities
      });

    } catch (error: any) {
      console.error('Recent activity error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch recent activity'
      });
    }
  });

  // ================================
  // NOTIFICATION ROUTES
  // ================================

  // Get user's notifications
  app.get('/api/notifications', requireAuth, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const includeRead = req.query.includeRead === 'true';

      const filter: any = { recipientId: req.session.userId! };
      if (!includeRead) {
        filter.read = false;
      }

      const skip = (page - 1) * limit;

      const [notifications, total] = await Promise.all([
        Notification.find(filter)
          .populate('relatedUser', 'username fullName profileImage')
          .populate('relatedProject', 'title')
          .populate('relatedEvent', 'title startDateTime')
          .populate('relatedComment', 'content')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Notification.countDocuments(filter)
      ]);

      const totalPages = Math.ceil(total / limit);

      res.json({
        success: true,
        data: {
          notifications,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
          }
        }
      });
    } catch (error: any) {
      console.error('Get notifications error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get notifications'
      });
    }
  });

  // Get unread notification count
  app.get('/api/notifications/unread/count', requireAuth, async (req, res) => {
    try {
      const count = await Notification.countDocuments({
        recipientId: req.session.userId!,
        read: false
      });

      res.json({
        success: true,
        data: { count }
      });
    } catch (error: any) {
      console.error('Get unread count error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get unread count'
      });
    }
  });

  // Mark single notification as read
  app.put('/api/notifications/:id/read', requireAuth, async (req, res) => {
    try {
      const notification = await Notification.findOne({
        _id: req.params.id,
        recipientId: req.session.userId!
      });

      if (!notification) {
        return res.status(404).json({
          success: false,
          error: 'Notification not found'
        });
      }

      await notification.markAsRead();

      res.json({
        success: true,
        data: { notification },
        message: 'Notification marked as read'
      });
    } catch (error: any) {
      console.error('Mark notification read error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to mark notification as read'
      });
    }
  });

  // Mark all notifications as read for user
  app.put('/api/notifications/mark-all-read', requireAuth, async (req, res) => {
    try {
      const result = await Notification.markAllAsRead(new Types.ObjectId(req.session.userId!));

      res.json({
        success: true,
        data: { modifiedCount: result.modifiedCount },
        message: 'All notifications marked as read'
      });
    } catch (error: any) {
      console.error('Mark all notifications read error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to mark all notifications as read'
      });
    }
  });

  // Delete single notification
  app.delete('/api/notifications/:id', requireAuth, async (req, res) => {
    try {
      const result = await Notification.deleteOne({
        _id: req.params.id,
        recipientId: req.session.userId!
      });

      if (result.deletedCount === 0) {
        return res.status(404).json({
          success: false,
          error: 'Notification not found'
        });
      }

      res.json({
        success: true,
        message: 'Notification deleted'
      });
    } catch (error: any) {
      console.error('Delete notification error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete notification'
      });
    }
  });

  // ================================
  // USER DASHBOARD ROUTES
  // ================================

  // Get user dashboard data
  app.get('/api/dashboard', requireAuth, async (req, res) => {
    try {
      const userId = new Types.ObjectId(req.session.userId!);
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Get user's projects with analytics
      const userProjects = await Project.find({ 
        ownerId: userId,
        $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }]
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('title description status analytics likes createdAt updatedAt');

      // Get projects user has liked
      const likedProjects = await Project.find({ 
        likes: userId,
        $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }]
      })
        .populate('ownerId', 'username fullName')
        .sort({ createdAt: -1 })
        .limit(5)
        .select('title ownerId analytics.totalLikes createdAt');

      // Get projects user is subscribed to
      const subscriptions = await mongoStorage.getUserSubscriptions(req.session.userId!);

      // Get user's recent comments
      const recentComments = await Comment.find({ authorId: userId })
        .populate('projectId', 'title')
        .sort({ createdAt: -1 })
        .limit(10)
        .select('content projectId createdAt reactions');

      // Get user's unread notifications count
      const unreadNotificationsCount = await Notification.countDocuments({
        recipientId: userId,
        read: false
      });

      // Calculate user statistics
      const totalProjectsCreated = await Project.countDocuments({ 
        ownerId: userId,
        $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }]
      });
      
      const totalCommentsPosted = await Comment.countDocuments({ authorId: userId });
      
      const totalLikesReceived = await Project.aggregate([
        { $match: { ownerId: userId, $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] } },
        { $group: { _id: null, totalLikes: { $sum: '$analytics.totalLikes' } } }
      ]);

      const totalProjectViews = await Project.aggregate([
        { $match: { ownerId: userId, $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] } },
        { $group: { _id: null, totalViews: { $sum: '$analytics.views' } } }
      ]);

      // Get user's activity timeline
      const userActivities = await UserActivity.find({ userId })
        .sort({ date: -1 })
        .limit(10)
        .select('activities date');
      
      // Flatten activities and format them
      const recentActivity = [];
      for (const userActivity of userActivities) {
        for (const activity of userActivity.activities) {
          recentActivity.push({
            _id: activity.relatedId,
            action: activity.type.replace(/_/g, ' '),
            details: `${activity.type.replace(/_/g, ' ')} activity`,
            timestamp: activity.timestamp || userActivity.date
          });
        }
      }
      
      // Sort by timestamp and limit to 10 most recent
      recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      const limitedRecentActivity = recentActivity.slice(0, 10);

      // Format projects with additional stats
      const projectsWithStats = userProjects.map(project => ({
        ...project.toObject(),
        totalLikes: project.analytics?.totalLikes || 0,
        totalViews: project.analytics?.views || 0,
        totalComments: project.analytics?.totalComments || 0,
        isLiked: project.likes?.includes(userId) || false
      }));

      const dashboardData = {
        user: {
          ...user.toObject(),
          password: undefined // Remove password from response
        },
        projects: {
          owned: projectsWithStats,
          liked: likedProjects,
          subscribed: subscriptions
        },
        recentComments,
        statistics: {
          totalProjectsCreated,
          totalCommentsPosted,
          totalLikesReceived: totalLikesReceived[0]?.totalLikes || 0,
          totalProjectViews: totalProjectViews[0]?.totalViews || 0,
          unreadNotifications: unreadNotificationsCount
        },
        recentActivity: limitedRecentActivity.map(activity => ({
          id: activity._id.toString(),
          action: activity.action,
          details: activity.details,
          timestamp: activity.timestamp,
          type: activity.action?.includes('project') ? 'project' :
                activity.action?.includes('comment') ? 'comment' :
                activity.action?.includes('like') ? 'like' : 'general'
        }))
      };

      res.json({
        success: true,
        data: dashboardData
      });

    } catch (error: any) {
      console.error('Dashboard data error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get dashboard data'
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

    } catch (error: any) {
      console.error('Health check error:', error);
      res.status(500).json({
        success: false,
        error: 'Health check failed'
      });
    }
  });

  // Note: File serving moved to main /uploads/:filename route above



  // List users (for DM dropdown) - authenticated, paginated, minimal fields
  app.get('/api/users', requireAuth, async (req, res) => {
    try {
      const page = Math.max(parseInt(req.query.page as string) || 1, 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 1000);
      const search = (req.query.search as string) || '';

      const filter: any = {};
      if (search) {
        filter.$or = [
          { username: { $regex: search, $options: 'i' } },
          { fullName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ];
      }

      const skip = (page - 1) * limit;
      const [users, total] = await Promise.all([
        User.find(filter)
          .select('username fullName profileImage')
          .sort({ fullName: 1, username: 1 })
          .skip(skip)
          .limit(limit),
        User.countDocuments(filter),
      ]);

      const totalPages = Math.ceil(total / limit);
      res.json({
        success: true,
        data: {
          items: users,
          pagination: { page, limit, total, totalPages },
        },
      });
    } catch (error: any) {
      console.error('Users list error:', error);
      res.status(500).json({ success: false, error: 'Failed to list users' });
    }
  });

  // Resolve user by exact username (case-insensitive)
  app.get('/api/users/resolve', requireAuth, async (req, res) => {
    try {
      const username = (req.query.username as string) || '';
      if (!username) return res.status(400).json({ success: false, error: 'username required' });
      const user = await User.findOne({ username: { $regex: `^${username}$`, $options: 'i' } })
        .select('username fullName profileImage');
      if (!user) return res.status(404).json({ success: false, error: 'User not found' });
      res.json({ success: true, data: { user } });
    } catch (error: any) {
      console.error('Resolve user error:', error);
      res.status(500).json({ success: false, error: 'Failed to resolve user' });
    }
  });

  // Recent contacts from conversations for quick DM suggestions
  app.get('/api/conversations/recent-contacts', requireAuth, async (req, res) => {
    try {
      const userId = new Types.ObjectId(req.session.userId!);
      const conversations = await Conversation.find({ participants: userId })
        .sort({ lastMessageAt: -1 })
        .limit(20)
        .select('participants');

      const otherIds = Array.from(new Set(
        conversations.flatMap(c => c.participants.map(p => p.toString())).filter(id => id !== userId.toString())
      )).map(id => new Types.ObjectId(id));

      const users = await User.find({ _id: { $in: otherIds } })
        .select('username fullName profileImage');

      res.json({ success: true, data: { items: users } });
    } catch (error: any) {
      console.error('Recent contacts error:', error);
      res.status(500).json({ success: false, error: 'Failed to get recent contacts' });
    }
  });

  // ================================
  // CHAT: Conversations & Messages
  // ================================

  // List user's conversations
  app.get('/api/conversations', requireAuth, async (req, res) => {
    try {
      const userId = new Types.ObjectId(req.session.userId!);
      const conversations = await Conversation.find({ participants: userId })
        .sort({ lastMessageAt: -1, updatedAt: -1 })
        .limit(100)
        .populate('participants', 'username fullName profileImage');
      res.json({ success: true, data: { conversations } });
    } catch (error: any) {
      console.error('List conversations error:', error);
      res.status(500).json({ success: false, error: 'Failed to list conversations' });
    }
  });

  // Get a single conversation with participant details
  app.get('/api/conversations/:id', requireAuth, async (req, res) => {
    try {
      const userId = new Types.ObjectId(req.session.userId!);
      const conversationId = new Types.ObjectId(req.params.id);
      const convo = await Conversation.findById(conversationId)
        .populate('participants', 'username fullName profileImage');
      if (!convo || !convo.participants.some((p: any) => p.equals ? p.equals(userId) : String(p._id) === String(userId))) {
        return res.status(403).json({ success: false, error: 'Forbidden' });
      }
      res.json({ success: true, data: { conversation: convo } });
    } catch (error: any) {
      console.error('Get conversation error:', (error as any)?.message || error);
      res.status(500).json({ success: false, error: 'Failed to get conversation' });
    }
  });

  // Create a conversation (dm/group/project)
  // For type === 'dm', if a conversation between the two users already exists, return it instead of creating a new one
  app.post('/api/conversations', requireAuth, async (req, res) => {
    try {
      const { type, name, description, participants = [], projectId } = req.body || {};

      if (!['dm', 'group', 'project'].includes(type)) {
        return res.status(400).json({ success: false, error: 'Invalid conversation type' });
      }

      const creatorId = new Types.ObjectId(req.session.userId!);
      const participantIds: Types.ObjectId[] = Array.from(new Set([creatorId.toString(), ...participants]))
        .map((id: string) => new Types.ObjectId(id));

      if (type === 'dm' && participantIds.length !== 2) {
        return res.status(400).json({ success: false, error: 'DM must have exactly two participants' });
      }

      if (type === 'dm') {
        // Reuse existing DM if present (participants unordered)
        const [a, b] = participantIds.map((id) => id.toString()).sort();
        let existing = await Conversation.findOne({
          type: 'dm',
          participants: { $all: [new Types.ObjectId(a), new Types.ObjectId(b)] },
        }).populate('participants', 'username fullName profileImage');
        if (existing && Array.isArray(existing.participants) && existing.participants.length === 2) {
          return res.json({ success: true, data: { conversation: existing } });
        }
      }

      const conversation = await Conversation.create({
        type,
        name,
        description,
        participants: participantIds,
        createdBy: creatorId,
        projectId: projectId ? new Types.ObjectId(projectId) : undefined,
        lastMessageAt: new Date(),
      });

      const populated = await Conversation.findById(conversation._id)
        .populate('participants', 'username fullName profileImage');

      res.status(201).json({ success: true, data: { conversation: populated } });
    } catch (error: any) {
      console.error('Create conversation error:', error);
      res.status(500).json({ success: false, error: 'Failed to create conversation' });
    }
  });

  // Get messages in a conversation
  app.get('/api/conversations/:id/messages', requireAuth, async (req, res) => {
    try {
      const userId = new Types.ObjectId(req.session.userId!);
      const conversationId = new Types.ObjectId(req.params.id);

      const conversation = await Conversation.findById(conversationId).select('participants');
      if (!conversation || !conversation.participants.some(p => p.equals(userId))) {
        return res.status(403).json({ success: false, error: 'Forbidden' });
      }

      const page = parseInt((req.query.page as string) || '1');
      const limit = parseInt((req.query.limit as string) || '50');
      const skip = (page - 1) * limit;

      const [messages, total] = await Promise.all([
        Message.find({ conversationId })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Message.countDocuments({ conversationId }),
      ]);

      res.json({ success: true, data: {
        messages: messages.reverse(),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      }});
    } catch (error: any) {
      console.error('List messages error:', error);
      res.status(500).json({ success: false, error: 'Failed to list messages' });
    }
  });

  // Post a message
  app.post('/api/conversations/:id/messages', requireAuth, async (req, res) => {
    try {
      const userId = new Types.ObjectId(req.session.userId!);
      const conversationId = new Types.ObjectId(req.params.id);

      const conversation = await Conversation.findById(conversationId);
      if (!conversation || !conversation.participants.some(p => p.equals(userId))) {
        return res.status(403).json({ success: false, error: 'Forbidden' });
      }

      const { content = '', attachments = [] } = req.body || {};
      if (!content && (!attachments || attachments.length === 0)) {
        return res.status(400).json({ success: false, error: 'Message cannot be empty' });
      }

      const message = await Message.create({
        conversationId,
        senderId: userId,
        content,
        attachments,
        readBy: [userId],
      });

      await Conversation.findByIdAndUpdate(conversationId, { lastMessageAt: new Date() });

      // Fan-out: enqueue notifications to other participants (in-app)
      const recipients = conversation.participants.filter(p => !p.equals(userId));
      try {
        await Promise.all(recipients.map(async (recipientId) => {
          return Notification.create({
            recipientId,
            type: 'new_message',
            relatedUser: userId,
            title: conversation.name || (conversation.type === 'dm' ? 'New message' : 'New chat message'),
            message: content?.slice(0, 120) || 'Attachment',
            read: false,
            emailSent: false,
          });
        }));
      } catch (e) {
        console.error('Chat notification error:', e);
      }

      // Notify SSE subscribers
      broadcastToConversation(conversationId.toString(), {
        type: 'message',
        data: { message },
      });

      res.status(201).json({ success: true, data: { message } });
    } catch (error: any) {
      console.error('Create message error:', error);
      res.status(500).json({ success: false, error: 'Failed to create message' });
    }
  });

  // Edit a message (sender only); notify via SSE
  app.put('/api/messages/:messageId', requireAuth, async (req, res) => {
    try {
      const userId = new Types.ObjectId(req.session.userId!);
      const messageId = new Types.ObjectId(req.params.messageId);
      const { content = '' } = req.body || {};
      if (!content || !content.trim()) {
        return res.status(400).json({ success: false, error: 'Content cannot be empty' });
      }

      const message = await Message.findById(messageId);
      if (!message) return res.status(404).json({ success: false, error: 'Message not found' });
      if (!message.senderId.equals(userId)) {
        return res.status(403).json({ success: false, error: 'Only the sender can edit the message' });
      }

      const oldContent = message.content || '';
      message.content = content;
      message.edited = true as any;
      message.editHistory = [...(message.editHistory || []), { content: oldContent, editedAt: new Date() } as any] as any;
      await message.save();

      // SSE notify
      broadcastToConversation(message.conversationId.toString(), {
        type: 'message_edited',
        data: { message },
      });

      res.json({ success: true, data: { message } });
    } catch (error: any) {
      console.error('Edit message error:', error);
      res.status(500).json({ success: false, error: 'Failed to edit message' });
    }
  });

  // Delete a message for all participants (sender only). Soft delete keeps history but hides content
  app.delete('/api/messages/:messageId', requireAuth, async (req, res) => {
    try {
      const userId = new Types.ObjectId(req.session.userId!);
      const messageId = new Types.ObjectId(req.params.messageId);

      const message = await Message.findById(messageId);
      if (!message) return res.status(404).json({ success: false, error: 'Message not found' });
      if (!message.senderId.equals(userId)) {
        return res.status(403).json({ success: false, error: 'Only the sender can delete the message' });
      }

      message.isDeleted = true as any;
      message.deletedAt = new Date() as any;
      message.deletedBy = userId as any;
      message.content = '';
      message.attachments = [] as any;
      await message.save();

      broadcastToConversation(message.conversationId.toString(), {
        type: 'message_deleted',
        data: { messageId: String(message._id) },
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error('Delete message error:', error);
      res.status(500).json({ success: false, error: 'Failed to delete message' });
    }
  });

  // SSE: subscribe to conversation stream
  type SseClient = { id: string; res: any; conversationId: string; userId: string };
  const sseClients = new Map<string, SseClient>();
  function broadcastToConversation(conversationId: string, payload: any) {
    const data = `data: ${JSON.stringify(payload)}\n\n`;
    sseClients.forEach((client) => {
      if (client.conversationId === conversationId) {
        try { client.res.write(data); } catch {}
      }
    });
  }

  app.get('/api/conversations/:id/stream', requireAuth, async (req, res) => {
    try {
      const userId = new Types.ObjectId(req.session.userId!);
      const conversationId = new Types.ObjectId(req.params.id);

      const conversation = await Conversation.findById(conversationId).select('participants');
      if (!conversation || !conversation.participants.some(p => p.equals(userId))) {
        return res.status(403).json({ success: false, error: 'Forbidden' });
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();

      const clientId = `${req.session.userId!}:${Date.now()}:${Math.random()}`;
      const client: SseClient = { id: clientId, res, conversationId: conversationId.toString(), userId: userId.toString() };
      sseClients.set(clientId, client);

      res.write(`data: ${JSON.stringify({ type: 'connected', data: { clientId } })}\n\n`);

      req.on('close', () => {
        sseClients.delete(clientId);
      });
    } catch (error: any) {
      console.error('SSE subscribe error:', error);
      res.status(500).end();
    }
  });

  // Update conversation info (name, description)
  app.put('/api/conversations/:id', requireAuth, async (req, res) => {
    try {
      const userId = new Types.ObjectId(req.session.userId!);
      const conversationId = new Types.ObjectId(req.params.id);
      const { name, description } = req.body || {};

      // Find conversation and verify user is participant
      const conversation = await Conversation.findById(conversationId);
      if (!conversation || !conversation.participants.some(p => p.equals(userId))) {
        return res.status(403).json({ success: false, error: 'Forbidden' });
      }

      // Only allow updating group chats
      if (conversation.type !== 'group') {
        return res.status(400).json({ success: false, error: 'Only group conversations can be updated' });
      }

      const updateData: any = {};
      if (name !== undefined) updateData.name = name?.trim() || undefined;
      if (description !== undefined) updateData.description = description?.trim() || undefined;

      const updatedConversation = await Conversation.findByIdAndUpdate(
        conversationId,
        updateData,
        { new: true }
      ).populate('participants', 'username fullName profileImage');

      // Notify SSE subscribers
      broadcastToConversation(conversationId.toString(), {
        type: 'group_updated',
        data: { conversation: updatedConversation },
      });

      res.json({ success: true, data: { conversation: updatedConversation } });
    } catch (error: any) {
      console.error('Update conversation error:', error);
      res.status(500).json({ success: false, error: 'Failed to update conversation' });
    }
  });

  // Add participant to conversation
  app.post('/api/conversations/:id/participants', requireAuth, async (req, res) => {
    try {
      const userId = new Types.ObjectId(req.session.userId!);
      const conversationId = new Types.ObjectId(req.params.id);
      const { userId: newParticipantId } = req.body || {};

      if (!newParticipantId) {
        return res.status(400).json({ success: false, error: 'userId is required' });
      }

      const participantToAdd = new Types.ObjectId(newParticipantId);

      // Find conversation and verify current user is participant
      const conversation = await Conversation.findById(conversationId);
      if (!conversation || !conversation.participants.some(p => p.equals(userId))) {
        return res.status(403).json({ success: false, error: 'Forbidden' });
      }

      // Only allow adding to group chats
      if (conversation.type !== 'group') {
        return res.status(400).json({ success: false, error: 'Only group conversations can have participants added' });
      }

      // Check if user is already a participant
      if (conversation.participants.some(p => p.equals(participantToAdd))) {
        return res.status(400).json({ success: false, error: 'User is already a participant' });
      }

      // Add participant
      const updatedConversation = await Conversation.findByIdAndUpdate(
        conversationId,
        { $push: { participants: participantToAdd } },
        { new: true }
      ).populate('participants', 'username fullName profileImage');

      // Get the added user info for SSE notification
      const addedUser = await User.findById(participantToAdd).select('username fullName profileImage');

      // Notify SSE subscribers
      broadcastToConversation(conversationId.toString(), {
        type: 'member_joined',
        data: { user: addedUser, conversationId: conversationId.toString() },
      });

      res.json({ success: true, data: { conversation: updatedConversation } });
    } catch (error: any) {
      console.error('Add participant error:', error);
      res.status(500).json({ success: false, error: 'Failed to add participant' });
    }
  });

  // Remove participant from conversation
  app.delete('/api/conversations/:id/participants/:userId', requireAuth, async (req, res) => {
    try {
      const currentUserId = new Types.ObjectId(req.session.userId!);
      const conversationId = new Types.ObjectId(req.params.id);
      const participantToRemove = new Types.ObjectId(req.params.userId);

      // Find conversation and verify current user is participant
      const conversation = await Conversation.findById(conversationId);
      if (!conversation || !conversation.participants.some(p => p.equals(currentUserId))) {
        return res.status(403).json({ success: false, error: 'Forbidden' });
      }

      // Only allow removing from group chats
      if (conversation.type !== 'group') {
        return res.status(400).json({ success: false, error: 'Only group conversations can have participants removed' });
      }

      // Check if user is actually a participant
      if (!conversation.participants.some(p => p.equals(participantToRemove))) {
        return res.status(400).json({ success: false, error: 'User is not a participant' });
      }

      // Can't remove yourself via this endpoint (use leave group instead)
      if (participantToRemove.equals(currentUserId)) {
        return res.status(400).json({ success: false, error: 'Use leave group to remove yourself' });
      }

      // Remove participant
      const updatedConversation = await Conversation.findByIdAndUpdate(
        conversationId,
        { $pull: { participants: participantToRemove } },
        { new: true }
      ).populate('participants', 'username fullName profileImage');

      // Get the removed user info for SSE notification
      const removedUser = await User.findById(participantToRemove).select('username fullName profileImage');

      // Notify SSE subscribers
      broadcastToConversation(conversationId.toString(), {
        type: 'member_left',
        data: { userId: participantToRemove.toString(), conversationId: conversationId.toString() },
      });

      res.json({ success: true, data: { conversation: updatedConversation } });
    } catch (error: any) {
      console.error('Remove participant error:', error);
      res.status(500).json({ success: false, error: 'Failed to remove participant' });
    }
  });

  // Leave group conversation
  app.delete('/api/conversations/:id/leave', requireAuth, async (req, res) => {
    try {
      const userId = new Types.ObjectId(req.session.userId!);
      const conversationId = new Types.ObjectId(req.params.id);

      // Find conversation and verify user is participant
      const conversation = await Conversation.findById(conversationId);
      if (!conversation || !conversation.participants.some(p => p.equals(userId))) {
        return res.status(403).json({ success: false, error: 'Forbidden' });
      }

      // Only allow leaving group chats
      if (conversation.type !== 'group') {
        return res.status(400).json({ success: false, error: 'Only group conversations can be left' });
      }

      // Remove participant
      const updatedConversation = await Conversation.findByIdAndUpdate(
        conversationId,
        { $pull: { participants: userId } },
        { new: true }
      ).populate('participants', 'username fullName profileImage');

      // Get the user info for SSE notification
      const leftUser = await User.findById(userId).select('username fullName profileImage');

      // Notify SSE subscribers
      broadcastToConversation(conversationId.toString(), {
        type: 'member_left',
        data: { userId: userId.toString(), conversationId: conversationId.toString() },
      });

      res.json({ success: true, data: { conversation: updatedConversation } });
    } catch (error: any) {
      console.error('Leave group error:', error);
      res.status(500).json({ success: false, error: 'Failed to leave group' });
    }
  });

  // Typing indicator endpoints
  app.post('/api/conversations/:id/typing', requireAuth, async (req, res) => {
    try {
      const userId = new Types.ObjectId(req.session.userId!);
      const conversationId = new Types.ObjectId(req.params.id);

      // Find conversation and verify user is participant
      const conversation = await Conversation.findById(conversationId);
      if (!conversation || !conversation.participants.some(p => p.equals(userId))) {
        return res.status(403).json({ success: false, error: 'Forbidden' });
      }

      // Get user info for typing notification
      const typingUser = await User.findById(userId).select('username fullName');

      // Notify SSE subscribers
      broadcastToConversation(conversationId.toString(), {
        type: 'typing_started',
        data: {
          userId: userId.toString(),
          conversationId: conversationId.toString(),
          user: typingUser
        },
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error('Start typing error:', error);
      res.status(500).json({ success: false, error: 'Failed to send typing indicator' });
    }
  });

  app.delete('/api/conversations/:id/typing', requireAuth, async (req, res) => {
    try {
      const userId = new Types.ObjectId(req.session.userId!);
      const conversationId = new Types.ObjectId(req.params.id);

      // Find conversation and verify user is participant
      const conversation = await Conversation.findById(conversationId);
      if (!conversation || !conversation.participants.some(p => p.equals(userId))) {
        return res.status(403).json({ success: false, error: 'Forbidden' });
      }

      // Notify SSE subscribers
      broadcastToConversation(conversationId.toString(), {
        type: 'typing_stopped',
        data: {
          userId: userId.toString(),
          conversationId: conversationId.toString()
        },
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error('Stop typing error:', error);
      res.status(500).json({ success: false, error: 'Failed to stop typing indicator' });
    }
  });

  // Translation Routes
  app.post('/api/translate', async (req, res) => {
    try {
      const body = translateRequestSchema.parse(req.body);
      const { sourceType, sourceId, field, text, sourceLanguage, targetLanguage, forceRefresh } = body;
      const crypto = await import('crypto');
      const originalTextHash = crypto.createHash('sha256').update(text).digest('hex');

      // Check for selected community translation first
      const selectedCommunity = await Translation.findOne({
        sourceType,
        sourceId,
        field,
        targetLanguage,
        selected: true,
      });
      if (selectedCommunity && !forceRefresh) {
        return res.json({ success: true, data: { translatedText: selectedCommunity.translatedText, provider: 'community', isMachine: false } });
      }

      // Then check cached machine translation
      if (!forceRefresh) {
        const cached = await Translation.findOne({ sourceType, sourceId, field, targetLanguage, provider: 'azure-openai', originalTextHash });
        if (cached) {
          return res.json({ success: true, data: { translatedText: cached.translatedText, provider: 'azure-openai', isMachine: true } });
        }
      }

      // Generate via Azure
      const translatedText = await azureOpenAIService.translateText({
        text,
        sourceLanguage,
        targetLanguage,
        preserveMarkdown: true,
      });

      // Upsert cache for machine translation
      try {
        await Translation.updateOne(
          { sourceType, sourceId, field, targetLanguage, provider: 'azure-openai', originalTextHash },
          { $set: { translatedText, sourceLanguage } },
          { upsert: true }
        );
      } catch (e) {
        // ignore unique conflicts
      }

      return res.json({ success: true, data: { translatedText, provider: 'azure-openai', isMachine: true } });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: 'Validation error', details: error.errors });
      }
      console.error('Translation error:', error);
      res.status(500).json({ success: false, error: 'Failed to translate' });
    }
  });

  // Batch UI translation (no caching per-item in DB; return ad-hoc results)
  app.post('/api/translate/batch', async (req, res) => {
    try {
      const { translateBatchRequestSchema } = await import('@shared/schema');
      const body = translateBatchRequestSchema.parse(req.body);
      const results: string[] = [];
      for (const item of body.items) {
        const translated = await azureOpenAIService.translateText({
          text: item.text,
          sourceLanguage: item.sourceLanguage,
          targetLanguage: item.targetLanguage,
          preserveMarkdown: false,
        });
        results.push(translated);
      }
      res.json({ success: true, data: { items: results } });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: 'Validation error', details: error.errors });
      }
      console.error('Batch translation error:', error);
      res.status(500).json({ success: false, error: 'Failed to translate batch' });
    }
  });

  // Submit community translation
  app.post('/api/translate/community', requireAuth, async (req, res) => {
    try {
      const body = communityTranslationSchema.parse(req.body);
      const { sourceType, sourceId, field, targetLanguage, translatedText } = body;

      const created = await Translation.create({
        sourceType,
        sourceId,
        field,
        targetLanguage,
        translatedText,
        provider: 'community',
        createdBy: new Types.ObjectId(req.session.userId!),
      });
      res.status(201).json({ success: true, data: { translation: created } });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: 'Validation error', details: error.errors });
      }
      console.error('Community translation submit error:', error);
      res.status(500).json({ success: false, error: 'Failed to submit translation' });
    }
  });

  // List translations for a source/field/language (for community review)
  app.get('/api/translate', async (req, res) => {
    try {
      const { sourceType, sourceId, field, targetLanguage } = req.query as Record<string, string>;
      if (!sourceType || !sourceId || !field || !targetLanguage) {
        return res.status(400).json({ success: false, error: 'Missing required query parameters' });
      }
      const items = await Translation.find({ sourceType, sourceId, field, targetLanguage }).sort({ selected: -1, upvotes: -1, createdAt: -1 });
      res.json({ success: true, data: { translations: items } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: 'Failed to list translations' });
    }
  });

  // Vote on a community translation
  app.post('/api/translate/:id/vote', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { vote } = req.body || {};
      if (!['up','down'].includes(vote)) {
        return res.status(400).json({ success: false, error: 'vote must be up or down' });
      }
      const doc = await Translation.findById(id);
      if (!doc || doc.provider !== 'community') {
        return res.status(404).json({ success: false, error: 'Translation not found' });
      }
      if (vote === 'up') doc.upvotes = (doc.upvotes || 0) + 1; else doc.downvotes = (doc.downvotes || 0) + 1;
      await doc.save();
      res.json({ success: true, data: { translation: doc } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: 'Failed to vote' });
    }
  });

  // Admin select a preferred community translation
  app.post('/api/admin/translate/:id/select', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const doc = await Translation.findById(id);
      if (!doc || doc.provider !== 'community') {
        return res.status(404).json({ success: false, error: 'Translation not found' });
      }
      await Translation.updateMany({
        sourceType: doc.sourceType,
        sourceId: doc.sourceId,
        field: doc.field,
        targetLanguage: doc.targetLanguage,
        provider: 'community',
      }, { $set: { selected: false } });
      doc.selected = true;
      await doc.save();
      res.json({ success: true, data: { translation: doc } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: 'Failed to select translation' });
    }
  });

  // User search for collaborators (use query parameter)
  app.get('/api/users/collaborator-search', requireAuth, async (req, res) => {
    try {
      const { query } = req.query;
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ success: false, error: 'Search query is required' });
      }

      const users = await User.find({
        $or: [
          { username: { $regex: query, $options: 'i' } },
          { fullName: { $regex: query, $options: 'i' } }
        ],
      }).select('username fullName profileImage').limit(10);

      res.json({ success: true, data: { users } });
    } catch (error: any) {
      console.error('User search error:', error);
      res.status(500).json({ success: false, error: 'Failed to search for users' });
    }
  });

  // Get user profile
  app.get('/api/users/:username', async (req, res) => {
    try {
      const user = await User.findOne({ username: req.params.username });
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      res.json({ success: true, data: { user } });
    } catch (error: any) {
      console.error('Get user profile error:', error);
      res.status(500).json({ success: false, error: 'Failed to get user profile' });
    }
  });

  // Add a collaborator to a project
  app.post('/api/projects/:projectId/collaborators', requireAuth, async (req, res) => {
    try {
      const { projectId } = req.params;
      const { userId } = req.body;

      // Input validation
      if (!userId) {
        return res.status(400).json({ success: false, error: 'User ID is required' });
      }

      if (!Types.ObjectId.isValid(projectId)) {
        return res.status(400).json({ success: false, error: 'Invalid project ID format' });
      }

      if (!Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ success: false, error: 'Invalid user ID format' });
      }

      // Check if user exists
      const userToAdd = await User.findById(userId);
      if (!userToAdd) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      const project = await Project.findById(projectId).populate('collaborators', '_id');
      if (!project) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }

      // Check if project is active
      if (project.isDeleted) {
        return res.status(400).json({ success: false, error: 'Cannot add collaborators to a deleted project' });
      }

      // Ensure the current user is the owner
      if (project.ownerId.toString() !== req.session.userId!) {
        return res.status(403).json({ success: false, error: 'Only the project owner can add collaborators' });
      }
      
      // Prevent adding the owner as a collaborator
      if (project.ownerId.toString() === userId) {
        return res.status(400).json({ success: false, error: 'The project owner is already managing this project' });
      }

      // Check if user is already a collaborator
      const isAlreadyCollaborator = project.collaborators.some(
        (collaborator: any) => collaborator._id.toString() === userId
      );
      
      if (isAlreadyCollaborator) {
        return res.status(400).json({ 
          success: false, 
          error: `${userToAdd.fullName || userToAdd.username} is already a collaborator on this project` 
        });
      }

      // Check collaborator limit (optional - prevent too many collaborators)
      if (project.collaborators.length >= 10) {
        return res.status(400).json({ 
          success: false, 
          error: 'Project has reached the maximum number of collaborators (10)' 
        });
      }

      // Add the new collaborator
      project.collaborators.push(userId);
      await project.save();

      // Create notification for the added collaborator
      try {
        await Notification.createCollaboratorAddedNotification(
          new Types.ObjectId(projectId),
          new Types.ObjectId(userId), 
          new Types.ObjectId(req.session.userId!)
        );
      } catch (notifError) {
        console.error('Failed to create collaborator notification:', notifError);
        // Don't fail the main operation if notification fails
      }
      
      const populatedProject = await Project.findById(projectId).populate('collaborators', 'username fullName profileImage');

      res.json({ 
        success: true, 
        data: { collaborators: populatedProject?.collaborators },
        message: `${userToAdd.fullName || userToAdd.username} has been added as a collaborator`
      });
    } catch (error: any) {
      console.error('Add collaborator error:', error);
      res.status(500).json({ success: false, error: 'Failed to add collaborator. Please try again.' });
    }
  });

  // Remove a collaborator from a project
  app.delete('/api/projects/:projectId/collaborators/:userId', requireAuth, async (req, res) => {
    try {
      const { projectId, userId } = req.params;

      // Input validation
      if (!Types.ObjectId.isValid(projectId)) {
        return res.status(400).json({ success: false, error: 'Invalid project ID format' });
      }

      if (!Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ success: false, error: 'Invalid user ID format' });
      }

      // Check if user exists
      const userToRemove = await User.findById(userId);
      if (!userToRemove) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      const project = await Project.findById(projectId).populate('collaborators', '_id username fullName');
      if (!project) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }

      // Check if project is active
      if (project.isDeleted) {
        return res.status(400).json({ success: false, error: 'Cannot remove collaborators from a deleted project' });
      }

      // Ensure the current user is the owner
      if (project.ownerId.toString() !== req.session.userId!) {
        return res.status(403).json({ success: false, error: 'Only the project owner can remove collaborators' });
      }
      
      // The owner cannot be removed as a collaborator
      if (project.ownerId.toString() === userId) {
        return res.status(400).json({ success: false, error: 'The project owner cannot be removed' });
      }

      // Check if user is actually a collaborator
      const isCollaborator = project.collaborators.some(
        (collaborator: any) => collaborator._id.toString() === userId
      );
      
      if (!isCollaborator) {
        return res.status(400).json({ 
          success: false, 
          error: `${userToRemove.fullName || userToRemove.username} is not a collaborator on this project` 
        });
      }

      // Remove the collaborator
      project.collaborators = project.collaborators.filter(c => c._id.toString() !== userId);
      await project.save();

      // Create notification for the removed collaborator
      try {
        await Notification.createCollaboratorRemovedNotification(
          new Types.ObjectId(projectId),
          new Types.ObjectId(userId), 
          new Types.ObjectId(req.session.userId!)
        );
      } catch (notifError) {
        console.error('Failed to create collaborator removal notification:', notifError);
        // Don't fail the main operation if notification fails
      }
      
      const populatedProject = await Project.findById(projectId).populate('collaborators', 'username fullName profileImage');

      res.json({ 
        success: true, 
        data: { collaborators: populatedProject?.collaborators },
        message: `${userToRemove.fullName || userToRemove.username} has been removed as a collaborator`
      });
    } catch (error: any) {
      console.error('Remove collaborator error:', error);
      res.status(500).json({ success: false, error: 'Failed to remove collaborator. Please try again.' });
    }
  });

  // Route to get project details
  app.get("/api/projects/:id", async (req, res) => {
    try {
      // Pass the authenticated user ID for view tracking if available
      const userId = req.session.userId!;
      const project = await mongoStorage.getProject(req.params.id, userId);
      if (!project) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }

      res.json({ success: true, data: { project } });
    } catch (error: any) {
      console.error('Get project error:', error);
      res.status(500).json({ success: false, error: 'Failed to get project' });
    }
  });

  // Get user collaborations - projects where user is a collaborator
  app.get('/api/users/:id/collaborations', async (req, res) => {
    try {
      const { id } = req.params;
      
      // Validate ObjectId format
      if (!Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, error: 'Invalid user ID format' });
      }
      
      // Find projects where this user is a collaborator
      const projects = await Project.find({ 
        collaborators: new Types.ObjectId(id),
        isDeleted: false 
      })
      .populate('ownerId', 'username fullName profileImage')
      .populate('collaborators', 'username fullName profileImage')
      .sort({ updatedAt: -1 })
      .lean();
      
      res.json({ success: true, data: { projects } });
    } catch (error: any) {
      console.error('Get user collaborations error:', error);
      res.status(500).json({ success: false, error: 'Failed to get user collaborations' });
    }
  });

  // ========================================
  // LISTS API ROUTES
  // ========================================

  // Get all lists with filtering and pagination
  app.get('/api/lists', async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 12, 50);
      const skip = (page - 1) * limit;
      
      const filters: any = { status: 'active' };
      
      // Apply filters
      if (req.query.category) filters.category = req.query.category;
      if (req.query.featured === 'true') filters.featured = true;
      if (req.query.isPublic === 'false') filters.isPublic = false;
      if (req.query.createdBy) filters.createdBy = new Types.ObjectId(req.query.createdBy as string);
      if (req.query.tags) {
        const tags = Array.isArray(req.query.tags) ? req.query.tags : [req.query.tags];
        filters.tags = { $in: tags };
      }
      
      // Search functionality
      if (req.query.search) {
        const searchRegex = new RegExp(escapeRegex(req.query.search as string), 'i');
        filters.$or = [
          { title: searchRegex },
          { description: searchRegex },
          { tags: searchRegex }
        ];
      }
      
      // Sort options
      let sort: any = { featured: -1, 'analytics.lastActivity': -1 };
      if (req.query.sortBy === 'newest') sort = { createdAt: -1 };
      if (req.query.sortBy === 'popular') sort = { 'analytics.views': -1 };
      if (req.query.sortBy === 'items') sort = { 'analytics.totalItems': -1 };
      
      const [lists, total] = await Promise.all([
        List.find(filters)
          .populate('createdBy', 'username fullName profileImage')
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        List.countDocuments(filters)
      ]);
      
      res.json({
        success: true,
        data: {
          lists,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error: any) {
      console.error('Get lists error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch lists' });
    }
  });

  // Get featured lists
  app.get('/api/lists/featured', async (req, res) => {
    try {
      const lists = await List.find({ 
        featured: true, 
        status: 'active',
        isPublic: true 
      })
      .populate('createdBy', 'username fullName profileImage')
      .sort({ 'analytics.lastActivity': -1 })
      .limit(8)
      .lean();
      
      res.json({ success: true, data: { lists } });
    } catch (error: any) {
      console.error('Get featured lists error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch featured lists' });
    }
  });

  // Get list categories with counts
  app.get('/api/lists/categories', async (req, res) => {
    try {
      const categories = await List.aggregate([
        { $match: { status: 'active', isPublic: true } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);
      
      res.json({ success: true, data: { categories } });
    } catch (error: any) {
      console.error('Get list categories error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch categories' });
    }
  });

  // Get single list with items
  app.get('/api/lists/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, error: 'Invalid list ID' });
      }
      
      const list = await List.findById(id)
        .populate('createdBy', 'username fullName profileImage college graduationYear')
        .populate('collaborators.userId', 'username fullName profileImage')
        .lean();
      
      if (!list) {
        return res.status(404).json({ success: false, error: 'List not found' });
      }
      
      // Check if user can view this list
      if (!list.isPublic && req.session.userId) {
        const userId = req.session.userId;
        const canView = list.createdBy._id.toString() === userId ||
                       list.collaborators?.some(c => c.userId._id.toString() === userId);
        
        if (!canView) {
          return res.status(403).json({ success: false, error: 'Access denied' });
        }
      }
      
      // Get list items
      const items = await ListItem.find({ 
        listId: new Types.ObjectId(id), 
        status: 'active' 
      })
      .populate('createdBy', 'username fullName profileImage')
      .populate('lastEditedBy', 'username fullName profileImage')
      .sort({ order: 1, createdAt: 1 })
      .lean();
      
      // Synchronize item analytics with reaction counts
      const synchronizedItems = items.map(item => {
        const likeCount = item.reactions?.filter(r => r.type === 'like').length || 0;
        const helpfulCount = item.reactions?.filter(r => r.type === 'helpful').length || 0;

        // Update analytics if they're out of sync
        if (item.analytics.likes !== likeCount || item.analytics.helpful !== helpfulCount) {
          // Update in database (fire and forget)
          ListItem.findByIdAndUpdate(item._id, {
            'analytics.likes': likeCount,
            'analytics.helpful': helpfulCount
          }).catch(err => console.error('Failed to sync analytics:', err));
        }

        return {
          ...item,
          analytics: {
            ...item.analytics,
            likes: likeCount,
            helpful: helpfulCount
          }
        };
      });

      // Update view count if user is logged in
      if (req.session.userId) {
        const userId = new Types.ObjectId(req.session.userId);
        if (!list.analytics.uniqueViewers.some(v => v.toString() === userId.toString())) {
          await List.findByIdAndUpdate(id, {
            $inc: { 'analytics.views': 1 },
            $addToSet: { 'analytics.uniqueViewers': userId }
          });
        }
      }

      res.json({
        success: true,
        data: {
          list: {
            ...list,
            analytics: {
              ...list.analytics,
              views: list.analytics.views + (req.session.userId ? 1 : 0)
            }
          },
          items: synchronizedItems
        }
      });
    } catch (error: any) {
      console.error('Get list error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch list' });
    }
  });

  // Create new list
  app.post('/api/lists', requireAuth, validateBody(createListSchema), async (req, res) => {
    try {
      const listData = {
        ...req.body,
        createdBy: new Types.ObjectId(req.session.userId!),
        analytics: {
          views: 0,
          uniqueViewers: [],
          totalItems: 0,
          totalContributors: [new Types.ObjectId(req.session.userId!)],
          lastActivity: new Date()
        }
      };
      
      const list = new List(listData);
      await list.save();
      
      const populatedList = await List.findById(list._id)
        .populate('createdBy', 'username fullName profileImage')
        .lean();
      
      res.status(201).json({ 
        success: true, 
        data: { list: populatedList },
        message: 'List created successfully'
      });
    } catch (error: any) {
      console.error('Create list error:', error);
      res.status(500).json({ success: false, error: 'Failed to create list' });
    }
  });

  // Update list
  app.put('/api/lists/:id', requireAuth, validateBody(updateListSchema), async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, error: 'Invalid list ID' });
      }
      
      const list = await List.findById(id);
      if (!list) {
        return res.status(404).json({ success: false, error: 'List not found' });
      }
      
      // Check permissions
      const userId = req.session.userId!;
      const canEdit = list.createdBy.toString() === userId ||
                     list.collaborators?.some(c => 
                       c.userId.toString() === userId && 
                       ['owner', 'editor'].includes(c.role)
                     );
      
      if (!canEdit) {
        return res.status(403).json({ success: false, error: 'Permission denied' });
      }
      
      const updatedList = await List.findByIdAndUpdate(
        id,
        { ...req.body, 'analytics.lastActivity': new Date() },
        { new: true, runValidators: true }
      ).populate('createdBy', 'username fullName profileImage');
      
      res.json({ 
        success: true, 
        data: { list: updatedList },
        message: 'List updated successfully'
      });
    } catch (error: any) {
      console.error('Update list error:', error);
      res.status(500).json({ success: false, error: 'Failed to update list' });
    }
  });

  // Delete list
  app.delete('/api/lists/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, error: 'Invalid list ID' });
      }
      
      const list = await List.findById(id);
      if (!list) {
        return res.status(404).json({ success: false, error: 'List not found' });
      }
      
      // Check if user is owner or admin
      const currentUser = await User.findById(req.session.userId!);
      const isOwner = list.createdBy.toString() === req.session.userId!;
      const isAdmin = currentUser?.role === 'admin';

      if (!isOwner && !isAdmin) {
        return res.status(403).json({ success: false, error: 'Only the list owner or admin can delete this list' });
      }
      
      // Soft delete
      await List.findByIdAndUpdate(id, { 
        status: 'deleted',
        'analytics.lastActivity': new Date()
      });
      
      // Also delete all list items
      await ListItem.updateMany(
        { listId: new Types.ObjectId(id) },
        { status: 'deleted' }
      );
      
      res.json({
        success: true,
        message: 'List deleted successfully'
      });
    } catch (error: any) {
      console.error('Delete list error:', error);
      res.status(500).json({ success: false, error: 'Failed to delete list' });
    }
  });

  // Admin - delete list
  app.delete('/api/admin/lists/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;

      if (!Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, error: 'Invalid list ID' });
      }

      const list = await List.findById(id);
      if (!list) {
        return res.status(404).json({ success: false, error: 'List not found' });
      }

      // Check if already deleted
      if (list.status === 'deleted') {
        return res.status(400).json({ success: false, error: 'List already deleted' });
      }

      // Soft delete the list
      await List.findByIdAndUpdate(id, {
        status: 'deleted',
        'analytics.lastActivity': new Date()
      });

      // Also soft delete all list items
      await ListItem.updateMany(
        { listId: new Types.ObjectId(id) },
        { status: 'deleted' }
      );

      res.json({
        success: true,
        message: 'List deleted by admin successfully'
      });
    } catch (error: any) {
      console.error('Admin delete list error:', error);
      res.status(500).json({ success: false, error: 'Failed to delete list' });
    }
  });

  // ========================================
  // LIST ITEMS API ROUTES
  // ========================================

  // Get list items with filtering
  app.get('/api/lists/:listId/items', async (req, res) => {
    try {
      const { listId } = req.params;
      
      if (!Types.ObjectId.isValid(listId)) {
        return res.status(400).json({ success: false, error: 'Invalid list ID' });
      }
      
      // Check if list exists and user can view it
      const list = await List.findById(listId);
      if (!list) {
        return res.status(404).json({ success: false, error: 'List not found' });
      }
      
      if (!list.isPublic && req.session.userId) {
        const userId = req.session.userId;
        const canView = list.createdBy.toString() === userId ||
                       list.collaborators?.some(c => c.userId.toString() === userId);
        
        if (!canView) {
          return res.status(403).json({ success: false, error: 'Access denied' });
        }
      }
      
      const filters: any = { listId: new Types.ObjectId(listId), status: 'active' };
      
      // Apply filters
      if (req.query.type) filters['metadata.type'] = req.query.type;
      if (req.query.featured === 'true') filters.featured = true;
      
      const items = await ListItem.find(filters)
        .populate('createdBy', 'username fullName profileImage')
        .populate('lastEditedBy', 'username fullName profileImage')
        .sort({ 'analytics.upvotes': -1, order: 1, createdAt: 1 })
        .lean();
      
      res.json({ success: true, data: { items } });
    } catch (error: any) {
      console.error('Get list items error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch list items' });
    }
  });

  // Create new list item
  app.post('/api/lists/:listId/items', requireAuth, validateBody(createListItemSchema), async (req, res) => {
    try {
      const { listId } = req.params;
      
      if (!Types.ObjectId.isValid(listId)) {
        return res.status(400).json({ success: false, error: 'Invalid list ID' });
      }
      
      const list = await List.findById(listId);
      if (!list) {
        return res.status(404).json({ success: false, error: 'List not found' });
      }
      
      // Check permissions
      const userId = req.session.userId!;
      const canContribute = list.isPublic && list.settings.allowAnonymousContributions ||
                           list.createdBy.toString() === userId ||
                           list.collaborators?.some(c => c.userId.toString() === userId);
      
      if (!canContribute) {
        return res.status(403).json({ success: false, error: 'Permission denied' });
      }
      
      // Check item limit per user if set
      if (list.settings.maxItemsPerUser) {
        const userItemCount = await ListItem.countDocuments({
          listId: new Types.ObjectId(listId),
          createdBy: new Types.ObjectId(userId),
          status: 'active'
        });
        
        if (userItemCount >= list.settings.maxItemsPerUser) {
          return res.status(400).json({ 
            success: false, 
            error: `Maximum ${list.settings.maxItemsPerUser} items per user allowed` 
          });
        }
      }
      
      // Get next order number
      const lastItem = await ListItem.findOne({ listId: new Types.ObjectId(listId) })
        .sort({ order: -1 })
        .lean();
      
      const itemData = {
        ...req.body,
        listId: new Types.ObjectId(listId),
        createdBy: new Types.ObjectId(userId),
        order: req.body.order ?? (lastItem ? lastItem.order + 1 : 0),
        status: list.settings.requireApprovalForNewItems ? 'pending' : 'active'
      };
      
      const item = new ListItem(itemData);
      await item.save();
      
      // Update list analytics
      await List.findByIdAndUpdate(listId, {
        $inc: { 'analytics.totalItems': 1 },
        $set: { 'analytics.lastActivity': new Date() },
        $addToSet: { 'analytics.totalContributors': new Types.ObjectId(userId) }
      });
      
      const populatedItem = await ListItem.findById(item._id)
        .populate('createdBy', 'username fullName profileImage')
        .lean();
      
      // Broadcast real-time update to connected clients
      broadcastToList(listId, {
        type: 'item_added',
        data: { 
          item: populatedItem,
          approved: !list.settings.requireApprovalForNewItems
        }
      });
      
      res.status(201).json({ 
        success: true, 
        data: { item: populatedItem },
        message: list.settings.requireApprovalForNewItems ? 
          'Item submitted for approval' : 'Item added successfully'
      });
    } catch (error: any) {
      console.error('Create list item error:', error);
      res.status(500).json({ success: false, error: 'Failed to create list item' });
    }
  });

  // Update list item
  app.put('/api/lists/:listId/items/:itemId', requireAuth, validateBody(updateListItemSchema), async (req, res) => {
    try {
      const { listId, itemId } = req.params;
      
      if (!Types.ObjectId.isValid(listId) || !Types.ObjectId.isValid(itemId)) {
        return res.status(400).json({ success: false, error: 'Invalid ID format' });
      }
      
      const [list, item] = await Promise.all([
        List.findById(listId),
        ListItem.findById(itemId)
      ]);
      
      if (!list) {
        return res.status(404).json({ success: false, error: 'List not found' });
      }
      
      if (!item) {
        return res.status(404).json({ success: false, error: 'List item not found' });
      }
      
      // Check permissions
      const userId = req.session.userId!;
      const canEdit = list.settings.allowItemEditing && (
        item.createdBy.toString() === userId ||
        list.createdBy.toString() === userId ||
        list.collaborators?.some(c => 
          c.userId.toString() === userId && 
          ['owner', 'editor'].includes(c.role)
        )
      );
      
      if (!canEdit) {
        return res.status(403).json({ success: false, error: 'Permission denied' });
      }
      
      // Track edit history
      const changes = [];
      for (const [field, newValue] of Object.entries(req.body)) {
        const oldValue = (item as any)[field];
        if (oldValue !== newValue) {
          changes.push({
            field,
            oldValue: typeof oldValue === 'object' ? JSON.stringify(oldValue) : String(oldValue),
            newValue: typeof newValue === 'object' ? JSON.stringify(newValue) : String(newValue)
          });
        }
      }
      
      const updateData = {
        ...req.body,
        lastEditedBy: new Types.ObjectId(userId),
        $push: changes.length > 0 ? {
          editHistory: {
            editedBy: new Types.ObjectId(userId),
            editedAt: new Date(),
            changes,
            reason: req.body.editReason
          }
        } : undefined
      };
      
      delete updateData.editReason;
      
      const updatedItem = await ListItem.findByIdAndUpdate(
        itemId,
        updateData,
        { new: true, runValidators: true }
      ).populate('createdBy', 'username fullName profileImage')
       .populate('lastEditedBy', 'username fullName profileImage');
      
      // Update list activity
      await List.findByIdAndUpdate(listId, {
        'analytics.lastActivity': new Date()
      });
      
      // Broadcast real-time update to connected clients
      broadcastToList(listId, {
        type: 'item_updated',
        data: { 
          item: updatedItem,
          editedBy: {
            _id: userId,
            fullName: (updatedItem?.lastEditedBy as any)?.fullName,
            username: (updatedItem?.lastEditedBy as any)?.username
          }
        }
      });
      
      res.json({ 
        success: true, 
        data: { item: updatedItem },
        message: 'Item updated successfully'
      });
    } catch (error: any) {
      console.error('Update list item error:', error);
      res.status(500).json({ success: false, error: 'Failed to update list item' });
    }
  });

  // Delete list item
  app.delete('/api/lists/:listId/items/:itemId', requireAuth, async (req, res) => {
    try {
      const { listId, itemId } = req.params;
      
      if (!Types.ObjectId.isValid(listId) || !Types.ObjectId.isValid(itemId)) {
        return res.status(400).json({ success: false, error: 'Invalid ID format' });
      }
      
      const [list, item] = await Promise.all([
        List.findById(listId),
        ListItem.findById(itemId)
      ]);
      
      if (!list) {
        return res.status(404).json({ success: false, error: 'List not found' });
      }
      
      if (!item) {
        return res.status(404).json({ success: false, error: 'List item not found' });
      }
      
      // Check permissions
      const userId = req.session.userId!;
      const user = await User.findById(userId);
      
      // Admin users can delete any item
      const isAdmin = user?.role === 'admin';
      
      const canDelete = isAdmin || (list.settings.allowItemDeletion && (
        item.createdBy.toString() === userId ||
        list.createdBy.toString() === userId ||
        list.collaborators?.some(c => 
          c.userId.toString() === userId && 
          ['owner', 'editor'].includes(c.role)
        )
      ));
      
      if (!canDelete) {
        return res.status(403).json({ success: false, error: 'Permission denied' });
      }
      
      // Soft delete
      await ListItem.findByIdAndUpdate(itemId, { status: 'deleted' });
      
      // Update list analytics
      await List.findByIdAndUpdate(listId, {
        $inc: { 'analytics.totalItems': -1 },
        $set: { 'analytics.lastActivity': new Date() }
      });
      
      // Get user info for broadcast
      const deletingUser = await User.findById(userId).select('username fullName');
      
      // Broadcast real-time update to connected clients
      broadcastToList(listId, {
        type: 'item_deleted',
        data: { 
          itemId: itemId,
          deletedBy: {
            _id: userId,
            fullName: deletingUser?.fullName,
            username: deletingUser?.username
          }
        }
      });
      
      res.json({ 
        success: true,
        message: 'Item deleted successfully'
      });
    } catch (error: any) {
      console.error('Delete list item error:', error);
      res.status(500).json({ success: false, error: 'Failed to delete list item' });
    }
  });

  // React to list item
  app.post('/api/lists/:listId/items/:itemId/react', requireAuth, async (req, res) => {
    try {
      const { listId, itemId } = req.params;
      const { type } = req.body; // 'like', 'helpful', 'outdated', 'spam', 'upvote'
      
      if (!['like', 'helpful', 'outdated', 'spam', 'upvote'].includes(type)) {
        return res.status(400).json({ success: false, error: 'Invalid reaction type' });
      }
      
      const item = await ListItem.findById(itemId);
      if (!item) {
        return res.status(404).json({ success: false, error: 'List item not found' });
      }
      
      const userId = new Types.ObjectId(req.session.userId!);
      const existingReaction = item.reactions?.find(r => 
        r.userId.toString() === userId.toString() && r.type === type
      );
      
      if (existingReaction) {
        // Remove reaction
        await ListItem.findByIdAndUpdate(itemId, {
          $pull: { reactions: { userId, type } },
          $inc: {
            [`analytics.${type === 'like' ? 'likes' : type === 'helpful' ? 'helpful' : 'upvotes'}`]: -1
          }
        });

        // Broadcast reaction update
        broadcastToList(listId, {
          type: 'item_reaction_updated',
          data: {
            itemId,
            reactionType: type,
            action: 'removed',
            userId: userId.toString()
          }
        });

        res.json({ success: true, message: 'Reaction removed' });
      } else {
        // Check if user has other reactions and update analytics accordingly
        const userReactions = item.reactions?.filter(r => r.userId.toString() === userId.toString()) || [];
        const existingLike = userReactions.find(r => r.type === 'like');
        const existingHelpful = userReactions.find(r => r.type === 'helpful');
        const existingUpvote = userReactions.find(r => r.type === 'upvote');

        // Calculate analytics changes
        const analyticsInc: any = {};

        if (type === 'like' && !existingLike) {
          analyticsInc['analytics.likes'] = 1;
        }
        if (type === 'helpful' && !existingHelpful) {
          analyticsInc['analytics.helpful'] = 1;
        }
        if (type === 'upvote' && !existingUpvote) {
          analyticsInc['analytics.upvotes'] = 1;
        }
        if (existingLike && type !== 'like') {
          analyticsInc['analytics.likes'] = -1;
        }
        if (existingHelpful && type !== 'helpful') {
          analyticsInc['analytics.helpful'] = -1;
        }
        if (existingUpvote && type !== 'upvote') {
          analyticsInc['analytics.upvotes'] = -1;
        }

        // Add reaction (remove any existing reaction by this user first)
        await ListItem.findByIdAndUpdate(itemId, {
          $pull: { reactions: { userId } },
          ...analyticsInc
        });

        await ListItem.findByIdAndUpdate(itemId, {
          $push: { reactions: { userId, type, timestamp: new Date() } }
        });

        // Broadcast reaction update
        broadcastToList(listId, {
          type: 'item_reaction_updated',
          data: {
            itemId,
            reactionType: type,
            action: 'added',
            userId: userId.toString()
          }
        });

        res.json({ success: true, message: 'Reaction added' });
      }
    } catch (error: any) {
      console.error('React to item error:', error);
      res.status(500).json({ success: false, error: 'Failed to react to item' });
    }
  });

  // Track item click/view
  app.post('/api/lists/:listId/items/:itemId/track', async (req, res) => {
    try {
      const { listId, itemId } = req.params;
      const { action } = req.body; // 'view', 'click', 'copy'
      
      if (!['view', 'click', 'copy'].includes(action)) {
        return res.status(400).json({ success: false, error: 'Invalid action type' });
      }
      
      const updateField = action === 'view' ? 'analytics.views' : 
                         action === 'click' ? 'analytics.clicks' : 'analytics.copies';
      
      await ListItem.findByIdAndUpdate(itemId, {
        $inc: { [updateField]: 1 }
      });
      
      res.json({ success: true });
    } catch (error: any) {
      console.error('Track item action error:', error);
      res.status(500).json({ success: false, error: 'Failed to track action' });
    }
  });

  // ========================================
  // LISTS REAL-TIME UPDATES (SSE)
  // ========================================

  // SSE: Lists live updates
  type ListSseClient = { id: string; res: any; listId: string; userId: string };
  const listSseClients = new Map<string, ListSseClient>();
  
  function broadcastToList(listId: string, payload: any) {
    const data = `data: ${JSON.stringify(payload)}\n\n`;
    listSseClients.forEach((client) => {
      if (client.listId === listId) {
        try { 
          client.res.write(data); 
        } catch (error) {
          console.error('Error broadcasting to list client:', error);
          listSseClients.delete(client.id);
        }
      }
    });
  }

  app.get('/api/lists/:id/stream', async (req, res) => {
    try {
      const { id: listId } = req.params;
      
      if (!Types.ObjectId.isValid(listId)) {
        return res.status(400).json({ success: false, error: 'Invalid list ID' });
      }

      // Check if list exists and user can view it
      const list = await List.findById(listId);
      if (!list) {
        return res.status(404).json({ success: false, error: 'List not found' });
      }

      // Check permissions (public lists or list members)
      const userId = req.session.userId;
      if (!list.isPublic && userId) {
        const canView = list.createdBy.toString() === userId ||
                       list.collaborators?.some(c => c.userId.toString() === userId);
        
        if (!canView) {
          return res.status(403).json({ success: false, error: 'Access denied' });
        }
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');
      res.flushHeaders?.();

      const clientId = `${userId || 'anonymous'}:${Date.now()}:${Math.random()}`;
      const client: ListSseClient = { 
        id: clientId, 
        res, 
        listId: listId.toString(), 
        userId: userId || 'anonymous' 
      };
      listSseClients.set(clientId, client);

      res.write(`data: ${JSON.stringify({ type: 'connected', data: { clientId } })}\n\n`);

      // Send current viewer count
      const viewerCount = Array.from(listSseClients.values())
        .filter(c => c.listId === listId).length;
      broadcastToList(listId, { 
        type: 'viewer_count', 
        data: { count: viewerCount } 
      });

      req.on('close', () => {
        listSseClients.delete(clientId);
        
        // Update viewer count after disconnect
        const newViewerCount = Array.from(listSseClients.values())
          .filter(c => c.listId === listId).length;
        broadcastToList(listId, { 
          type: 'viewer_count', 
          data: { count: newViewerCount } 
        });
      });
    } catch (error: any) {
      console.error('List SSE subscribe error:', error);
      res.status(500).end();
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}