import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IListItem extends Document {
  listId: Types.ObjectId;
  title: string;
  content: string; // Markdown content
  order: number;
  metadata: {
    url?: string;
    type: 'resource' | 'tool' | 'article' | 'video' | 'book' | 'course' | 'company' | 'person' | 'event' | 'other';
    tags: string[];
    description?: string;
    category?: string;
    rating?: number; // 1-5 stars
    price?: {
      amount: number;
      currency: string;
      isFree: boolean;
    };
    contact?: {
      email?: string;
      website?: string;
      social?: {
        twitter?: string;
        linkedin?: string;
        github?: string;
      };
    };
  };
  createdBy: Types.ObjectId;
  lastEditedBy: Types.ObjectId;
  editHistory: Array<{
    editedBy: Types.ObjectId;
    editedAt: Date;
    changes: {
      field: string;
      oldValue: string;
      newValue: string;
    }[];
    reason?: string;
  }>;
  status: 'active' | 'pending' | 'approved' | 'rejected' | 'deleted';
  approvals: Array<{
    userId: Types.ObjectId;
    action: 'approve' | 'reject';
    reason?: string;
    timestamp: Date;
  }>;
  reactions: Array<{
    userId: Types.ObjectId;
    type: 'like' | 'helpful' | 'outdated' | 'spam' | 'upvote';
    timestamp: Date;
  }>;
  comments: Array<{
    _id: Types.ObjectId;
    userId: Types.ObjectId;
    content: string;
    timestamp: Date;
    edited: boolean;
    editedAt?: Date;
  }>;
  analytics: {
    views: number;
    clicks: number; // For URL items
    copies: number;
    likes: number;
    helpful: number;
    upvotes: number;
  };
  customFields?: Map<string, any>; // For template-based lists
  featured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const listItemSchema = new Schema<IListItem>({
  listId: { 
    type: Schema.Types.ObjectId, 
    ref: 'List', 
    required: true,
    index: true 
  },
  title: { 
    type: String, 
    required: true, 
    trim: true, 
    maxLength: 300,
    index: true 
  },
  content: { 
    type: String, 
    required: true, 
    trim: true, 
    maxLength: 5000 
  },
  order: { 
    type: Number, 
    default: 0,
    index: true 
  },
  metadata: {
    url: { 
      type: String, 
      trim: true,
      validate: {
        validator: function(v: string) {
          if (!v) return true;
          return /^https?:\/\/.+/.test(v);
        },
        message: 'Invalid URL format'
      }
    },
    type: { 
      type: String, 
      enum: ['resource', 'tool', 'article', 'video', 'book', 'course', 'company', 'person', 'event', 'other'], 
      default: 'resource',
      index: true 
    },
    tags: [{ 
      type: String, 
      trim: true, 
      maxLength: 50 
    }],
    description: { 
      type: String, 
      trim: true, 
      maxLength: 500 
    },
    category: { 
      type: String, 
      trim: true, 
      maxLength: 100 
    },
    rating: { 
      type: Number, 
      min: 1, 
      max: 5 
    },
    price: {
      amount: { 
        type: Number, 
        min: 0 
      },
      currency: { 
        type: String, 
        default: 'USD',
        enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'] 
      },
      isFree: { 
        type: Boolean, 
        default: true 
      }
    },
    contact: {
      email: { 
        type: String, 
        trim: true,
        validate: {
          validator: function(v: string) {
            if (!v) return true;
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
          },
          message: 'Invalid email format'
        }
      },
      website: { 
        type: String, 
        trim: true 
      },
      social: {
        twitter: { 
          type: String, 
          trim: true 
        },
        linkedin: { 
          type: String, 
          trim: true 
        },
        github: { 
          type: String, 
          trim: true 
        }
      }
    }
  },
  createdBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  lastEditedBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User' 
  },
  editHistory: [{
    editedBy: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    editedAt: { 
      type: Date, 
      default: Date.now 
    },
    changes: [{
      field: { 
        type: String, 
        required: true 
      },
      oldValue: { 
        type: String, 
        required: true 
      },
      newValue: { 
        type: String, 
        required: true 
      }
    }],
    reason: { 
      type: String, 
      trim: true, 
      maxLength: 200 
    }
  }],
  status: { 
    type: String, 
    enum: ['active', 'pending', 'approved', 'rejected', 'deleted'], 
    default: 'active',
    index: true 
  },
  approvals: [{
    userId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    action: { 
      type: String, 
      enum: ['approve', 'reject'], 
      required: true 
    },
    reason: { 
      type: String, 
      trim: true, 
      maxLength: 200 
    },
    timestamp: { 
      type: Date, 
      default: Date.now 
    }
  }],
  reactions: [{
    userId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    type: {
      type: String,
      enum: ['like', 'helpful', 'outdated', 'spam', 'upvote'],
      required: true
    },
    timestamp: { 
      type: Date, 
      default: Date.now 
    }
  }],
  comments: [{
    _id: { 
      type: Schema.Types.ObjectId, 
      default: () => new Types.ObjectId() 
    },
    userId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    content: { 
      type: String, 
      required: true, 
      trim: true, 
      maxLength: 1000 
    },
    timestamp: { 
      type: Date, 
      default: Date.now 
    },
    edited: { 
      type: Boolean, 
      default: false 
    },
    editedAt: { 
      type: Date 
    }
  }],
  analytics: {
    views: { 
      type: Number, 
      default: 0 
    },
    clicks: { 
      type: Number, 
      default: 0 
    },
    copies: { 
      type: Number, 
      default: 0 
    },
    likes: { 
      type: Number, 
      default: 0 
    },
    helpful: {
      type: Number,
      default: 0
    },
    upvotes: {
      type: Number,
      default: 0
    }
  },
  customFields: { 
    type: Map, 
    of: Schema.Types.Mixed 
  },
  featured: { 
    type: Boolean, 
    default: false,
    index: true 
  }
}, {
  timestamps: true
});

// Indexes for performance
listItemSchema.index({ listId: 1, order: 1 });
listItemSchema.index({ listId: 1, status: 1, createdAt: -1 });
listItemSchema.index({ title: 'text', content: 'text', 'metadata.description': 'text' });
listItemSchema.index({ 'metadata.type': 1, featured: -1 });
listItemSchema.index({ createdBy: 1, createdAt: -1 });

// Update analytics on reactions
listItemSchema.pre('save', function() {
  if (this.isModified('reactions')) {
    this.analytics.likes = this.reactions.filter(r => r.type === 'like').length;
    this.analytics.helpful = this.reactions.filter(r => r.type === 'helpful').length;
    this.analytics.upvotes = this.reactions.filter(r => r.type === 'upvote').length;
  }
});

// Add virtual for upvote count
listItemSchema.virtual('upvoteCount').get(function() {
  return this.reactions.filter(r => r.type === 'upvote').length;
});

export const ListItem = mongoose.model<IListItem>('ListItem', listItemSchema);
