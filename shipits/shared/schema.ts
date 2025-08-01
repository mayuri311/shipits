import { z } from "zod";
import { Types } from "mongoose";

// MongoDB User Schema Validation
export const userSchema = z.object({
  _id: z.instanceof(Types.ObjectId).optional(),
  cmuId: z.string().optional(),
  email: z.string().email(),
  username: z.string().min(3).max(30),
  password: z.string().min(6).optional(),
  fullName: z.string().max(100).optional(),
  college: z.enum([
    'School of Computer Science',
    'Carnegie Institute of Technology',
    'College of Engineering',
    'College of Fine Arts',
    'Dietrich College of Humanities and Social Sciences',
    'Heinz College of Information Systems and Public Policy',
    'Mellon College of Science',
    'Tepper School of Business',
    'Other'
  ]).optional(),
  graduationYear: z.number().min(2020).max(2035).optional(),
  profileImage: z.string().url().optional(),
  bio: z.string().max(500).optional(),
  contactInfo: z.object({
    phone: z.string().optional(),
    linkedin: z.string().optional(),
    github: z.string().optional(),
    personalWebsite: z.string().url().optional()
  }).optional(),
  streaks: z.object({
    currentStreak: z.number().default(0),
    longestStreak: z.number().default(0),
    lastActivityDate: z.date().optional(),
    totalActiveDays: z.number().default(0)
  }).optional(),
  statistics: z.object({
    projectsCreated: z.number().default(0),
    commentsPosted: z.number().default(0),
    projectsRevived: z.number().default(0),
    helpfulAnswers: z.number().default(0)
  }).optional(),
  subscriptions: z.array(z.instanceof(Types.ObjectId)).optional(),
  lastLoginAt: z.date().optional(),
  isActive: z.boolean().default(true),
  role: z.enum(['user', 'moderator', 'admin']).default('user'),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

// MongoDB Project Schema Validation
export const projectSchema = z.object({
  _id: z.instanceof(Types.ObjectId).optional(),
  title: z.string().min(1).max(200),
  ownerId: z.instanceof(Types.ObjectId),
  collaborators: z.array(z.instanceof(Types.ObjectId)).optional(),
  status: z.enum(['active', 'inactive', 'archived', 'completed']).default('active'),
  description: z.string().min(1).max(2000),
  tags: z.array(z.string().max(50)),
  media: z.array(z.object({
    type: z.enum(['image', 'video']),
    url: z.string().optional(), // Allow both URLs and base64 data
    data: z.string().optional(), // Base64 encoded image data
    caption: z.string().max(200).optional(),
    uploadedAt: z.date().default(() => new Date()),
    order: z.number().default(0),
    filename: z.string().optional(),
    mimetype: z.string().optional(),
    size: z.number().optional()
  })).optional(),
  updates: z.array(z.object({
    _id: z.instanceof(Types.ObjectId).optional(),
    title: z.string().max(200),
    content: z.string().max(5000),
    media: z.array(z.object({
      type: z.string(),
      url: z.string().url()
    })).optional(),
    createdAt: z.date().optional(),
    updatedAt: z.date().optional()
  })).optional(),
  analytics: z.object({
    views: z.number().default(0),
    uniqueViewers: z.array(z.instanceof(Types.ObjectId)).optional(),
    totalComments: z.number().default(0),
    totalLikes: z.number().default(0),
    subscribers: z.number().default(0)
  }).optional(),
  lastActivityAt: z.date().optional(),
  featured: z.boolean().default(false),
  isDeleted: z.boolean().default(false),
  deletedAt: z.date().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

// MongoDB Comment Schema Validation
export const commentSchema = z.object({
  _id: z.instanceof(Types.ObjectId).optional(),
  projectId: z.instanceof(Types.ObjectId),
  authorId: z.instanceof(Types.ObjectId),
  parentCommentId: z.instanceof(Types.ObjectId).optional(),
  content: z.string().min(1).max(2000),
  type: z.enum(['general', 'question', 'improvement', 'answer']).default('general'),
  tags: z.object({
    isQuestion: z.boolean().default(false),
    isAnswered: z.boolean().default(false),
    acceptedAnswer: z.instanceof(Types.ObjectId).optional(),
    isPinned: z.boolean().default(false)
  }).optional(),
  mentions: z.array(z.instanceof(Types.ObjectId)).optional(),
  reactions: z.array(z.object({
    userId: z.instanceof(Types.ObjectId),
    type: z.string()
  })).optional(),
  edited: z.boolean().default(false),
  editHistory: z.array(z.object({
    content: z.string(),
    editedAt: z.date()
  })).optional(),
  isDeleted: z.boolean().default(false),
  deletedAt: z.date().optional(),
  deletedBy: z.instanceof(Types.ObjectId).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

// MongoDB Event Schema Validation
export const eventSchema = z.object({
  _id: z.instanceof(Types.ObjectId).optional(),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  googleCalendarId: z.string().optional(),
  eventType: z.enum(['major', 'minor', 'workshop', 'meetup']).default('minor'),
  startDateTime: z.date(),
  endDateTime: z.date(),
  location: z.object({
    name: z.string().max(200),
    address: z.string().max(300).optional(),
    room: z.string().max(100).optional(),
    virtualLink: z.string().url().optional()
  }),
  organizers: z.array(z.instanceof(Types.ObjectId)),
  attendees: z.array(z.object({
    userId: z.instanceof(Types.ObjectId),
    status: z.enum(['registered', 'attended', 'cancelled']).default('registered'),
    registeredAt: z.date().default(() => new Date())
  })).optional(),
  capacity: z.number().positive().optional(),
  thumbnailImage: z.string().url().optional(),
  tags: z.array(z.string().max(50)).optional(),
  isFeatured: z.boolean().default(false),
  createdBy: z.instanceof(Types.ObjectId),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

// MongoDB Subscription Schema Validation
export const subscriptionSchema = z.object({
  _id: z.instanceof(Types.ObjectId).optional(),
  userId: z.instanceof(Types.ObjectId),
  projectId: z.instanceof(Types.ObjectId),
  notificationPreferences: z.object({
    email: z.boolean().default(true),
    inApp: z.boolean().default(true),
    frequency: z.enum(['immediate', 'daily', 'weekly']).default('immediate')
  }).optional(),
  subscribedAt: z.date().optional(),
  lastNotificationSent: z.date().optional(),
  isActive: z.boolean().default(true)
});

// MongoDB Notification Schema Validation
export const notificationSchema = z.object({
  _id: z.instanceof(Types.ObjectId).optional(),
  recipientId: z.instanceof(Types.ObjectId),
  type: z.enum(['project_update', 'comment_reply', 'mention', 'project_status_change', 'new_subscriber', 'event_registration', 'event_reminder']),
  relatedProject: z.instanceof(Types.ObjectId).optional(),
  relatedComment: z.instanceof(Types.ObjectId).optional(),
  relatedUser: z.instanceof(Types.ObjectId).optional(),
  relatedEvent: z.instanceof(Types.ObjectId).optional(),
  title: z.string().max(200),
  message: z.string().max(500),
  read: z.boolean().default(false),
  readAt: z.date().optional(),
  emailSent: z.boolean().default(false),
  emailSentAt: z.date().optional(),
  expiresAt: z.date().optional(),
  createdAt: z.date().optional()
});

// Login and Registration Schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

export const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(30),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().min(1, 'Full name is required').max(100),
  college: z.enum([
    'School of Computer Science',
    'Carnegie Institute of Technology',
    'College of Engineering',
    'College of Fine Arts',
    'Dietrich College of Humanities and Social Sciences',
    'Heinz College of Information Systems and Public Policy',
    'Mellon College of Science',
    'Tepper School of Business',
    'Other'
  ]).optional(),
  graduationYear: z.number().min(2020).max(2035).optional()
});

// Create schemas for inserts (without MongoDB-specific fields)
export const createUserSchema = userSchema.omit({
  _id: true,
  createdAt: true,
  updatedAt: true,
  statistics: true,
  streaks: true,
  subscriptions: true,
  lastLoginAt: true
});

export const createProjectSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  tags: z.array(z.string().max(50)),
  status: z.enum(['active', 'inactive', 'archived', 'completed']).default('active'),
  media: z.array(z.object({
    type: z.enum(['image', 'video']),
    url: z.string().optional(), // Allow both URLs and base64 data
    data: z.string().optional(), // Base64 encoded image data
    caption: z.string().max(200).optional(),
    order: z.number().default(0),
    filename: z.string().optional(),
    mimetype: z.string().optional(),
    size: z.number().optional()
  })).optional()
});

export const createCommentSchema = z.object({
  content: z.string().min(1).max(2000),
  type: z.enum(['general', 'question', 'improvement', 'answer']).default('general'),
  parentCommentId: z.string().optional()
});

export const createEventSchema = eventSchema.omit({
  _id: true,
  createdAt: true,
  updatedAt: true,
  attendees: true
});

// Update schemas for partial updates
export const updateUserSchema = userSchema.partial().omit({
  _id: true,
  createdAt: true,
  updatedAt: true
});

export const updateProjectSchema = projectSchema.partial().omit({
  _id: true,
  createdAt: true,
  updatedAt: true,
  ownerId: true
});

// TypeScript types from Zod schemas
export type User = z.infer<typeof userSchema>;
export type Project = z.infer<typeof projectSchema>;
export type Comment = z.infer<typeof commentSchema>;
export type Event = z.infer<typeof eventSchema>;
export type Subscription = z.infer<typeof subscriptionSchema>;
export type Notification = z.infer<typeof notificationSchema>;

export type CreateUser = z.infer<typeof createUserSchema>;
export type CreateProject = z.infer<typeof createProjectSchema>;
export type CreateComment = z.infer<typeof createCommentSchema>;
export type CreateEvent = z.infer<typeof createEventSchema>;

export type UpdateUser = z.infer<typeof updateUserSchema>;
export type UpdateProject = z.infer<typeof updateProjectSchema>;

export type LoginRequest = z.infer<typeof loginSchema>;
export type RegisterRequest = z.infer<typeof registerSchema>;

// API Response types
export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

export type PaginatedResponse<T = any> = ApiResponse<{
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}>;

// Common query parameters
export type PaginationParams = {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

export type ProjectFilters = {
  status?: 'active' | 'inactive' | 'archived' | 'completed';
  tags?: string[];
  featured?: boolean;
  ownerId?: string;
  search?: string;
};

export type CommentFilters = {
  projectId?: string;
  authorId?: string;
  type?: 'general' | 'question' | 'improvement' | 'answer';
  parentCommentId?: string;
};

export type EventFilters = {
  eventType?: 'major' | 'minor' | 'workshop' | 'meetup';
  featured?: boolean;
  upcoming?: boolean;
  tags?: string[];
};
