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

  async getSubscriptionStatus(id: string): Promise<ApiResponse<{ isSubscribed: boolean }>> {
    const response = await fetch(`${API_BASE}/projects/${id}/subscription-status`, {
      credentials: 'include',
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

// Utility function to check API health
export const healthCheck = async (): Promise<ApiResponse> => {
  const response = await fetch(`${API_BASE}/health`);
  return handleResponse(response);
};