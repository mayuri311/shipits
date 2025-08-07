import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICommentReaction {
  userId: Types.ObjectId;
  type: string; // 'like', 'helpful', etc.
}

export interface ICommentEditHistory {
  content: string;
  editedAt: Date;
}

export interface ICommentTags {
  isQuestion: boolean;
  isAnswered: boolean;
  acceptedAnswer?: Types.ObjectId;
  isPinned: boolean;
}

export interface IComment extends Document {
  _id: Types.ObjectId;
  projectId: Types.ObjectId;
  authorId: Types.ObjectId;
  parentCommentId?: Types.ObjectId;
  content: string;
  type: 'general' | 'question' | 'improvement' | 'answer';
  tags: ICommentTags;
  mentions: Types.ObjectId[];
  reactions: ICommentReaction[];
  edited: boolean;
  editHistory: ICommentEditHistory[];
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  
  // Methods
  addReaction(userId: Types.ObjectId, type: string): Promise<void>;
  removeReaction(userId: Types.ObjectId): Promise<void>;
  markAsAnswer(questionId: Types.ObjectId): Promise<void>;
  addMention(userId: Types.ObjectId): Promise<void>;
}

const CommentReactionSchema = new Schema<ICommentReaction>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['like', 'helpful', 'love', 'insightful'],
    default: 'like'
  }
}, { _id: false });

const CommentEditHistorySchema = new Schema<ICommentEditHistory>({
  content: {
    type: String,
    required: true,
    trim: true
  },
  editedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const CommentTagsSchema = new Schema<ICommentTags>({
  isQuestion: {
    type: Boolean,
    default: false,
    index: true
  },
  isAnswered: {
    type: Boolean,
    default: false,
    index: true
  },
  acceptedAnswer: {
    type: Schema.Types.ObjectId,
    ref: 'Comment'
  },
  isPinned: {
    type: Boolean,
    default: false,
    index: true
  }
}, { _id: false });

const CommentSchema = new Schema<IComment>({
  projectId: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  authorId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  parentCommentId: {
    type: Schema.Types.ObjectId,
    ref: 'Comment',
    index: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  type: {
    type: String,
    enum: ['general', 'question', 'improvement', 'answer'],
    default: 'general',
    index: true
  },
  tags: {
    type: CommentTagsSchema,
    default: {}
  },
  mentions: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  reactions: [CommentReactionSchema],
  edited: {
    type: Boolean,
    default: false
  },
  editHistory: [CommentEditHistorySchema],
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  deletedAt: {
    type: Date
  },
  deletedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
CommentSchema.index({ projectId: 1, createdAt: -1 });
CommentSchema.index({ parentCommentId: 1, createdAt: 1 });
CommentSchema.index({ authorId: 1, createdAt: -1 });
CommentSchema.index({ 'tags.isQuestion': 1, 'tags.isAnswered': 1 });
CommentSchema.index({ 'tags.isPinned': 1, createdAt: -1 });
CommentSchema.index({ mentions: 1 });
CommentSchema.index({ isDeleted: 1, createdAt: -1 });

// Text search index
CommentSchema.index({ content: 'text' });

// Virtual for reply count
CommentSchema.virtual('replyCount', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'parentCommentId',
  match: { isDeleted: false },
  count: true
});

// Virtual for reaction counts
CommentSchema.virtual('reactionCounts').get(function() {
  const counts = {};
  this.reactions.forEach(reaction => {
    counts[reaction.type] = (counts[reaction.type] || 0) + 1;
  });
  return counts;
});

// Pre-save middleware
CommentSchema.pre('save', function(next) {
  // Extract mentions from content
  const mentionRegex = /@(\w+)/g;
  const mentions = [];
  let match;
  
  while ((match = mentionRegex.exec(this.content)) !== null) {
    // In a real implementation, you'd look up users by username
    // For now, we'll just store the username patterns
  }
  
  // Set question status based on type
  if (this.type === 'question') {
    this.tags.isQuestion = true;
  }
  
  next();
});

// Post-save middleware to update project analytics
CommentSchema.post('save', async function() {
  // Handle new comment creation
  if (this.isNew && !this.isDeleted) {
    try {
      // Update project comment count
      await mongoose.model('Project').findByIdAndUpdate(
        this.projectId,
        { 
          $inc: { 'analytics.totalComments': 1 },
          $set: { lastActivityAt: new Date() }
        }
      );
      
      // Update user statistics
      await mongoose.model('User').findByIdAndUpdate(
        this.authorId,
        { $inc: { 'statistics.commentsPosted': 1 } }
      );
    } catch (error) {
      console.error('Error updating analytics after comment save:', error);
    }
  }
  // Handle comment deletion (when isDeleted changes from false to true)
  else if (!this.isNew && this.isDeleted && this.isModified('isDeleted')) {
    try {
      // Decrement project comment count
      await mongoose.model('Project').findByIdAndUpdate(
        this.projectId,
        { 
          $inc: { 'analytics.totalComments': -1 },
          $set: { lastActivityAt: new Date() }
        }
      );
      
      // Decrement user statistics
      await mongoose.model('User').findByIdAndUpdate(
        this.authorId,
        { $inc: { 'statistics.commentsPosted': -1 } }
      );
    } catch (error) {
      console.error('Error updating analytics after comment deletion:', error);
    }
  }
});

// Instance methods
CommentSchema.methods.addReaction = async function(userId: Types.ObjectId, type: string): Promise<void> {
  // Remove existing reaction from this user
  this.reactions = this.reactions.filter(r => !r.userId.equals(userId));
  
  // Add new reaction
  this.reactions.push({ userId, type });
  await this.save();
};

CommentSchema.methods.removeReaction = async function(userId: Types.ObjectId): Promise<void> {
  this.reactions = this.reactions.filter(r => !r.userId.equals(userId));
  await this.save();
};

CommentSchema.methods.markAsAnswer = async function(questionId: Types.ObjectId): Promise<void> {
  // Mark the question as answered
  await mongoose.model('Comment').findByIdAndUpdate(questionId, {
    'tags.isAnswered': true,
    'tags.acceptedAnswer': this._id
  });
  
  // Update user statistics for helpful answer
  await mongoose.model('User').findByIdAndUpdate(
    this.authorId,
    { $inc: { 'statistics.helpfulAnswers': 1 } }
  );
};

CommentSchema.methods.addMention = async function(userId: Types.ObjectId): Promise<void> {
  if (!this.mentions.includes(userId)) {
    this.mentions.push(userId);
    await this.save();
    
    // Create notification for mentioned user
    const Notification = mongoose.model('Notification');
    await Notification.create({
      recipientId: userId,
      type: 'mention',
      relatedProject: this.projectId,
      relatedComment: this._id,
      relatedUser: this.authorId,
      title: 'You were mentioned in a comment',
      message: `@${this.authorId} mentioned you in a comment`,
      read: false
    });
  }
};

// Static methods
CommentSchema.statics.findByProject = function(projectId: Types.ObjectId, options = {}) {
  const query = {
    projectId,
    isDeleted: false,
    parentCommentId: null // Top-level comments only
  };
  
  return this.find(query)
    .populate('authorId', 'username fullName profileImage')
    .populate({
      path: 'parentCommentId',
      populate: {
        path: 'authorId',
        select: 'username fullName profileImage'
      }
    })
    .sort({ 'tags.isPinned': -1, createdAt: -1 })
    .limit(options.limit || 50);
};

CommentSchema.statics.findReplies = function(parentId: Types.ObjectId) {
  return this.find({
    parentCommentId: parentId,
    isDeleted: false
  })
  .populate('authorId', 'username fullName profileImage')
  .sort({ createdAt: 1 });
};

CommentSchema.statics.findQuestions = function(projectId?: Types.ObjectId) {
  const query = {
    'tags.isQuestion': true,
    isDeleted: false
  };
  
  if (projectId) {
    query['projectId'] = projectId;
  }
  
  return this.find(query)
    .populate('authorId', 'username fullName profileImage')
    .sort({ 'tags.isAnswered': 1, createdAt: -1 });
};

export const Comment = mongoose.model<IComment>('Comment', CommentSchema);