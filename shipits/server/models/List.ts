import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IList extends Document {
  title: string;
  description: string;
  category: string;
  tags: string[];
  createdBy: Types.ObjectId;
  isPublic: boolean;
  collaborators: Array<{
    userId: Types.ObjectId;
    role: 'owner' | 'editor' | 'viewer';
    addedAt: Date;
    addedBy: Types.ObjectId;
  }>;
  settings: {
    allowAnonymousContributions: boolean;
    requireApprovalForNewItems: boolean;
    allowItemEditing: boolean;
    allowItemDeletion: boolean;
    maxItemsPerUser?: number;
  };
  analytics: {
    views: number;
    uniqueViewers: Types.ObjectId[];
    totalItems: number;
    totalContributors: Types.ObjectId[];
    lastActivity: Date;
  };
  featured: boolean;
  template?: {
    isTemplate: boolean;
    templateName?: string;
    fields?: Array<{
      name: string;
      type: 'text' | 'url' | 'markdown' | 'number' | 'date';
      required: boolean;
      placeholder?: string;
    }>;
  };
  status: 'active' | 'archived' | 'private' | 'deleted';
  createdAt: Date;
  updatedAt: Date;
}

const listSchema = new Schema<IList>({
  title: { 
    type: String, 
    required: true, 
    trim: true, 
    maxLength: 200,
    index: true 
  },
  description: { 
    type: String, 
    required: true, 
    trim: true, 
    maxLength: 1000 
  },
  category: { 
    type: String, 
    required: true,
    enum: [
      'funding', 'venture-capital', 'resources', 'tools', 'learning', 
      'networking', 'jobs', 'startups', 'research', 'events',
      'books', 'articles', 'videos', 'courses', 'communities',
      'software', 'hardware', 'design', 'marketing', 'other'
    ],
    index: true
  },
  tags: [{ 
    type: String, 
    trim: true, 
    maxLength: 50 
  }],
  createdBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  isPublic: { 
    type: Boolean, 
    default: true,
    index: true 
  },
  collaborators: [{
    userId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    role: { 
      type: String, 
      enum: ['owner', 'editor', 'viewer'], 
      default: 'editor' 
    },
    addedAt: { 
      type: Date, 
      default: Date.now 
    },
    addedBy: { 
      type: Schema.Types.ObjectId, 
      ref: 'User' 
    }
  }],
  settings: {
    allowAnonymousContributions: { 
      type: Boolean, 
      default: true 
    },
    requireApprovalForNewItems: { 
      type: Boolean, 
      default: false 
    },
    allowItemEditing: { 
      type: Boolean, 
      default: true 
    },
    allowItemDeletion: { 
      type: Boolean, 
      default: false 
    },
    maxItemsPerUser: { 
      type: Number, 
      min: 1,
      max: 100 
    }
  },
  analytics: {
    views: { 
      type: Number, 
      default: 0 
    },
    uniqueViewers: [{ 
      type: Schema.Types.ObjectId, 
      ref: 'User' 
    }],
    totalItems: { 
      type: Number, 
      default: 0 
    },
    totalContributors: [{ 
      type: Schema.Types.ObjectId, 
      ref: 'User' 
    }],
    lastActivity: { 
      type: Date, 
      default: Date.now 
    }
  },
  featured: { 
    type: Boolean, 
    default: false,
    index: true 
  },
  template: {
    isTemplate: { 
      type: Boolean, 
      default: false 
    },
    templateName: { 
      type: String, 
      trim: true, 
      maxLength: 100 
    },
    fields: [{
      name: { 
        type: String, 
        required: true, 
        trim: true, 
        maxLength: 50 
      },
      type: { 
        type: String, 
        enum: ['text', 'url', 'markdown', 'number', 'date'], 
        default: 'text' 
      },
      required: { 
        type: Boolean, 
        default: false 
      },
      placeholder: { 
        type: String, 
        trim: true, 
        maxLength: 200 
      }
    }]
  },
  status: { 
    type: String, 
    enum: ['active', 'archived', 'private', 'deleted'], 
    default: 'active',
    index: true 
  }
}, {
  timestamps: true
});

// Indexes for performance
listSchema.index({ title: 'text', description: 'text', tags: 'text' });
listSchema.index({ category: 1, featured: -1, createdAt: -1 });
listSchema.index({ createdBy: 1, status: 1 });
listSchema.index({ 'analytics.lastActivity': -1 });

// Virtual for item count
listSchema.virtual('itemCount', {
  ref: 'ListItem',
  localField: '_id',
  foreignField: 'listId',
  count: true
});

// Middleware to update analytics
listSchema.pre('save', function() {
  this.analytics.lastActivity = new Date();
});

export const List = mongoose.model<IList>('List', listSchema);
