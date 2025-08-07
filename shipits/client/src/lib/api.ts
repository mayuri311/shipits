/**
 * API Service Layer
 * All API calls to our MongoDB backend
 */

import type { 
  User, Project, Comment, Event, 
  CreateUser, CreateProject, CreateComment, CreateEvent,
  UpdateUser, UpdateProject,
  LoginRequest, RegisterRequest,
  ApiResponse, PaginatedResponse 
} from '@shared/schema';

const API_BASE = '/api';

// Helper function to handle API responses
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || error.message || `HTTP ${response.status}`);
  }
  return response.json();
}

// Authentication API
export const authApi = {
  async register(userData: RegisterRequest): Promise<ApiResponse<{ user: User }>> {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(userData),
    });
    return handleResponse(response);
  },

  async login(credentials: LoginRequest): Promise<ApiResponse<{ user: User }>> {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(credentials),
    });
    return handleResponse(response);
  },

  async logout(): Promise<ApiResponse> {
    const response = await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    return handleResponse(response);
  },

  async getCurrentUser(): Promise<ApiResponse<{ user: User }>> {
    const response = await fetch(`${API_BASE}/auth/me`, {
      credentials: 'include',
    });
    return handleResponse(response);
  },
};

// Projects API
export const projectsApi = {
  async getProjects(params: {
    page?: number;
    limit?: number;
    status?: string;
    tags?: string[];
    featured?: boolean;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<PaginatedResponse<Project>> {
    const searchParams = new URLSearchParams();
    
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.status) searchParams.set('status', params.status);
    if (params.tags?.length) searchParams.set('tags', params.tags.join(','));
    if (params.featured !== undefined) searchParams.set('featured', params.featured.toString());
    if (params.search) searchParams.set('search', params.search);
    if (params.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);

    const response = await fetch(`${API_BASE}/projects?${searchParams}`, {
      credentials: 'include',
    });
    return handleResponse(response);
  },

  async getFeaturedProjects(): Promise<ApiResponse<{ projects: Project[] }>> {
    const response = await fetch(`${API_BASE}/projects/featured`, {
      credentials: 'include',
    });
    return handleResponse(response);
  },

  async getTrendingProjects(): Promise<ApiResponse<{ projects: Project[] }>> {
    const response = await fetch(`${API_BASE}/projects/trending`, {
      credentials: 'include',
    });
    return handleResponse(response);
  },

  async getProject(id: string): Promise<ApiResponse<{ project: Project }>> {
    const response = await fetch(`${API_BASE}/projects/${id}`, {
      credentials: 'include',
    });
    return handleResponse(response);
  },

  async createProject(projectData: CreateProject): Promise<ApiResponse<{ project: Project }>> {
    const response = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(projectData),
    });
    return handleResponse(response);
  },

  async updateProject(id: string, updates: UpdateProject): Promise<ApiResponse<{ project: Project }>> {
    const response = await fetch(`${API_BASE}/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updates),
    });
    return handleResponse(response);
  },

  async deleteProject(id: string): Promise<ApiResponse> {
    const response = await fetch(`${API_BASE}/projects/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    return handleResponse(response);
  },

  async adminDeleteProject(id: string): Promise<ApiResponse> {
    const response = await fetch(`${API_BASE}/admin/projects/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    return handleResponse(response);
  },

  async subscribeToProject(id: string): Promise<ApiResponse> {
    const response = await fetch(`${API_BASE}/projects/${id}/subscribe`, {
      method: 'POST',
      credentials: 'include',
    });
    return handleResponse(response);
  },

  async unsubscribeFromProject(id: string): Promise<ApiResponse> {
    const response = await fetch(`${API_BASE}/projects/${id}/subscribe`, {
      method: 'DELETE',
      credentials: 'include',
    });
    return handleResponse(response);
  },

  async getProjectUpdates(id: string): Promise<ApiResponse<{ updates: any[] }>> {
    const response = await fetch(`${API_BASE}/projects/${id}/updates`, {
      credentials: 'include',
    });
    return handleResponse(response);
  },

  async createProjectUpdate(id: string, updateData: { title: string; content: string; media?: any[] }): Promise<ApiResponse<{ update: any }>> {
    const response = await fetch(`${API_BASE}/projects/${id}/updates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updateData),
    });
    return handleResponse(response);
  },

  async likeProject(id: string): Promise<ApiResponse<{ totalLikes: number; isLiked: boolean }>> {
    const response = await fetch(`${API_BASE}/projects/${id}/like`, {
      method: 'POST',
      credentials: 'include',
    });
    return handleResponse(response);
  },

  async unlikeProject(id: string): Promise<ApiResponse<{ totalLikes: number; isLiked: boolean }>> {
    const response = await fetch(`${API_BASE}/projects/${id}/like`, {
      method: 'DELETE',
      credentials: 'include',
    });
    return handleResponse(response);
  },

  async getSubscriptionStatus(id: string): Promise<ApiResponse<{ isSubscribed: boolean }>> {
    const response = await fetch(`${API_BASE}/projects/${id}/subscription-status`, {
      credentials: 'include',
    });
    return handleResponse(response);
  },

  async recordShare(id: string, platform: string): Promise<ApiResponse> {
    const response = await fetch(`${API_BASE}/projects/${id}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ platform }),
    });
    return handleResponse(response);
  },
};

// File Upload API
export const uploadApi = {
  async uploadImages(files: FileList): Promise<ApiResponse<{ files: Array<{ filename: string; originalName: string; data: string; size: number; mimetype: string }> }>> {
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('images', files[i]);
    }

    const response = await fetch(`${API_BASE}/upload/images`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    return handleResponse(response);
  },

  async uploadProcessedImages(processedImages: Array<{ filename: string; originalName: string; data: string; size: number; mimetype: string }>): Promise<ApiResponse<{ files: Array<{ filename: string; originalName: string; data: string; size: number; mimetype: string }> }>> {
    const response = await fetch(`${API_BASE}/upload/processed-images`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ images: processedImages }),
    });
    return handleResponse(response);
  },

  async uploadFiles(files: FileList): Promise<ApiResponse<{ files: Array<{ type: string; filename: string; originalName: string; data?: string; url?: string; size: number; mimetype: string; category: string; icon: string }> }>> {
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    const response = await fetch(`${API_BASE}/upload/files`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    return handleResponse(response);
  },
};

// Comments API
export const commentsApi = {
  async getProjectComments(projectId: string, params: {
    parentCommentId?: string;
    type?: 'general' | 'question' | 'improvement' | 'answer';
  } = {}): Promise<ApiResponse<{ comments: Comment[] }>> {
    const searchParams = new URLSearchParams();
    if (params.parentCommentId) searchParams.set('parentCommentId', params.parentCommentId);
    if (params.type) searchParams.set('type', params.type);

    const response = await fetch(`${API_BASE}/projects/${projectId}/comments?${searchParams}`, {
      credentials: 'include',
    });
    return handleResponse(response);
  },

  async createComment(projectId: string, commentData: Omit<CreateComment, 'projectId' | 'authorId'>): Promise<ApiResponse<{ comment: Comment }>> {
    const response = await fetch(`${API_BASE}/projects/${projectId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(commentData),
    });
    return handleResponse(response);
  },

  async updateComment(id: string, content: string): Promise<ApiResponse<{ comment: Comment }>> {
    const response = await fetch(`${API_BASE}/comments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ content }),
    });
    return handleResponse(response);
  },

  async deleteComment(id: string): Promise<ApiResponse> {
    const response = await fetch(`${API_BASE}/comments/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    return handleResponse(response);
  },

  async adminDeleteComment(id: string): Promise<ApiResponse> {
    const response = await fetch(`${API_BASE}/admin/comments/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    return handleResponse(response);
  },

  async addReaction(id: string, type: string = 'like'): Promise<ApiResponse<{ reactions: any[]; totalReactions: number }>> {
    const response = await fetch(`${API_BASE}/comments/${id}/reaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ type }),
    });
    return handleResponse(response);
  },

  async removeReaction(id: string): Promise<ApiResponse<{ reactions: any[]; totalReactions: number }>> {
    const response = await fetch(`${API_BASE}/comments/${id}/reaction`, {
      method: 'DELETE',
      credentials: 'include',
    });
    return handleResponse(response);
  },

  async getThreadSummary(projectId: string): Promise<ApiResponse<{ summary: string | null; lastUpdated?: Date; commentCount?: number; hasSummary: boolean }>> {
    const response = await fetch(`${API_BASE}/projects/${projectId}/summary`, {
      credentials: 'include',
    });
    return handleResponse(response);
  },

  async generateThreadSummary(projectId: string): Promise<ApiResponse<{ summary: string; lastUpdated: Date; commentCount: number; generated: boolean }>> {
    const response = await fetch(`${API_BASE}/projects/${projectId}/summary/generate`, {
      method: 'POST',
      credentials: 'include',
    });
    return handleResponse(response);
  },
};

// Events API
export const eventsApi = {
  async getEvents(params: {
    page?: number;
    limit?: number;
    eventType?: 'major' | 'minor' | 'workshop' | 'meetup';
    featured?: boolean;
    upcoming?: boolean;
    tags?: string[];
  } = {}): Promise<PaginatedResponse<Event>> {
    const searchParams = new URLSearchParams();
    
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.eventType) searchParams.set('eventType', params.eventType);
    if (params.featured !== undefined) searchParams.set('featured', params.featured.toString());
    if (params.upcoming !== undefined) searchParams.set('upcoming', params.upcoming.toString());
    if (params.tags?.length) searchParams.set('tags', params.tags.join(','));

    const response = await fetch(`${API_BASE}/events?${searchParams}`, {
      credentials: 'include',
    });
    return handleResponse(response);
  },

  async getEvent(id: string): Promise<ApiResponse<{ event: Event }>> {
    const response = await fetch(`${API_BASE}/events/${id}`, {
      credentials: 'include',
    });
    return handleResponse(response);
  },

  async createEvent(eventData: CreateEvent): Promise<ApiResponse<{ event: Event }>> {
    const response = await fetch(`${API_BASE}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(eventData),
    });
    return handleResponse(response);
  },

  async registerForEvent(id: string): Promise<ApiResponse> {
    const response = await fetch(`${API_BASE}/events/${id}/register`, {
      method: 'POST',
      credentials: 'include',
    });
    return handleResponse(response);
  },
};

// Users API
export const usersApi = {
  async getUser(id: string): Promise<ApiResponse<{ user: User }>> {
    const response = await fetch(`${API_BASE}/users/${id}`, {
      credentials: 'include',
    });
    return handleResponse(response);
  },

  async updateUser(id: string, updates: UpdateUser): Promise<ApiResponse<{ user: User }>> {
    const response = await fetch(`${API_BASE}/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updates),
    });
    return handleResponse(response);
  },

  async getUserSubscriptions(id: string): Promise<ApiResponse<{ projects: Project[] }>> {
    const response = await fetch(`${API_BASE}/users/${id}/subscriptions`, {
      credentials: 'include',
    });
    return handleResponse(response);
  },
};

// Categories API
export const categoriesApi = {
  async getCategories(includeInactive: boolean = false): Promise<ApiResponse<{ categories: any[] }>> {
    const response = await fetch(`${API_BASE}/categories?includeInactive=${includeInactive}`, {
      credentials: 'include',
    });
    return handleResponse(response);
  },

  async getCategory(id: string): Promise<ApiResponse<{ category: any }>> {
    const response = await fetch(`${API_BASE}/categories/${id}`, {
      credentials: 'include',
    });
    return handleResponse(response);
  },

  async createCategory(categoryData: any): Promise<ApiResponse<{ category: any }>> {
    const response = await fetch(`${API_BASE}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(categoryData),
    });
    return handleResponse(response);
  },

  async updateCategory(id: string, updates: any): Promise<ApiResponse<{ category: any }>> {
    const response = await fetch(`${API_BASE}/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updates),
    });
    return handleResponse(response);
  },

  async deleteCategory(id: string): Promise<ApiResponse> {
    const response = await fetch(`${API_BASE}/categories/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    return handleResponse(response);
  },
};

// Tags API
export const tagsApi = {
  async getPopularTags(limit: number = 20): Promise<ApiResponse<{ tags: { tag: string, count: number }[] }>> {
    const response = await fetch(`${API_BASE}/tags/popular?limit=${limit}`, {
      credentials: 'include',
    });
    return handleResponse(response);
  },
};

// Admin API
export const adminApi = {
  async testAccess(): Promise<ApiResponse<any>> {
    const response = await fetch(`${API_BASE}/admin/test`, {
      credentials: 'include',
    });
    return handleResponse(response);
  },

  async getAnalytics(timeframe: string = '7d'): Promise<ApiResponse<any>> {
    const response = await fetch(`${API_BASE}/admin/analytics?timeframe=${timeframe}`, {
      credentials: 'include',
    });
    return handleResponse(response);
  },

  async getUserAnalytics(timeframe: string = '7d'): Promise<ApiResponse<any>> {
    const response = await fetch(`${API_BASE}/admin/analytics/users?timeframe=${timeframe}`, {
      credentials: 'include',
    });
    return handleResponse(response);
  },

  async getProjectAnalytics(timeframe: string = '7d'): Promise<ApiResponse<any>> {
    const response = await fetch(`${API_BASE}/admin/analytics/projects?timeframe=${timeframe}`, {
      credentials: 'include',
    });
    return handleResponse(response);
  },

  async getEngagementAnalytics(timeframe: string = '7d'): Promise<ApiResponse<any>> {
    const response = await fetch(`${API_BASE}/admin/analytics/engagement?timeframe=${timeframe}`, {
      credentials: 'include',
    });
    return handleResponse(response);
  },

  async queryAI(query: string): Promise<ApiResponse<{ answer: string; context?: any }>> {
    const response = await fetch(`${API_BASE}/admin/ai-query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ query }),
    });
    return handleResponse(response);
  },

  async getAllUsers(params: {
    page?: number;
    limit?: number;
    role?: string;
    isActive?: boolean;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<PaginatedResponse<User>> {
    const searchParams = new URLSearchParams();
    
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.role) searchParams.set('role', params.role);
    if (params.isActive !== undefined) searchParams.set('isActive', params.isActive.toString());
    if (params.search) searchParams.set('search', params.search);
    if (params.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);

    const response = await fetch(`${API_BASE}/admin/users?${searchParams}`, {
      credentials: 'include',
    });
    return handleResponse(response);
  },

  async updateUserRole(userId: string, role: 'user' | 'moderator' | 'admin'): Promise<ApiResponse<{ user: User }>> {
    const response = await fetch(`${API_BASE}/admin/users/${userId}/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ role }),
    });
    return handleResponse(response);
  },

  async toggleUserStatus(userId: string): Promise<ApiResponse<{ user: User }>> {
    const response = await fetch(`${API_BASE}/admin/users/${userId}/toggle-status`, {
      method: 'PUT',
      credentials: 'include',
    });
    return handleResponse(response);
  },

  async deleteUser(userId: string): Promise<ApiResponse> {
    const response = await fetch(`${API_BASE}/admin/users/${userId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    return handleResponse(response);
  },

  async getAllProjects(params: {
    page?: number;
    limit?: number;
    status?: string;
    featured?: boolean;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<PaginatedResponse<Project>> {
    const searchParams = new URLSearchParams();
    
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.status) searchParams.set('status', params.status);
    if (params.featured !== undefined) searchParams.set('featured', params.featured.toString());
    if (params.search) searchParams.set('search', params.search);
    if (params.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);

    const response = await fetch(`${API_BASE}/admin/projects?${searchParams}`, {
      credentials: 'include',
    });
    return handleResponse(response);
  },

  async toggleProjectFeatured(projectId: string): Promise<ApiResponse<{ project: Project }>> {
    const response = await fetch(`${API_BASE}/admin/projects/${projectId}/toggle-featured`, {
      method: 'PUT',
      credentials: 'include',
    });
    return handleResponse(response);
  },

  async updateProjectStatus(projectId: string, status: string): Promise<ApiResponse<{ project: Project }>> {
    const response = await fetch(`${API_BASE}/admin/projects/${projectId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status }),
    });
    return handleResponse(response);
  },

  async getSystemStats(): Promise<ApiResponse<any>> {
    const response = await fetch(`${API_BASE}/admin/system/stats`, {
      credentials: 'include',
    });
    return handleResponse(response);
  },

  async getRecentActivity(limit: number = 20): Promise<ApiResponse<any>> {
    const response = await fetch(`${API_BASE}/admin/activity/recent?limit=${limit}`, {
      credentials: 'include',
    });
    return handleResponse(response);
  },

  async getModerationLogs(params: {
    page?: number;
    limit?: number;
    action?: string;
    targetType?: string;
  } = {}): Promise<PaginatedResponse<any>> {
    const searchParams = new URLSearchParams();
    
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.action) searchParams.set('action', params.action);
    if (params.targetType) searchParams.set('targetType', params.targetType);

    const response = await fetch(`${API_BASE}/admin/moderation/logs?${searchParams}`, {
      credentials: 'include',
    });
    return handleResponse(response);
  },

  async exportData(type: 'users' | 'projects' | 'comments' | 'analytics'): Promise<Response> {
    const response = await fetch(`${API_BASE}/admin/export/${type}`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }
    return response;
  },

  async getDatabaseHealth(): Promise<ApiResponse<any>> {
    const response = await fetch(`${API_BASE}/admin/system/health`, {
      credentials: 'include',
    });
    return handleResponse(response);
  },
};

// Notifications API
export const notificationsApi = {
  async getNotifications(params: {
    page?: number;
    limit?: number;
    includeRead?: boolean;
  } = {}): Promise<ApiResponse<{ 
    notifications: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    }
  }>> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.includeRead) searchParams.set('includeRead', params.includeRead.toString());

    const response = await fetch(`${API_BASE}/notifications?${searchParams}`, {
      credentials: 'include',
    });
    return handleResponse(response);
  },

  async getUnreadCount(): Promise<ApiResponse<{ count: number }>> {
    const response = await fetch(`${API_BASE}/notifications/unread/count`, {
      credentials: 'include',
    });
    return handleResponse(response);
  },

  async markAsRead(id: string): Promise<ApiResponse<{ notification: any }>> {
    const response = await fetch(`${API_BASE}/notifications/${id}/read`, {
      method: 'PUT',
      credentials: 'include',
    });
    return handleResponse(response);
  },

  async markAllAsRead(): Promise<ApiResponse<{ modifiedCount: number }>> {
    const response = await fetch(`${API_BASE}/notifications/mark-all-read`, {
      method: 'PUT',
      credentials: 'include',
    });
    return handleResponse(response);
  },

  async deleteNotification(id: string): Promise<ApiResponse> {
    const response = await fetch(`${API_BASE}/notifications/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    return handleResponse(response);
  },
};

// Dashboard API
export const dashboardApi = {
  async getDashboardData(): Promise<ApiResponse<{
    user: User;
    projects: {
      owned: Project[];
      liked: Project[];
      subscribed: Project[];
    };
    recentComments: Comment[];
    statistics: {
      totalProjectsCreated: number;
      totalCommentsPosted: number;
      totalLikesReceived: number;
      totalProjectViews: number;
      unreadNotifications: number;
    };
    recentActivity: Array<{
      id: string;
      action: string;
      details: string;
      timestamp: Date;
      type: string;
    }>;
  }>> {
    const response = await fetch(`${API_BASE}/dashboard`, {
      credentials: 'include',
    });
    return handleResponse(response);
  },
};

// Contact API
export const contactApi = {
  async submitContactForm(contactData: {
    name: string;
    email: string;
    message: string;
  }): Promise<ApiResponse<{ id: string; createdAt: Date }>> {
    const response = await fetch(`${API_BASE}/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(contactData),
    });
    return handleResponse(response);
  },
};

// Utility function to check API health
export const healthCheck = async (): Promise<ApiResponse> => {
  const response = await fetch(`${API_BASE}/health`);
  return handleResponse(response);
};