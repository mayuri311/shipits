import { z } from "zod";
import { Types } from "mongoose";

// Contact Form Schema Validation
export const contactSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters").trim(),
  email: z.string().email("Invalid email format").toLowerCase().trim(),
  message: z.string().min(1, "Message is required").max(1000, "Message must be less than 1000 characters").trim()
});

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
  profileImage: z.string().optional().nullable(),
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
  themePreferences: z.object({
    mode: z.enum(['light', 'dark', 'system']).default('system'),
    accentColor: z.enum(['blue', 'purple', 'green', 'orange', 'red', 'pink']).default('blue'),
    preset: z.string().default('default'),
    customColors: z.record(z.string()).optional(),
    fontSize: z.enum(['small', 'medium', 'large']).default('medium'),
    reducedMotion: z.boolean().default(false),
    highContrast: z.boolean().default(false)
  }).optional(),
  subscriptions: z.array(z.instanceof(Types.ObjectId)).optional(),
  followers: z.array(z.instanceof(Types.ObjectId)).optional(),
  following: z.array(z.instanceof(Types.ObjectId)).optional(),
  lastLoginAt: z.date().optional(),
  isActive: z.boolean().default(true),
  role: z.enum(['user', 'moderator', 'admin']).default('user'),
  isFollowersListPublic: z.boolean().default(true).optional(),
  isFollowingListPublic: z.boolean().default(true).optional(),
  onboarding: z.object({
    completed: z.boolean().default(false),
    version: z.number().default(1).optional(),
    stepsCompleted: z.array(z.string()).default([]).optional(),
    completedAt: z.date().nullable().optional(),
  }).optional(),
  uiTips: z.object({
    dismissed: z.array(z.string()).default([]),
  }).optional(),
  dashboardPreferences: z.object({
    pinnedProjectIds: z.array(z.instanceof(Types.ObjectId)).default([]).optional(),
    pinnedStats: z.array(z.enum(['totalProjectViews','totalLikesReceived','totalCommentsPosted','totalProjectsCreated','unreadNotifications'])).default([]).optional(),
    layout: z.enum(['standard','compact','cards']).default('standard'),
  }).optional(),
  lastAiPersonalization: z.object({
    preset: z.string().default('default'),
    accentColor: z.enum(['blue','purple','green','orange','red','pink']).default('blue'),
    mode: z.enum(['light','dark','system']).default('system'),
    layout: z.enum(['standard','compact','cards']).default('standard'),
    reason: z.string().optional(),
    generatedAt: z.date().default(() => new Date()),
  }).optional(),
  // Email verification
  emailVerified: z.boolean().default(false).optional(),
  emailVerificationToken: z.string().optional().nullable(),
  emailVerificationExpiresAt: z.date().optional().nullable(),
  emailVerifiedAt: z.date().optional().nullable(),
  passwordResetToken: z.string().optional().nullable(),
  passwordResetExpiresAt: z.date().optional().nullable(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

// i18n: language preferences
export const supportedLanguageCodes = [
  'en','es','fr','de','pt','it','nl','sv','pl','ru','ar','he','tr','hi','bn','zh','ja','ko','vi','th','id'
] as const;
export type SupportedLanguageCode = typeof supportedLanguageCodes[number];

export const i18nPreferencesSchema = z.object({
  language: z.enum(supportedLanguageCodes).default('en'),
  contentLanguage: z.enum(supportedLanguageCodes).default('en'),
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
  organizationTags: z.array(z.enum(['Independent', 'ScottyLabs', 'Sigma Eta Pi', 'Labrador Idea-a-thon'])).default([]),
  aiSummary: z.string().max(1200).optional(),
  aiSummaryUpdatedAt: z.date().optional(),
  aiSuggestedTags: z.array(z.string().max(50)).optional(),
  embedding: z.array(z.number()).optional(),
  media: z.array(z.object({
    type: z.enum(['image', 'video', 'document', 'archive', 'other']),
    url: z.string().optional(), // Allow both URLs and base64 data
    data: z.string().optional(), // Base64 encoded data for images, or file path for files
    caption: z.string().max(200).optional(),
    description: z.string().max(500).optional(),
    uploadedAt: z.date().default(() => new Date()),
    order: z.number().default(0),
    filename: z.string().optional(),
    originalName: z.string().optional(),
    mimetype: z.string().optional(),
    size: z.number().optional(),
    downloadCount: z.number().optional()
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
    shares: z.number().default(0),
    sharesByPlatform: z.record(z.number()).optional(),
    totalComments: z.number().default(0),
    totalLikes: z.number().default(0),
    subscribers: z.number().default(0)
  }).optional(),
  likes: z.array(z.instanceof(Types.ObjectId)).optional(),
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

// Translation DTOs
export const translateRequestSchema = z.object({
  sourceType: z.enum(['project','project_update','comment','user','message','event']),
  sourceId: z.string().min(1),
  field: z.string().min(1),
  text: z.string().min(1).max(50000),
  sourceLanguage: z.string().optional(),
  targetLanguage: z.enum(supportedLanguageCodes),
  forceRefresh: z.boolean().optional().default(false),
});

export const communityTranslationSchema = z.object({
  sourceType: z.enum(['project','project_update','comment','user','message','event']),
  sourceId: z.string().min(1),
  field: z.string().min(1),
  targetLanguage: z.enum(supportedLanguageCodes),
  translatedText: z.string().min(1).max(50000),
});

export type TranslateRequest = z.infer<typeof translateRequestSchema>;
export type CommunityTranslation = z.infer<typeof communityTranslationSchema>;

// Batch UI translation
export const translateBatchRequestSchema = z.object({
  items: z.array(z.object({
    text: z.string().min(1).max(2000),
    sourceLanguage: z.string().optional(),
    targetLanguage: z.enum(supportedLanguageCodes),
  })).min(1).max(200)
});
export type TranslateBatchRequest = z.infer<typeof translateBatchRequestSchema>;

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
  type: z.enum(['project_update', 'comment_reply', 'mention', 'project_status_change', 'new_subscriber', 'event_registration', 'event_reminder', 'project_like', 'comment_like', 'new_comment', 'new_message']),
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

// Chat/Conversation Schemas
export const conversationSchema = z.object({
  _id: z.instanceof(Types.ObjectId).optional(),
  type: z.enum(['dm', 'group', 'project']),
  name: z.string().max(120).optional(),
  description: z.string().max(500).optional(),
  participants: z.array(z.instanceof(Types.ObjectId)),
  createdBy: z.instanceof(Types.ObjectId),
  projectId: z.instanceof(Types.ObjectId).optional(),
  lastMessageAt: z.date().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const messageSchema = z.object({
  _id: z.instanceof(Types.ObjectId).optional(),
  conversationId: z.instanceof(Types.ObjectId),
  senderId: z.instanceof(Types.ObjectId),
  content: z.string().max(5000).optional().default(''),
  attachments: z.array(z.object({
    type: z.enum(['image', 'file', 'other']),
    url: z.string(),
    filename: z.string().optional(),
    size: z.number().optional(),
  })).optional(),
  mentions: z.array(z.instanceof(Types.ObjectId)).optional(),
  readBy: z.array(z.instanceof(Types.ObjectId)).optional(),
  edited: z.boolean().default(false).optional(),
  editHistory: z.array(z.object({
    content: z.string(),
    editedAt: z.date(),
  })).optional(),
  isDeleted: z.boolean().default(false).optional(),
  deletedAt: z.date().optional(),
  deletedBy: z.instanceof(Types.ObjectId).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// MongoDB Category Schema Validation
export const categorySchema = z.object({
  _id: z.instanceof(Types.ObjectId).optional(),
  name: z.string().min(1).max(50),
  description: z.string().max(200).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#3b82f6'),
  tags: z.array(z.string().max(50)),
  isActive: z.boolean().default(true),
  createdBy: z.instanceof(Types.ObjectId),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

// Login and Registration Schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

export const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(30),
  email: z.string().email('Invalid email address').refine(
    (email) => email.endsWith('.edu'),
    'Email address must end with .edu'
  ),
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
  graduationYear: z.number().min(2020).max(2035).optional(),
  captchaToken: z.string().optional(),
});

// Email verification DTOs
export const emailVerifyRequestSchema = z.object({
  token: z.string().min(10),
});

export const resendVerificationSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export type EmailVerifyRequest = z.infer<typeof emailVerifyRequestSchema>;
export type ResendVerificationRequest = z.infer<typeof resendVerificationSchema>;

// Password reset DTOs
export const requestPasswordResetSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const confirmPasswordResetSchema = z.object({
  token: z.string().min(10),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type RequestPasswordReset = z.infer<typeof requestPasswordResetSchema>;
export type ConfirmPasswordReset = z.infer<typeof confirmPasswordResetSchema>;

// Report Schemas
export const createReportSchema = z.object({
  targetType: z.enum(['user', 'project', 'comment', 'listItem']),
  targetId: z.string().min(1),
  reason: z.enum(['spam', 'abuse', 'harassment', 'hate', 'sexual', 'self-harm', 'copyright', 'other']),
  details: z.string().max(1000).optional(),
});

export const updateReportStatusSchema = z.object({
  status: z.enum(['pending', 'reviewed', 'action_taken', 'dismissed']),
  adminNotes: z.string().max(1000).optional(),
});

// Create schemas for inserts (without MongoDB-specific fields)
export const createUserSchema = userSchema.omit({
  _id: true,
  createdAt: true,
  updatedAt: true,
  statistics: true,
  streaks: true,
  themePreferences: true,
  subscriptions: true,
  lastLoginAt: true
});

export const createProjectSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  tags: z.array(z.string().max(50)),
  organizationTags: z.array(z.enum(['Independent', 'ScottyLabs', 'Sigma Eta Pi', 'Labrador Idea-a-thon'])).default([]),
  status: z.enum(['active', 'inactive', 'archived', 'completed']).default('active'),
  media: z.array(z.object({
    type: z.enum(['image', 'video', 'document', 'archive', 'other']),
    url: z.string().optional(), // Allow both URLs and base64 data
    data: z.string().optional(), // Base64 encoded data for images, or file path for files
    caption: z.string().max(200).optional(),
    description: z.string().max(500).optional(),
    order: z.number().default(0),
    filename: z.string().optional(),
    originalName: z.string().optional(),
    mimetype: z.string().optional(),
    size: z.number().optional(),
    downloadCount: z.number().optional()
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

export const createCategorySchema = categorySchema.omit({
  _id: true,
  createdAt: true,
  updatedAt: true
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

export const updateCategorySchema = categorySchema.partial().omit({
  _id: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true
});

// TypeScript types from Zod schemas
export type User = z.infer<typeof userSchema>;
export type Project = z.infer<typeof projectSchema>;
export type Comment = z.infer<typeof commentSchema>;
export type Event = z.infer<typeof eventSchema>;
export type Category = z.infer<typeof categorySchema>;
export type Subscription = z.infer<typeof subscriptionSchema>;
export type Notification = z.infer<typeof notificationSchema>;
export type Conversation = z.infer<typeof conversationSchema>;
export type Message = z.infer<typeof messageSchema>;

export type CreateUser = z.infer<typeof createUserSchema>;
export type CreateProject = z.infer<typeof createProjectSchema>;
export type CreateComment = z.infer<typeof createCommentSchema>;
export type CreateEvent = z.infer<typeof createEventSchema>;
export type CreateCategory = z.infer<typeof createCategorySchema>;
export type CreateReport = z.infer<typeof createReportSchema>;
export const createConversationSchema = conversationSchema.pick({ type: true, name: true, description: true, participants: true, projectId: true });
export const createMessageSchema = z.object({
  content: z.string().max(5000).optional(),
  attachments: z.array(z.object({
    type: z.enum(['image', 'file', 'other']),
    url: z.string(),
    filename: z.string().optional(),
    size: z.number().optional(),
  })).optional(),
});
export type CreateConversation = z.infer<typeof createConversationSchema>;
export type CreateMessage = z.infer<typeof createMessageSchema>;

export type UpdateUser = z.infer<typeof updateUserSchema>;
export type UpdateProject = z.infer<typeof updateProjectSchema>;
export type UpdateCategory = z.infer<typeof updateCategorySchema>;

export type LoginRequest = z.infer<typeof loginSchema>;
export type RegisterRequest = z.infer<typeof registerSchema>;
export type UpdateReportStatus = z.infer<typeof updateReportStatusSchema>;

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

// MongoDB List Schema Validation
export const listSchema = z.object({
  _id: z.instanceof(Types.ObjectId).optional(),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(1000),
  category: z.enum([
    'funding', 'venture-capital', 'resources', 'tools', 'learning', 
    'networking', 'jobs', 'startups', 'research', 'events',
    'books', 'articles', 'videos', 'courses', 'communities',
    'software', 'hardware', 'design', 'marketing', 'other'
  ]),
  tags: z.array(z.string().max(50)),
  createdBy: z.instanceof(Types.ObjectId),
  isPublic: z.boolean().default(true),
  collaborators: z.array(z.object({
    userId: z.instanceof(Types.ObjectId),
    role: z.enum(['owner', 'editor', 'viewer']).default('editor'),
    addedAt: z.date().default(() => new Date()),
    addedBy: z.instanceof(Types.ObjectId).optional()
  })).optional(),
  settings: z.object({
    allowAnonymousContributions: z.boolean().default(true),
    requireApprovalForNewItems: z.boolean().default(false),
    allowItemEditing: z.boolean().default(true),
    allowItemDeletion: z.boolean().default(false),
    maxItemsPerUser: z.number().min(1).max(100).optional()
  }),
  analytics: z.object({
    views: z.number().default(0),
    uniqueViewers: z.array(z.instanceof(Types.ObjectId)).default([]),
    totalItems: z.number().default(0),
    totalContributors: z.array(z.instanceof(Types.ObjectId)).default([]),
    lastActivity: z.date().default(() => new Date())
  }).optional(),
  featured: z.boolean().default(false),
  template: z.object({
    isTemplate: z.boolean().default(false),
    templateName: z.string().max(100).optional(),
    fields: z.array(z.object({
      name: z.string().min(1).max(50),
      type: z.enum(['text', 'url', 'markdown', 'number', 'date']).default('text'),
      required: z.boolean().default(false),
      placeholder: z.string().max(200).optional()
    })).optional()
  }).optional(),
  status: z.enum(['active', 'archived', 'private', 'deleted']).default('active'),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

// MongoDB ListItem Schema Validation
export const listItemSchema = z.object({
  _id: z.instanceof(Types.ObjectId).optional(),
  listId: z.instanceof(Types.ObjectId),
  title: z.string().min(1).max(300),
  content: z.string().min(1).max(5000),
  order: z.number().default(0),
  metadata: z.object({
    url: z.string().url().optional(),
    type: z.enum(['resource', 'tool', 'article', 'video', 'book', 'course', 'company', 'person', 'event', 'other']).default('resource'),
    tags: z.array(z.string().max(50)).default([]),
    description: z.string().max(500).optional(),
    category: z.string().max(100).optional(),
    rating: z.number().min(1).max(5).optional(),
    price: z.object({
      amount: z.number().min(0),
      currency: z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD']).default('USD'),
      isFree: z.boolean().default(true)
    }).optional(),
    contact: z.object({
      email: z.string().email().optional(),
      website: z.string().url().optional(),
      social: z.object({
        twitter: z.string().optional(),
        linkedin: z.string().optional(),
        github: z.string().optional()
      }).optional()
    }).optional()
  }),
  createdBy: z.instanceof(Types.ObjectId),
  lastEditedBy: z.instanceof(Types.ObjectId).optional(),
  editHistory: z.array(z.object({
    editedBy: z.instanceof(Types.ObjectId),
    editedAt: z.date().default(() => new Date()),
    changes: z.array(z.object({
      field: z.string(),
      oldValue: z.string(),
      newValue: z.string()
    })),
    reason: z.string().max(200).optional()
  })).optional(),
  status: z.enum(['active', 'pending', 'approved', 'rejected', 'deleted']).default('active'),
  approvals: z.array(z.object({
    userId: z.instanceof(Types.ObjectId),
    action: z.enum(['approve', 'reject']),
    reason: z.string().max(200).optional(),
    timestamp: z.date().default(() => new Date())
  })).optional(),
  reactions: z.array(z.object({
    userId: z.instanceof(Types.ObjectId),
    type: z.enum(['like', 'helpful', 'outdated', 'spam', 'upvote']),
    timestamp: z.date().default(() => new Date())
  })).optional(),
  comments: z.array(z.object({
    _id: z.instanceof(Types.ObjectId).optional(),
    userId: z.instanceof(Types.ObjectId),
    content: z.string().min(1).max(1000),
    timestamp: z.date().default(() => new Date()),
    edited: z.boolean().default(false),
    editedAt: z.date().optional()
  })).optional(),
  analytics: z.object({
    views: z.number().default(0),
    clicks: z.number().default(0),
    copies: z.number().default(0),
    likes: z.number().default(0),
    helpful: z.number().default(0),
    upvotes: z.number().default(0)
  }).optional(),
  customFields: z.record(z.any()).optional(),
  featured: z.boolean().default(false),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

// Create schemas for inserts
export const createListSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(1000),
  category: z.enum([
    'funding', 'venture-capital', 'resources', 'tools', 'learning', 
    'networking', 'jobs', 'startups', 'research', 'events',
    'books', 'articles', 'videos', 'courses', 'communities',
    'software', 'hardware', 'design', 'marketing', 'other'
  ]),
  tags: z.array(z.string().max(50)).default([]),
  settings: z.object({
    allowAnonymousContributions: z.boolean().default(true),
    requireApprovalForNewItems: z.boolean().default(false),
    allowItemEditing: z.boolean().default(true),
    allowItemDeletion: z.boolean().default(false),
    maxItemsPerUser: z.number().min(1).max(100).optional()
  }).optional(),
  template: z.object({
    isTemplate: z.boolean().default(false),
    templateName: z.string().max(100).optional(),
    fields: z.array(z.object({
      name: z.string().min(1).max(50),
      type: z.enum(['text', 'url', 'markdown', 'number', 'date']).default('text'),
      required: z.boolean().default(false),
      placeholder: z.string().max(200).optional()
    })).optional()
  }).optional()
});

export const createListItemSchema = z.object({
  title: z.string().min(1).max(300),
  content: z.string().min(1).max(5000),
  order: z.number().default(0).optional(),
  metadata: z.object({
    url: z.string().url().optional(),
    type: z.enum(['resource', 'tool', 'article', 'video', 'book', 'course', 'company', 'person', 'event', 'other']).default('resource'),
    tags: z.array(z.string().max(50)).default([]),
    description: z.string().max(500).optional(),
    category: z.string().max(100).optional(),
    rating: z.number().min(1).max(5).optional(),
    price: z.object({
      amount: z.number().min(0),
      currency: z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD']).default('USD'),
      isFree: z.boolean().default(true)
    }).optional(),
    contact: z.object({
      email: z.string().email().optional(),
      website: z.string().url().optional(),
      social: z.object({
        twitter: z.string().optional(),
        linkedin: z.string().optional(),
        github: z.string().optional()
      }).optional()
    }).optional()
  }).optional(),
  customFields: z.record(z.any()).optional()
});

// Update schemas for partial updates
export const updateListSchema = listSchema.partial().omit({
  _id: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  isPublic: true
});

export const updateListItemSchema = listItemSchema.partial().omit({
  _id: true,
  createdAt: true,
  updatedAt: true,
  listId: true,
  createdBy: true
});

// TypeScript types from Zod schemas
export type List = z.infer<typeof listSchema>;
export type ListItem = z.infer<typeof listItemSchema>;
export type CreateList = z.infer<typeof createListSchema>;
export type CreateListItem = z.infer<typeof createListItemSchema>;
export type UpdateList = z.infer<typeof updateListSchema>;
export type UpdateListItem = z.infer<typeof updateListItemSchema>;

// List-specific filters
export type ListFilters = {
  category?: string;
  tags?: string[];
  featured?: boolean;
  isPublic?: boolean;
  status?: 'active' | 'archived' | 'private' | 'deleted';
  search?: string;
  createdBy?: string;
};

export type ListItemFilters = {
  listId?: string;
  type?: 'resource' | 'tool' | 'article' | 'video' | 'book' | 'course' | 'company' | 'person' | 'event' | 'other';
  status?: 'active' | 'pending' | 'approved' | 'rejected' | 'deleted';
  featured?: boolean;
  search?: string;
  createdBy?: string;
};
