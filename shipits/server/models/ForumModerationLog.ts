import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IModerationDetails {
  originalContent?: string;
  newContent?: string;
  reason?: string;
  duration?: number; // For bans, in days
  [key: string]: any; // Flexible for different action types
}

export interface IForumModerationLog extends Document {
  _id: Types.ObjectId;
  moderatorId: Types.ObjectId;
  action: 'delete_comment' | 'delete_project' | 'ban_user' | 'unban_user' | 'edit_content' | 'pin_comment' | 'unpin_comment' | 'feature_project' | 'unfeature_project';
  targetType: 'user' | 'project' | 'comment';
  targetId: Types.ObjectId;
  reason: string;
  details: IModerationDetails;
  createdAt: Date;
  
  // Methods
  revert(): Promise<boolean>;
}

const ModerationDetailsSchema = new Schema<IModerationDetails>({}, { 
  strict: false, // Allow flexible schema
  _id: false 
});

const ForumModerationLogSchema = new Schema<IForumModerationLog>({
  moderatorId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  action: {
    type: String,
    enum: [
      'delete_comment',
      'delete_project',
      'ban_user',
      'unban_user',
      'edit_content',
      'pin_comment',
      'unpin_comment',
      'feature_project',
      'unfeature_project'
    ],
    required: true,
    index: true
  },
  targetType: {
    type: String,
    enum: ['user', 'project', 'comment'],
    required: true,
    index: true
  },
  targetId: {
    type: Schema.Types.ObjectId,
    required: true,
    index: true
  },
  reason: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  details: {
    type: ModerationDetailsSchema,
    default: {}
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
ForumModerationLogSchema.index({ moderatorId: 1, createdAt: -1 });
ForumModerationLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
ForumModerationLogSchema.index({ action: 1, createdAt: -1 });
ForumModerationLogSchema.index({ createdAt: -1 });

// Virtual for target model reference
ForumModerationLogSchema.virtual('target', {
  refPath: 'targetType',
  localField: 'targetId',
  foreignField: '_id',
  justOne: true
});

// Instance methods
ForumModerationLogSchema.methods.revert = async function(): Promise<boolean> {
  try {
    switch (this.action) {
      case 'delete_comment':
        await mongoose.model('Comment').findByIdAndUpdate(this.targetId, {
          isDeleted: false,
          deletedAt: null,
          deletedBy: null
        });
        break;
        
      case 'delete_project':
        await mongoose.model('Project').findByIdAndUpdate(this.targetId, {
          isDeleted: false,
          deletedAt: null
        });
        break;
        
      case 'ban_user':
        await mongoose.model('User').findByIdAndUpdate(this.targetId, {
          isActive: true
        });
        break;
        
      case 'pin_comment':
        await mongoose.model('Comment').findByIdAndUpdate(this.targetId, {
          'tags.isPinned': false
        });
        break;
        
      case 'feature_project':
        await mongoose.model('Project').findByIdAndUpdate(this.targetId, {
          featured: false
        });
        break;
        
      case 'edit_content':
        if (this.details.originalContent) {
          const updateData = { content: this.details.originalContent };
          if (this.targetType === 'comment') {
            await mongoose.model('Comment').findByIdAndUpdate(this.targetId, updateData);
          } else if (this.targetType === 'project') {
            await mongoose.model('Project').findByIdAndUpdate(this.targetId, updateData);
          }
        }
        break;
        
      default:
        return false;
    }
    
    // Log the revert action
    await mongoose.model('ForumModerationLog').create({
      moderatorId: this.moderatorId,
      action: `revert_${this.action}` as any,
      targetType: this.targetType,
      targetId: this.targetId,
      reason: `Reverted action: ${this.reason}`,
      details: { originalLogId: this._id }
    });
    
    return true;
  } catch (error) {
    console.error('Error reverting moderation action:', error);
    return false;
  }
};

// Static methods
ForumModerationLogSchema.statics.logAction = async function(
  moderatorId: Types.ObjectId,
  action: string,
  targetType: string,
  targetId: Types.ObjectId,
  reason: string,
  details: IModerationDetails = {}
) {
  return this.create({
    moderatorId,
    action,
    targetType,
    targetId,
    reason,
    details
  });
};

ForumModerationLogSchema.statics.findByModerator = function(
  moderatorId: Types.ObjectId,
  limit = 50
) {
  return this.find({ moderatorId })
    .populate('moderatorId', 'username fullName')
    .populate('target')
    .sort({ createdAt: -1 })
    .limit(limit);
};

ForumModerationLogSchema.statics.findByTarget = function(
  targetType: string,
  targetId: Types.ObjectId
) {
  return this.find({ targetType, targetId })
    .populate('moderatorId', 'username fullName')
    .sort({ createdAt: -1 });
};

ForumModerationLogSchema.statics.getRecentActions = function(
  days = 7,
  limit = 100
) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.find({
    createdAt: { $gte: startDate }
  })
  .populate('moderatorId', 'username fullName')
  .populate('target')
  .sort({ createdAt: -1 })
  .limit(limit);
};

ForumModerationLogSchema.statics.getModerationStats = function(
  startDate: Date,
  endDate: Date
) {
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          action: '$action',
          moderator: '$moderatorId'
        },
        count: { $sum: 1 }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id.moderator',
        foreignField: '_id',
        as: 'moderator'
      }
    },
    {
      $unwind: '$moderator'
    },
    {
      $group: {
        _id: '$_id.action',
        totalCount: { $sum: '$count' },
        moderators: {
          $push: {
            moderatorId: '$moderator._id',
            username: '$moderator.username',
            count: '$count'
          }
        }
      }
    },
    {
      $sort: { totalCount: -1 }
    }
  ]);
};

// Static helper methods for common moderation actions
ForumModerationLogSchema.statics.deleteComment = async function(
  commentId: Types.ObjectId,
  moderatorId: Types.ObjectId,
  reason: string
) {
  const comment = await mongoose.model('Comment').findById(commentId);
  if (!comment) throw new Error('Comment not found');
  
  // Store original content for potential revert
  const details = {
    originalContent: comment.content,
    originalAuthor: comment.authorId
  };
  
  // Delete the comment
  await mongoose.model('Comment').findByIdAndUpdate(commentId, {
    isDeleted: true,
    deletedAt: new Date(),
    deletedBy: moderatorId
  });
  
  // Log the action
  return this.logAction(moderatorId, 'delete_comment', 'comment', commentId, reason, details);
};

ForumModerationLogSchema.statics.banUser = async function(
  userId: Types.ObjectId,
  moderatorId: Types.ObjectId,
  reason: string,
  duration?: number
) {
  const user = await mongoose.model('User').findById(userId);
  if (!user) throw new Error('User not found');
  
  const details: IModerationDetails = {
    originalStatus: user.isActive,
    duration
  };
  
  // Ban the user
  await mongoose.model('User').findByIdAndUpdate(userId, {
    isActive: false
  });
  
  // Log the action
  return this.logAction(moderatorId, 'ban_user', 'user', userId, reason, details);
};

export const ForumModerationLog = mongoose.model<IForumModerationLog>('ForumModerationLog', ForumModerationLogSchema);