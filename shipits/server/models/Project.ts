import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IProjectMedia {
  type: 'image' | 'video';
  url?: string;
  data?: string; // Base64 encoded image data
  filename?: string;
  mimetype?: string;
  size?: number;
  caption?: string;
  uploadedAt: Date;
  order: number;
}

export interface IProjectUpdate {
  _id: Types.ObjectId;
  title: string;
  content: string;
  media: {
    type: string;
    url: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IProjectAnalytics {
  views: number;
  uniqueViewers: Types.ObjectId[];
  shares: number;
  sharesByPlatform: Map<string, number>;
  totalComments: number;
  totalLikes: number;
  subscribers: number;
}

export interface IProject extends Document {
  _id: Types.ObjectId;
  title: string;
  ownerId: Types.ObjectId;
  collaborators: Types.ObjectId[];
  status: 'active' | 'inactive' | 'archived' | 'completed';
  description: string;
  tags: string[];
  media: IProjectMedia[];
  updates: IProjectUpdate[];
  analytics: IProjectAnalytics;
  likes: Types.ObjectId[];  // Array of user IDs who liked this project
  createdAt: Date;
  updatedAt: Date;
  lastActivityAt: Date;
  featured: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  
  // Methods
  addUpdate(update: Partial<IProjectUpdate>): Promise<void>;
  incrementViews(userId?: Types.ObjectId): Promise<void>;
  incrementShares(platform: string, userId?: Types.ObjectId): Promise<void>;
  addCollaborator(userId: Types.ObjectId): Promise<void>;
  removeCollaborator(userId: Types.ObjectId): Promise<void>;
  addLike(userId: Types.ObjectId): Promise<void>;
  removeLike(userId: Types.ObjectId): Promise<void>;
}

const ProjectMediaSchema = new Schema<IProjectMedia>({
  type: {
    type: String,
    enum: ['image', 'video'],
    required: true
  },
  url: {
    type: String,
    required: false,
    trim: true
  },
  data: {
    type: String, // Base64 encoded image data
    required: false,
    trim: true
  },
  filename: {
    type: String,
    required: false,
    trim: true
  },
  mimetype: {
    type: String,
    required: false,
    trim: true
  },
  size: {
    type: Number,
    required: false
  },
  caption: {
    type: String,
    trim: true,
    maxlength: 200
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  order: {
    type: Number,
    default: 0
  }
}, { _id: false });

const ProjectUpdateSchema = new Schema<IProjectUpdate>({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 5000
  },
  media: [{
    type: {
      type: String,
      enum: ['image', 'video'],
      required: true
    },
    url: {
      type: String,
      required: true,
      trim: true
    }
  }]
}, { timestamps: true });

const ProjectAnalyticsSchema = new Schema<IProjectAnalytics>({
  views: {
    type: Number,
    default: 0,
    min: 0
  },
  uniqueViewers: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  shares: {
    type: Number,
    default: 0,
    min: 0
  },
  sharesByPlatform: {
    type: Map,
    of: Number,
    default: new Map()
  },
  totalComments: {
    type: Number,
    default: 0,
    min: 0
  },
  totalLikes: {
    type: Number,
    default: 0,
    min: 0
  },
  subscribers: {
    type: Number,
    default: 0,
    min: 0
  }
}, { _id: false });

const ProjectSchema = new Schema<IProject>({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
    index: true
  },
  ownerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  collaborators: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  status: {
    type: String,
    enum: ['active', 'inactive', 'archived', 'completed'],
    default: 'active',
    index: true
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: 50
  }],
  media: [ProjectMediaSchema],
  updates: [ProjectUpdateSchema],
  analytics: {
    type: ProjectAnalyticsSchema,
    default: {}
  },
  likes: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  lastActivityAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  featured: {
    type: Boolean,
    default: false,
    index: true
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  deletedAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
ProjectSchema.index({ ownerId: 1, status: 1 });
ProjectSchema.index({ status: 1, createdAt: -1 });
ProjectSchema.index({ tags: 1 });
ProjectSchema.index({ 'analytics.views': -1 });
ProjectSchema.index({ featured: 1, status: 1 });
ProjectSchema.index({ lastActivityAt: -1 });
ProjectSchema.index({ isDeleted: 1, status: 1 });

// Text search index
ProjectSchema.index({
  title: 'text',
  description: 'text',
  tags: 'text'
}, {
  weights: {
    title: 10,
    tags: 5,
    description: 1
  }
});

// Virtual for comment count
ProjectSchema.virtual('commentCount', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'projectId',
  count: true
});

// Virtual for subscriber count
ProjectSchema.virtual('subscriberCount', {
  ref: 'Subscription',
  localField: '_id',
  foreignField: 'projectId',
  match: { isActive: true },
  count: true
});

// Pre-save middleware
ProjectSchema.pre('save', function(next) {
  if (this.isModified() && !this.isModified('analytics')) {
    this.lastActivityAt = new Date();
  }
  next();
});

// Instance methods
ProjectSchema.methods.addUpdate = async function(update: Partial<IProjectUpdate>): Promise<void> {
  const newUpdate = {
    _id: new Types.ObjectId(),
    title: update.title || '',
    content: update.content || '',
    media: update.media || [],
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  this.updates.push(newUpdate);
  this.lastActivityAt = new Date();
  await this.save();
  
  // Update owner's statistics
  const User = mongoose.model('User');
  await User.findByIdAndUpdate(this.ownerId, {
    $inc: { 'statistics.projectsCreated': 1 }
  });
};

ProjectSchema.methods.incrementViews = async function(userId?: Types.ObjectId): Promise<void> {
  this.analytics.views += 1;
  
  if (userId && !this.analytics.uniqueViewers.includes(userId)) {
    this.analytics.uniqueViewers.push(userId);
  }
  
  await this.save();
};

ProjectSchema.methods.incrementShares = async function(platform: string, userId?: Types.ObjectId): Promise<void> {
  this.analytics.shares += 1;
  
  // Track shares by platform
  const currentCount = this.analytics.sharesByPlatform.get(platform) || 0;
  this.analytics.sharesByPlatform.set(platform, currentCount + 1);
  
  await this.save();
};

ProjectSchema.methods.addCollaborator = async function(userId: Types.ObjectId): Promise<void> {
  if (!this.collaborators.includes(userId)) {
    this.collaborators.push(userId);
    await this.save();
  }
};

ProjectSchema.methods.removeCollaborator = async function(userId: Types.ObjectId): Promise<void> {
  this.collaborators = this.collaborators.filter(id => !id.equals(userId));
  await this.save();
};

ProjectSchema.methods.addLike = async function(userId: Types.ObjectId): Promise<void> {
  if (!this.likes.some(id => id.equals(userId))) {
    this.likes.push(userId);
    this.analytics.totalLikes = this.likes.length;
    await this.save();
  }
};

ProjectSchema.methods.removeLike = async function(userId: Types.ObjectId): Promise<void> {
  this.likes = this.likes.filter(id => !id.equals(userId));
  this.analytics.totalLikes = this.likes.length;
  await this.save();
};

// Static methods for common queries
ProjectSchema.statics.findActive = function() {
  return this.find({ 
    status: 'active', 
    isDeleted: false 
  }).populate('ownerId', 'username fullName profileImage');
};

ProjectSchema.statics.findFeatured = function() {
  return this.find({ 
    featured: true, 
    status: 'active', 
    isDeleted: false 
  }).populate('ownerId', 'username fullName profileImage');
};

ProjectSchema.statics.findByTag = function(tag: string) {
  return this.find({ 
    tags: { $in: [tag.toLowerCase()] }, 
    status: 'active', 
    isDeleted: false 
  }).populate('ownerId', 'username fullName profileImage');
};

export const Project = mongoose.model<IProject>('Project', ProjectSchema);