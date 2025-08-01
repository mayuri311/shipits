import mongoose, { Schema, Document, Types } from 'mongoose';

export interface INotification extends Document {
  _id: Types.ObjectId;
  recipientId: Types.ObjectId;
  type: 'project_update' | 'comment_reply' | 'mention' | 'project_status_change' | 'new_subscriber' | 'event_registration' | 'event_reminder';
  relatedProject?: Types.ObjectId;
  relatedComment?: Types.ObjectId;
  relatedUser?: Types.ObjectId;
  relatedEvent?: Types.ObjectId;
  title: string;
  message: string;
  read: boolean;
  readAt?: Date;
  emailSent: boolean;
  emailSentAt?: Date;
  createdAt: Date;
  expiresAt?: Date;
  
  // Methods
  markAsRead(): Promise<void>;
  markEmailSent(): Promise<void>;
}

const NotificationSchema = new Schema<INotification>({
  recipientId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: [
      'project_update',
      'comment_reply', 
      'mention',
      'project_status_change',
      'new_subscriber',
      'event_registration',
      'event_reminder'
    ],
    required: true,
    index: true
  },
  relatedProject: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    index: true
  },
  relatedComment: {
    type: Schema.Types.ObjectId,
    ref: 'Comment',
    index: true
  },
  relatedUser: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  relatedEvent: {
    type: Schema.Types.ObjectId,
    ref: 'Event',
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  read: {
    type: Boolean,
    default: false,
    index: true
  },
  readAt: {
    type: Date
  },
  emailSent: {
    type: Boolean,
    default: false,
    index: true
  },
  emailSentAt: {
    type: Date
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    index: { expireAfterSeconds: 0 }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for performance
NotificationSchema.index({ recipientId: 1, read: 1, createdAt: -1 });
NotificationSchema.index({ emailSent: 1, createdAt: 1 });
NotificationSchema.index({ type: 1, createdAt: -1 });

// Virtual for notification age
NotificationSchema.virtual('age').get(function() {
  return Date.now() - this.createdAt.getTime();
});

// Instance methods
NotificationSchema.methods.markAsRead = async function(): Promise<void> {
  if (!this.read) {
    this.read = true;
    this.readAt = new Date();
    await this.save();
  }
};

NotificationSchema.methods.markEmailSent = async function(): Promise<void> {
  if (!this.emailSent) {
    this.emailSent = true;
    this.emailSentAt = new Date();
    await this.save();
  }
};

// Static methods
NotificationSchema.statics.findUnreadForUser = function(userId: Types.ObjectId) {
  return this.find({ 
    recipientId: userId, 
    read: false 
  })
  .populate('relatedUser', 'username fullName profileImage')
  .populate('relatedProject', 'title')
  .populate('relatedEvent', 'title startDateTime')
  .sort({ createdAt: -1 })
  .limit(50);
};

NotificationSchema.statics.findForUser = function(userId: Types.ObjectId, limit = 20) {
  return this.find({ recipientId: userId })
    .populate('relatedUser', 'username fullName profileImage')
    .populate('relatedProject', 'title')
    .populate('relatedEvent', 'title startDateTime')
    .sort({ createdAt: -1 })
    .limit(limit);
};

NotificationSchema.statics.markAllAsRead = async function(userId: Types.ObjectId) {
  return this.updateMany(
    { recipientId: userId, read: false },
    { read: true, readAt: new Date() }
  );
};

NotificationSchema.statics.findPendingEmails = function() {
  return this.find({
    emailSent: false,
    createdAt: { $gte: new Date(Date.now() - 60000) } // Within last minute
  })
  .populate('recipientId', 'email username fullName')
  .populate('relatedUser', 'username fullName')
  .populate('relatedProject', 'title')
  .populate('relatedEvent', 'title startDateTime');
};

NotificationSchema.statics.createProjectUpdateNotification = async function(
  projectId: Types.ObjectId,
  updateTitle: string,
  ownerId: Types.ObjectId
) {
  // Find all subscribers
  const subscribers = await mongoose.model('Subscription').find({
    projectId,
    isActive: true,
    userId: { $ne: ownerId } // Don't notify the owner
  }).populate('userId', 'username');
  
  // Create notifications for all subscribers
  const notifications = subscribers.map(sub => ({
    recipientId: sub.userId._id,
    type: 'project_update',
    relatedProject: projectId,
    relatedUser: ownerId,
    title: 'Project Update',
    message: `New update: ${updateTitle}`
  }));
  
  if (notifications.length > 0) {
    await this.insertMany(notifications);
  }
};

NotificationSchema.statics.createCommentReplyNotification = async function(
  commentId: Types.ObjectId,
  parentCommentId: Types.ObjectId,
  authorId: Types.ObjectId,
  projectId: Types.ObjectId
) {
  // Get the parent comment to find who to notify
  const parentComment = await mongoose.model('Comment')
    .findById(parentCommentId)
    .populate('authorId', 'username');
  
  if (parentComment && !parentComment.authorId._id.equals(authorId)) {
    await this.create({
      recipientId: parentComment.authorId._id,
      type: 'comment_reply',
      relatedComment: commentId,
      relatedProject: projectId,
      relatedUser: authorId,
      title: 'New Reply',
      message: 'Someone replied to your comment'
    });
  }
};

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);