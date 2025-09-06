/**
 * MongoDB Storage Service
 * Replaces the old PostgreSQL storage with comprehensive MongoDB operations
 */

import { 
  User, Project, Comment, Event, Category, Subscription, Notification,
  UserActivity, ProjectAnalytics, ForumModerationLog 
} from '../models';
import { Types } from 'mongoose';
import type {
  User as UserType, Project as ProjectType, Comment as CommentType, 
  Event as EventType, Category as CategoryType, CreateUser, CreateProject, 
  CreateComment, CreateEvent, CreateCategory, UpdateUser, UpdateProject, 
  UpdateCategory, PaginationParams, ProjectFilters, CommentFilters, EventFilters
} from '@shared/schema';

export interface IMongoStorage {
  // User operations
  getUser(id: string): Promise<UserType | null>;
  getUserByUsername(username: string): Promise<UserType | null>;
  getUserByEmail(email: string): Promise<UserType | null>;
  createUser(userData: CreateUser): Promise<UserType>;
  updateUser(id: string, updates: UpdateUser): Promise<UserType | null>;
  authenticateUser(email: string, password: string): Promise<UserType | null>;
  
  // Project operations
  getProjects(filters?: ProjectFilters, pagination?: PaginationParams): Promise<{ projects: ProjectType[], total: number }>;
  getProject(id: string, userId?: string): Promise<ProjectType | null>;
  createProject(projectData: CreateProject): Promise<ProjectType>;
  updateProject(id: string, updates: UpdateProject): Promise<ProjectType | null>;
  deleteProject(id: string, userId: string): Promise<boolean>;
  getFeaturedProjects(): Promise<ProjectType[]>;
  getUserProjects(userId: string): Promise<ProjectType[]>;
  
  // Project Update operations
  getProjectUpdates(projectId: string): Promise<any[]>;
  createProjectUpdate(updateData: any): Promise<any>;
  
  // Comment operations
  getComment(id: string): Promise<CommentType | null>;
  getProjectComments(projectId: string, filters?: CommentFilters): Promise<CommentType[]>;
  createComment(commentData: CreateComment): Promise<CommentType>;
  updateComment(id: string, content: string, userId: string): Promise<CommentType | null>;
  deleteComment(id: string, userId: string): Promise<boolean>;
  
  // Event operations
  getEvents(filters?: EventFilters, pagination?: PaginationParams): Promise<{ events: EventType[], total: number }>;
  getEvent(id: string): Promise<EventType | null>;
  createEvent(eventData: CreateEvent): Promise<EventType>;
  updateEvent(id: string, updates: Partial<CreateEvent>): Promise<EventType | null>;
  registerForEvent(eventId: string, userId: string): Promise<boolean>;
  
  // Category operations
  getCategories(includeInactive?: boolean): Promise<CategoryType[]>;
  getCategory(id: string): Promise<CategoryType | null>;
  createCategory(categoryData: CreateCategory): Promise<CategoryType>;
  updateCategory(id: string, updates: UpdateCategory): Promise<CategoryType | null>;
  deleteCategory(id: string): Promise<boolean>;
  getPopularTags(limit?: number): Promise<{ tag: string, count: number }[]>;
  
  // Analytics operations
  recordProjectView(projectId: string, userId?: string): Promise<void>;
  recordProjectShare(projectId: string, platform: string, userId?: string): Promise<void>;
  getProjectAnalytics(projectId: string): Promise<any>;
  getTrendingProjects(): Promise<ProjectType[]>;
  getRecommendedProjects(userId: string, limit?: number): Promise<ProjectType[]>;
  getPersonalizedFeed(userId: string, params?: { page?: number; limit?: number }): Promise<{ items: ProjectType[]; total: number }>;
  getContributorLeaderboard(periodDays?: number, limit?: number): Promise<Array<{ userId: Types.ObjectId; username: string; fullName: string; profileImage?: string; totalViews: number; totalComments: number; totalLikes: number; score: number }>>;
  followUser(followerId: string, targetUserId: string): Promise<boolean>;
  unfollowUser(followerId: string, targetUserId: string): Promise<boolean>;
  getFollowers(userId: string): Promise<Array<Pick<UserType, '_id' | 'username' | 'fullName' | 'profileImage'>>>;
  getFollowing(userId: string): Promise<Array<Pick<UserType, '_id' | 'username' | 'fullName' | 'profileImage'>>>;
  
  // Subscription operations
  subscribeToProject(userId: string, projectId: string): Promise<boolean>;
  unsubscribeFromProject(userId: string, projectId: string): Promise<boolean>;
  getUserSubscriptions(userId: string): Promise<ProjectType[]>;
  isSubscribedToProject(userId: string, projectId: string): Promise<boolean>;
}

export class MongoStorage implements IMongoStorage {
  // --- Gamification helpers ---
  private async awardBadgeIfEligible(userId: Types.ObjectId, key: string, name: string, description: string, icon?: string) {
    try {
      const user = await User.findById(userId).select('badges');
      if (!user) return;
      const already = (user.badges || []).some((b: any) => b.key === key);
      if (already) return;
      await User.findByIdAndUpdate(userId, {
        $push: { badges: { key, name, description, icon, awardedAt: new Date() } }
      });
    } catch (e) {
      console.error('awardBadgeIfEligible error', e);
    }
  }

  private async evaluateBadgesForUser(userId: Types.ObjectId) {
    const user = await User.findById(userId).select('statistics badges createdAt');
    if (!user) return;
    const stats: any = user.statistics || {};
    // First project
    if ((stats.projectsCreated || 0) >= 1) {
      await this.awardBadgeIfEligible(userId, 'first_project', 'First Project', 'Created your first project', 'award');
    }
    // 10 comments
    if ((stats.commentsPosted || 0) >= 10) {
      await this.awardBadgeIfEligible(userId, 'ten_comments', 'Discussion Starter', 'Posted 10 comments', 'message-circle');
    }
    // Helpful answers
    if ((stats.helpfulAnswers || 0) >= 1) {
      await this.awardBadgeIfEligible(userId, 'first_helpful', 'Helpful', 'Your answer was accepted/helpful', 'thumbs-up');
    }
    // Early adopter (account within first 7 days of system?)
    try {
      const totalUsers = await User.countDocuments();
      if (totalUsers <= 1000) {
        await this.awardBadgeIfEligible(userId, 'early_adopter', 'Early Adopter', 'Joined in the early days', 'rocket');
      }
    } catch {}
  }
  
  // User operations
  async getUser(id: string): Promise<UserType | null> {
    try {
      const user = await User.findById(id);
      return user ? user.toObject() : null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  async getUserByUsername(username: string): Promise<UserType | null> {
    try {
      const user = await User.findOne({ username });
      return user ? user.toObject() : null;
    } catch (error) {
      console.error('Error getting user by username:', error);
      return null;
    }
  }

  async getUserByEmail(email: string): Promise<UserType | null> {
    try {
      const user = await User.findOne({ email });
      return user ? user.toObject() : null;
    } catch (error) {
      console.error('Error getting user by email:', error);
      return null;
    }
  }

  async createUser(userData: CreateUser): Promise<UserType> {
    try {
      const user = new User(userData);
      await user.save();
      return user.toObject();
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUser(id: string, updates: UpdateUser): Promise<UserType | null> {
    try {
      console.log('MongoStorage updateUser called with:', { id, updates });

      // Handle profile image removal (null or empty string should unset the field)
      if (updates.profileImage === null || updates.profileImage === '') {
        updates.profileImage = undefined;
      }
      
      const user = await User.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
      
      if (!user) {
        console.log('User not found for update:', id);
        return null;
      }

      console.log('User updated successfully in MongoDB:', user._id);
      return user.toObject();
    } catch (error) {
      console.error('Error updating user in MongoDB:', error);
      throw error; // Re-throw the error so it can be handled by the route
    }
  }

  async authenticateUser(email: string, password: string): Promise<UserType | null> {
    try {
      const user = await User.findOne({ email }).select('+password');
      if (!user || !await user.comparePassword(password)) {
        return null;
      }
      
      // Update last login
      user.lastLoginAt = new Date();
      await user.save();
      
      return user.toObject();
    } catch (error) {
      console.error('Error authenticating user:', error);
      return null;
    }
  }

  // Project operations
  async getProjects(filters: ProjectFilters = {}, pagination: PaginationParams = {}): Promise<{ projects: ProjectType[], total: number }> {
    try {
      const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
      const { status = 'active', tags, featured, ownerId, search } = filters;

      const query: any = { 
        status,
        isDeleted: false 
      };

      if (tags && tags.length > 0) {
        query.tags = { $in: tags };
      }

      if (featured !== undefined) {
        query.featured = featured;
      }

      if (ownerId) {
        query.ownerId = new Types.ObjectId(ownerId);
      }

      if (search && sortBy === 'relevance') {
        // Hybrid semantic + text search ranking
        const baseMatch: any = { status, isDeleted: false };
        if (tags && tags.length > 0) baseMatch.tags = { $in: tags };
        if (featured !== undefined) baseMatch.featured = featured;
        if (ownerId) baseMatch.ownerId = new Types.ObjectId(ownerId);

        // Try text-index candidates first
        const textQuery: any = { ...baseMatch, $text: { $search: search } };
        const candidates = await Project.find(textQuery, { score: { $meta: 'textScore' }, title: 1, description: 1, tags: 1, ownerId: 1, analytics: 1, createdAt: 1, lastActivityAt: 1, embedding: 1 })
          .sort({ score: { $meta: 'textScore' } })
          .limit(200)
          .lean();

        // Compute semantic similarity if embeddings are configured
        let ranked: any[] = candidates;
        try {
          const { azureOpenAIService } = await import('../services/azureOpenAI');
          if (azureOpenAIService.isEmbeddingConfigured()) {
            const [qvec] = await azureOpenAIService.getEmbeddings(search);
            if (Array.isArray(qvec) && qvec.length > 0) {
              const dot = (a: number[], b: number[]) => {
                const len = Math.min(a.length, b.length);
                let s = 0;
                for (let i = 0; i < len; i++) s += a[i] * b[i];
                return s;
              };
              const norm = (a: number[]) => Math.sqrt(a.reduce((s, v) => s + v * v, 0) || 1);
              const qn = norm(qvec);
              ranked = candidates.map((d: any) => {
                const ev = Array.isArray(d.embedding) ? d.embedding as number[] : [];
                const sim = ev.length > 0 ? dot(qvec, ev) / (qn * norm(ev)) : 0;
                const textScore = typeof (d as any).score === 'number' ? (d as any).score : 0;
                const pop = (d.analytics?.views || 0) + (d.analytics?.totalLikes || 0) * 3;
                const popScore = Math.log10(1 + pop);
                // Weighted blend; prioritize semantic and text relevance
                const relevance = 0.6 * sim + 0.3 * (textScore / 10) + 0.1 * popScore;
                return { d, relevance };
              }).sort((a, b) => b.relevance - a.relevance).map(x => x.d);
            }
          }
        } catch (e) {
          console.warn('Semantic re-ranking failed, using text score only');
        }

        const total = ranked.length;
        const pageItems = ranked.slice((page - 1) * limit, (page - 1) * limit + limit);
        const ids = pageItems.map((p: any) => p._id);
        const projects = await Project.find({ _id: { $in: ids } })
          .populate('ownerId', 'username fullName profileImage')
          .lean();
        // Maintain original order
        const idToDoc = new Map(projects.map((p: any) => [String(p._id), p]));
        const ordered = ids.map((id: any) => idToDoc.get(String(id))).filter(Boolean) as any[];
        return { projects: ordered as any, total };
      }

      const sort: any = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      const [projects, total] = await Promise.all([
        Project.find(query)
          .populate('ownerId', 'username fullName profileImage')
          .populate('collaborators', 'username fullName profileImage')
          .sort(sort)
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        Project.countDocuments(query)
      ]);

      return { projects, total };
    } catch (error) {
      console.error('Error getting projects:', error);
      throw error;
    }
  }

  async getProject(id: string, userId?: string): Promise<ProjectType | null> {
    try {
      const project = await Project.findById(id)
        .populate('ownerId', 'username fullName profileImage')
        .populate('collaborators', 'username fullName profileImage');
      
      if (project) {
        // Record view with authenticated user ID if available
        await this.recordProjectView(id, userId);
        return project; // Return the mongoose document, not the plain object
      }
      return null;
    } catch (error) {
      console.error('Error getting project:', error);
      return null;
    }
  }

  async createProject(projectData: any): Promise<ProjectType> {
    try {
      const project = new Project({
        ...projectData,
        ownerId: new Types.ObjectId(projectData.ownerId)
      });

      // Attempt to compute and store embedding
      try {
        const { azureOpenAIService } = await import('../services/azureOpenAI');
        if (azureOpenAIService.isEmbeddingConfigured()) {
          const text = `${project.title}\n${project.description}\nTags: ${(project.tags || []).join(', ')}`.slice(0, 12000);
          const [vec] = await azureOpenAIService.getEmbeddings(text);
          if (Array.isArray(vec) && vec.length > 0) {
            (project as any).embedding = vec;
          }
        }
      } catch (e) {
        console.warn('Embedding generation skipped on createProject');
      }

      await project.save();
      
      // Record activity
      await UserActivity.recordActivity(
        new Types.ObjectId(projectData.ownerId), 
        'project_created', 
        project._id
      );
      
      // Evaluate badges
      await this.evaluateBadgesForUser(new Types.ObjectId(projectData.ownerId));

      // Populate owner info for return
      await project.populate('ownerId', 'username fullName profileImage');
      return project.toObject();
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }

  async updateProject(id: string, updates: UpdateProject): Promise<ProjectType | null> {
    try {
      const project = await Project.findById(id);
      if (!project) return null;

      const prev = { title: project.title, description: project.description, tags: project.tags } as any;
      project.set(updates as any);

      const changedTitle = typeof (updates as any).title === 'string' && (updates as any).title !== prev.title;
      const changedDesc = typeof (updates as any).description === 'string' && (updates as any).description !== prev.description;
      const changedTags = Array.isArray((updates as any).tags) && JSON.stringify((updates as any).tags) !== JSON.stringify(prev.tags);
      if (changedTitle || changedDesc || changedTags) {
        try {
          const { azureOpenAIService } = await import('../services/azureOpenAI');
          if (azureOpenAIService.isEmbeddingConfigured()) {
            const text = `${project.title}\n${project.description}\nTags: ${(project.tags || []).join(', ')}`.slice(0, 12000);
            const [vec] = await azureOpenAIService.getEmbeddings(text);
            if (Array.isArray(vec) && vec.length > 0) {
              (project as any).embedding = vec;
            }
          }
        } catch (e) {
          console.warn('Embedding generation skipped on updateProject');
        }
      }

      await project.save();
      await project.populate('ownerId', 'username fullName profileImage');
      return project.toObject();
    } catch (error) {
      console.error('Error updating project:', error);
      return null;
    }
  }

  async deleteProject(id: string, userId: string): Promise<boolean> {
    try {
      // Check if user is admin
      const user = await User.findById(userId);
      const isAdmin = user?.role === 'admin';
      
      // Admin can delete any project, regular user only their own
      const query = isAdmin 
        ? { _id: id }
        : { _id: id, ownerId: userId };
      
      const project = await Project.findOneAndUpdate(
        query,
        { isDeleted: true, deletedAt: new Date() },
        { new: true }
      );
      return !!project;
    } catch (error) {
      console.error('Error deleting project:', error);
      return false;
    }
  }

  async getFeaturedProjects(): Promise<ProjectType[]> {
    try {
      const projects = await Project.find({ 
        featured: true, 
        status: 'active', 
        isDeleted: false 
      })
      .populate('ownerId', 'username fullName profileImage')
      .populate('collaborators', 'username fullName profileImage')
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();
      
      return projects;
    } catch (error) {
      console.error('Error getting featured projects:', error);
      return [];
    }
  }

  async getUserProjects(userId: string): Promise<ProjectType[]> {
    try {
      const projects = await Project.find({ 
        ownerId: userId,
        isDeleted: false 
      })
      .populate('ownerId', 'username fullName profileImage')
      .populate('collaborators', 'username fullName profileImage')
      .sort({ createdAt: -1 })
      .lean();
      
      return projects;
    } catch (error) {
      console.error('Error getting user projects:', error);
      return [];
    }
  }

  // Project Update operations
  async getProjectUpdates(projectId: string): Promise<any[]> {
    try {
      const project = await Project.findById(projectId).lean();
      if (!project) return [];

      // Sort updates by createdAt in descending order (newest first)
      const sortedUpdates = (project.updates || []).sort((a: any, b: any) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA; // Newest first
      });

      return sortedUpdates;
    } catch (error) {
      console.error('Error getting project updates:', error);
      return [];
    }
  }

  async createProjectUpdate(updateData: any): Promise<any> {
    try {
      const update = {
        title: updateData.title,
        content: updateData.content,
        media: updateData.media || [],
        createdAt: new Date(),
        authorId: new Types.ObjectId(updateData.authorId)
      };

      const project = await Project.findByIdAndUpdate(
        updateData.projectId,
        { 
          $push: { updates: update },
          lastActivityAt: new Date()
        },
        { new: true }
      );

      if (!project) {
        throw new Error('Project not found');
      }

      // Record activity for streak calculation
      await UserActivity.recordActivity(
        new Types.ObjectId(updateData.authorId), 
        'project_update', 
        new Types.ObjectId(updateData.projectId)
      );
      await this.evaluateBadgesForUser(new Types.ObjectId(updateData.authorId));

      // Return the newly added update
      const newUpdate = project.updates[project.updates.length - 1];
      return newUpdate;
    } catch (error) {
      console.error('Error creating project update:', error);
      throw error;
    }
  }

  // Comment operations
  async getComment(id: string): Promise<CommentType | null> {
    try {
      const comment = await Comment.findById(id)
        .populate('authorId', 'username fullName profileImage');
      return comment;
    } catch (error) {
      console.error('Error getting comment:', error);
      return null;
    }
  }

  async getProjectComments(projectId: string, filters: CommentFilters = {}): Promise<CommentType[]> {
    try {
      const query: any = {
        projectId: new Types.ObjectId(projectId),
        isDeleted: false
      };

      // Only filter by parentCommentId if specifically requested
      if (filters.parentCommentId !== undefined) {
        if (filters.parentCommentId) {
          query.parentCommentId = new Types.ObjectId(filters.parentCommentId);
        } else {
          query.parentCommentId = null; // Top-level comments only
        }
      }

      if (filters.type) {
        query.type = filters.type;
      }

      const comments = await Comment.find(query)
        .populate('authorId', 'username fullName profileImage')
        .sort({ 'tags.isPinned': -1, createdAt: -1 })
        .lean();

      return comments;
    } catch (error) {
      console.error('Error getting project comments:', error);
      return [];
    }
  }

  async createComment(commentData: any): Promise<CommentType> {
    try {
      const comment = new Comment({
        ...commentData,
        projectId: new Types.ObjectId(commentData.projectId),
        authorId: new Types.ObjectId(commentData.authorId),
        parentCommentId: commentData.parentCommentId ? new Types.ObjectId(commentData.parentCommentId) : undefined
      });
      await comment.save();
      
      // Record activity
      await UserActivity.recordActivity(
        new Types.ObjectId(commentData.authorId), 
        'comment', 
        comment._id
      );
      await this.evaluateBadgesForUser(new Types.ObjectId(commentData.authorId));
      
      // Populate for return
      await comment.populate('authorId', 'username fullName profileImage');
      return comment.toObject();
    } catch (error) {
      console.error('Error creating comment:', error);
      throw error;
    }
  }

  async updateComment(id: string, content: string, userId: string): Promise<CommentType | null> {
    try {
      const comment = await Comment.findOneAndUpdate(
        { _id: id, authorId: userId },
        { 
          content,
          edited: true,
          $push: { editHistory: { content, editedAt: new Date() } }
        },
        { new: true }
      ).populate('authorId', 'username fullName profileImage');
      
      return comment ? comment.toObject() : null;
    } catch (error) {
      console.error('Error updating comment:', error);
      return null;
    }
  }

  async deleteComment(id: string, userId: string): Promise<boolean> {
    try {
      // Check if user is admin
      const user = await User.findById(userId);
      const isAdmin = user?.role === 'admin';
      
      // Admin can delete any comment, regular user only their own
      const query = isAdmin 
        ? { _id: id }
        : { _id: id, authorId: userId };
      
      // First get the comment to check if it's already deleted
      const existingComment = await Comment.findOne(query);
      if (!existingComment || existingComment.isDeleted) {
        return false; // Comment not found or already deleted
      }
      
      // Update the comment - this will trigger the post-save middleware to update analytics
      const comment = await Comment.findOneAndUpdate(
        query,
        { isDeleted: true, deletedAt: new Date() },
        { new: true }
      );
      return !!comment;
    } catch (error) {
      console.error('Error deleting comment:', error);
      return false;
    }
  }

  // Event operations
  async getEvents(filters: EventFilters = {}, pagination: PaginationParams = {}): Promise<{ events: EventType[], total: number }> {
    try {
      const { page = 1, limit = 20 } = pagination;
      const { eventType, featured, upcoming, tags } = filters;

      const query: any = {};

      if (eventType) {
        query.eventType = eventType;
      }

      if (featured !== undefined) {
        query.isFeatured = featured;
      }

      if (upcoming) {
        query.startDateTime = { $gt: new Date() };
      }

      if (tags && tags.length > 0) {
        query.tags = { $in: tags };
      }

      const [events, total] = await Promise.all([
        Event.find(query)
          .populate('organizers', 'username fullName profileImage')
          .sort({ startDateTime: 1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        Event.countDocuments(query)
      ]);

      return { events, total };
    } catch (error) {
      console.error('Error getting events:', error);
      throw error;
    }
  }

  async getEvent(id: string): Promise<EventType | null> {
    try {
      const event = await Event.findById(id)
        .populate('organizers', 'username fullName profileImage');
      return event ? event.toObject() : null;
    } catch (error) {
      console.error('Error getting event:', error);
      return null;
    }
  }

  async createEvent(eventData: CreateEvent): Promise<EventType> {
    try {
      const event = new Event(eventData);
      await event.save();
      return event.toObject();
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  }

  async updateEvent(id: string, updates: Partial<CreateEvent>): Promise<EventType | null> {
    try {
      const event = await Event.findByIdAndUpdate(id, updates, { new: true })
        .populate('organizers', 'username fullName profileImage');
      return event ? event.toObject() : null;
    } catch (error) {
      console.error('Error updating event:', error);
      return null;
    }
  }

  async registerForEvent(eventId: string, userId: string): Promise<boolean> {
    try {
      const event = await Event.findById(eventId);
      if (!event) return false;
      
      return await event.registerAttendee(new Types.ObjectId(userId));
    } catch (error) {
      console.error('Error registering for event:', error);
      return false;
    }
  }

  // Category operations
  async getCategories(includeInactive: boolean = false): Promise<CategoryType[]> {
    try {
      const query = includeInactive ? {} : { isActive: true };
      const categories = await Category.find(query)
        .populate('createdBy', 'username fullName')
        .sort({ name: 1 })
        .lean();
      return categories;
    } catch (error) {
      console.error('Error getting categories:', error);
      return [];
    }
  }

  async getCategory(id: string): Promise<CategoryType | null> {
    try {
      const category = await Category.findById(id)
        .populate('createdBy', 'username fullName');
      return category ? category.toObject() : null;
    } catch (error) {
      console.error('Error getting category:', error);
      return null;
    }
  }

  async createCategory(categoryData: CreateCategory): Promise<CategoryType> {
    try {
      const category = new Category(categoryData);
      await category.save();
      return category.toObject();
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  }

  async updateCategory(id: string, updates: UpdateCategory): Promise<CategoryType | null> {
    try {
      const category = await Category.findByIdAndUpdate(id, updates, { new: true })
        .populate('createdBy', 'username fullName');
      return category ? category.toObject() : null;
    } catch (error) {
      console.error('Error updating category:', error);
      return null;
    }
  }

  async deleteCategory(id: string): Promise<boolean> {
    try {
      const result = await Category.findByIdAndUpdate(id, { isActive: false }, { new: true });
      return !!result;
    } catch (error) {
      console.error('Error deleting category:', error);
      return false;
    }
  }

  async getPopularTags(limit: number = 20): Promise<{ tag: string, count: number }[]> {
    try {
      const pipeline = [
        { $match: { status: 'active', isDeleted: false } },
        { $unwind: '$tags' },
        { $group: { _id: '$tags', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: limit },
        { $project: { tag: '$_id', count: 1, _id: 0 } }
      ];

      const popularTags = await Project.aggregate(pipeline);
      return popularTags;
    } catch (error) {
      console.error('Error getting popular tags:', error);
      return [];
    }
  }

  // Analytics operations
  async recordProjectView(projectId: string, userId?: string): Promise<void> {
    try {
      const userObjectId = userId ? new Types.ObjectId(userId) : undefined;
      
      // Update detailed analytics in ProjectAnalytics collection
      await ProjectAnalytics.recordView(new Types.ObjectId(projectId), userObjectId);
      
      // Also update the project's own analytics.views field that the frontend displays
      const project = await Project.findById(projectId);
      if (project) {
        await project.incrementViews(userObjectId);
      }
    } catch (error) {
      console.error('Error recording project view:', error);
    }
  }

  async recordProjectShare(projectId: string, platform: string, userId?: string): Promise<void> {
    try {
      const userObjectId = userId ? new Types.ObjectId(userId) : undefined;
      
      // Update detailed analytics in ProjectAnalytics collection
      await ProjectAnalytics.recordShare(new Types.ObjectId(projectId), platform);
      
      // Also update the project's own analytics.shares field
      const project = await Project.findById(projectId);
      if (project) {
        await project.incrementShares(platform, userObjectId);
      }
    } catch (error) {
      console.error('Error recording project share:', error);
    }
  }

  async getProjectAnalytics(projectId: string): Promise<any> {
    try {
      const analytics = await ProjectAnalytics.getProjectStats(
        new Types.ObjectId(projectId),
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        new Date()
      );
      return analytics[0] || {};
    } catch (error) {
      console.error('Error getting project analytics:', error);
      return {};
    }
  }

  async getTrendingProjects(): Promise<ProjectType[]> {
    try {
      const trending = await ProjectAnalytics.getTrendingProjects(7, 10);
      const projectIds = trending.map(t => t._id);
      
      const projects = await Project.find({ 
        _id: { $in: projectIds },
        status: 'active',
        isDeleted: false 
      })
      .populate('ownerId', 'username fullName profileImage')
      .lean();
      
      return projects;
    } catch (error) {
      console.error('Error getting trending projects:', error);
      return [];
    }
  }

  async getContributorLeaderboard(periodDays: number = 30, limit: number = 10): Promise<Array<{ userId: Types.ObjectId; username: string; fullName: string; profileImage?: string; totalViews: number; totalComments: number; totalLikes: number; score: number }>> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - periodDays);
      startDate.setHours(0, 0, 0, 0);

      // Aggregate recent views/comments per project
      const agg = await ProjectAnalytics.aggregate([
        { $match: { date: { $gte: startDate } } },
        { $group: { _id: '$projectId', views: { $sum: '$metrics.views' }, comments: { $sum: '$metrics.comments' } } },
        { $lookup: { from: 'projects', localField: '_id', foreignField: '_id', as: 'project' } },
        { $unwind: '$project' },
        { $match: { 'project.status': 'active', 'project.isDeleted': false } },
        { $group: { _id: '$project.ownerId', totalViews: { $sum: '$views' }, totalComments: { $sum: '$comments' }, projectIds: { $addToSet: '$project._id' } } },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $unwind: '$user' },
      ]);

      // Compute likes (current) for each owner's projects
      const results: Array<{ userId: any; username: string; fullName: string; profileImage?: string; totalViews: number; totalComments: number; totalLikes: number; score: number }> = [];
      for (const row of agg) {
        const ownerId = row._id as Types.ObjectId;
        const projects = await Project.find({ ownerId, isDeleted: false }).select('analytics likes');
        const totalLikes = projects.reduce((sum: number, p: any) => sum + (p.analytics?.totalLikes || (p.likes?.length || 0)), 0);
        const score = (row.totalViews || 0) + (row.totalComments || 0) * 5 + totalLikes * 2;
        results.push({
          userId: ownerId,
          username: row.user.username,
          fullName: row.user.fullName,
          profileImage: row.user.profileImage,
          totalViews: row.totalViews || 0,
          totalComments: row.totalComments || 0,
          totalLikes,
          score,
        });
      }
      results.sort((a, b) => b.score - a.score);
      return results.slice(0, limit);
    } catch (error) {
      console.error('Error building contributor leaderboard:', error);
      return [];
    }
  }

  // Subscription operations
  async subscribeToProject(userId: string, projectId: string): Promise<boolean> {
    try {
      const subscription = await Subscription.findOneAndUpdate(
        { userId: new Types.ObjectId(userId), projectId: new Types.ObjectId(projectId) },
        { isActive: true },
        { upsert: true, new: true }
      );
      return !!subscription;
    } catch (error) {
      console.error('Error subscribing to project:', error);
      return false;
    }
  }

  async unsubscribeFromProject(userId: string, projectId: string): Promise<boolean> {
    try {
      const subscription = await Subscription.findOneAndUpdate(
        { userId: new Types.ObjectId(userId), projectId: new Types.ObjectId(projectId) },
        { isActive: false },
        { new: true }
      );
      return !!subscription;
    } catch (error) {
      console.error('Error unsubscribing from project:', error);
      return false;
    }
  }

  async getUserSubscriptions(userId: string): Promise<ProjectType[]> {
    try {
      const subscriptions = await Subscription.find({ 
        userId: new Types.ObjectId(userId), 
        isActive: true 
      }).populate({
        path: 'projectId',
        populate: {
          path: 'ownerId',
          select: 'username fullName profileImage'
        }
      });
      
      return subscriptions.map(sub => sub.projectId).filter(Boolean);
    } catch (error) {
      console.error('Error getting user subscriptions:', error);
      return [];
    }
  }

  async isSubscribedToProject(userId: string, projectId: string): Promise<boolean> {
    try {
      const subscription = await Subscription.findOne({
        userId: new Types.ObjectId(userId),
        projectId: new Types.ObjectId(projectId),
        isActive: true
      });
      return !!subscription;
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return false;
    }
  }

  async getRecommendedProjects(userId: string, limit: number = 12): Promise<ProjectType[]> {
    try {
      const user = await User.findById(userId).lean();
      if (!user) return [];

      const followedUserIds = (user.following || []).map((id: any) => new Types.ObjectId(id));

      const [ownedProjects, likedProjects, subscribedProjects] = await Promise.all([
        Project.find({ ownerId: user._id, isDeleted: false }).select('tags _id analytics').lean(),
        Project.find({ likes: user._id, isDeleted: false }).select('tags _id analytics').lean(),
        Subscription.find({ userId: user._id, isActive: true }).populate('projectId', 'tags analytics').lean() as any,
      ]);

      const tagCounts: Record<string, number> = {};
      const addTags = (tags?: string[] | undefined | null, weight: number = 1) => {
        (tags || []).forEach(t => {
          const tag = String(t).toLowerCase();
          tagCounts[tag] = (tagCounts[tag] || 0) + weight;
        });
      };

      for (const p of ownedProjects) { addTags(p.tags, 3); }
      for (const p of likedProjects) { addTags(p.tags, 2); }
      for (const s of subscribedProjects) { if (s.projectId) { addTags((s.projectId as any).tags, 2); } }

      const topTags = Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([tag]) => tag);

      const query: any = {
        status: 'active',
        isDeleted: false,
      };

      if (topTags.length > 0) {
        query.tags = { $in: topTags };
      }

      const projects = await Project.find(query)
        .populate('ownerId', 'username fullName profileImage')
        .sort({ featured: -1, lastActivityAt: -1, 'analytics.views': -1 })
        .limit(limit * 2)
        .lean();

      // Attempt user interest embedding from liked/owned/subscribed
      let userVec: number[] | null = null;
      try {
        const ids: Types.ObjectId[] = [
          ...ownedProjects.map((p: any) => p._id),
          ...likedProjects.map((p: any) => p._id),
          ...subscribedProjects.map((s: any) => s.projectId?._id).filter(Boolean),
        ];
        if (ids.length > 0) {
          const withEmb = await Project.find({ _id: { $in: ids } }).select('embedding').lean();
          const vecs = withEmb.map((row: any) => row.embedding).filter((v: any) => Array.isArray(v) && v.length > 0) as number[][];
          if (vecs.length > 0) {
            const dim = vecs[0].length;
            const sum = new Array(dim).fill(0);
            for (const v of vecs) {
              for (let i = 0; i < dim; i++) sum[i] += v[i] || 0;
            }
            userVec = sum.map(x => x / vecs.length);
          }
        }
      } catch {}

      const dot = (a: number[], b: number[]) => {
        const len = Math.min(a.length, b.length);
        let s = 0; for (let i = 0; i < len; i++) s += a[i] * b[i]; return s;
      };
      const norm = (a: number[]) => Math.sqrt(a.reduce((s, v) => s + v * v, 0) || 1);

      const scored = projects.map((p: any) => {
        let score = 0;
        const tags: string[] = p.tags || [];
        for (const tag of tags) {
          score += (tagCounts[String(tag).toLowerCase()] || 0);
        }
        if (followedUserIds.some(fid => fid.equals(p.ownerId?._id))) {
          score += 5;
        }
        score += Math.min(5, Math.floor(((p.analytics?.views || 0) + (p.analytics?.totalLikes || 0)) / 50));
        if (userVec && Array.isArray(p.embedding) && p.embedding.length > 0) {
          const sim = dot(userVec, p.embedding) / (norm(userVec) * norm(p.embedding));
          score += Math.max(0, sim) * 5; // up to +5 bonus from semantic affinity
        }
        return { p, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ p }) => p);

      return scored as any;
    } catch (error) {
      console.error('Error getting recommended projects:', error);
      return [];
    }
  }

  async getPersonalizedFeed(userId: string, params: { page?: number; limit?: number } = {}): Promise<{ items: ProjectType[]; total: number }> {
    try {
      const { page = 1, limit = 20 } = params;
      const user = await User.findById(userId).select('following').lean();
      if (!user) return { items: [], total: 0 };

      const followingIds = (user.following || []).map((id: any) => new Types.ObjectId(id));
      if (followingIds.length === 0) {
        const items = await this.getTrendingProjects();
        return { items, total: items.length };
      }

      const query: any = {
        ownerId: { $in: followingIds },
        status: 'active',
        isDeleted: false,
      };

      const [items, total] = await Promise.all([
        Project.find(query)
          .populate('ownerId', 'username fullName profileImage')
          .sort({ lastActivityAt: -1, createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        Project.countDocuments(query)
      ]);

      return { items, total };
    } catch (error) {
      console.error('Error getting personalized feed:', error);
      return { items: [], total: 0 };
    }
  }

  async followUser(followerId: string, targetUserId: string): Promise<boolean> {
    try {
      if (followerId === targetUserId) return false;
      const followerObjectId = new Types.ObjectId(followerId);
      const targetObjectId = new Types.ObjectId(targetUserId);

      const [u1, u2] = await Promise.all([
        User.findByIdAndUpdate(followerObjectId, { $addToSet: { following: targetObjectId } }, { new: true }),
        User.findByIdAndUpdate(targetObjectId, { $addToSet: { followers: followerObjectId } }, { new: true }),
      ]);
      return !!(u1 && u2);
    } catch (error) {
      console.error('Error following user:', error);
      return false;
    }
  }

  async unfollowUser(followerId: string, targetUserId: string): Promise<boolean> {
    try {
      if (followerId === targetUserId) return false;
      const followerObjectId = new Types.ObjectId(followerId);
      const targetObjectId = new Types.ObjectId(targetUserId);

      const [u1, u2] = await Promise.all([
        User.findByIdAndUpdate(followerObjectId, { $pull: { following: targetObjectId } }, { new: true }),
        User.findByIdAndUpdate(targetObjectId, { $pull: { followers: followerObjectId } }, { new: true }),
      ]);
      return !!(u1 && u2);
    } catch (error) {
      console.error('Error unfollowing user:', error);
      return false;
    }
  }

  async getFollowers(userId: string): Promise<Array<Pick<UserType, '_id' | 'username' | 'fullName' | 'profileImage'>>> {
    try {
      const user = await User.findById(userId).select('followers isFollowersListPublic').lean();
      if (!user) return [] as any;
      const ids = (user.followers || []) as any[];
      if (!user.isFollowersListPublic) return [] as any;
      const followers = await User.find({ _id: { $in: ids } }).select('_id username fullName profileImage').lean();
      return followers as any;
    } catch (error) {
      console.error('Error getting followers:', error);
      return [] as any;
    }
  }

  async getFollowing(userId: string): Promise<Array<Pick<UserType, '_id' | 'username' | 'fullName' | 'profileImage'>>> {
    try {
      const user = await User.findById(userId).select('following isFollowingListPublic').lean();
      if (!user) return [] as any;
      const ids = (user.following || []) as any[];
      if (!user.isFollowingListPublic) return [] as any;
      const following = await User.find({ _id: { $in: ids } }).select('_id username fullName profileImage').lean();
      return following as any;
    } catch (error) {
      console.error('Error getting following:', error);
      return [] as any;
    }
  }
}

export const mongoStorage = new MongoStorage();