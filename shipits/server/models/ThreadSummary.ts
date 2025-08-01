/**
 * Thread Summary Model
 * Stores AI-generated summaries of comment threads
 */

import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IThreadSummary extends Document {
  _id: Types.ObjectId;
  projectId: Types.ObjectId;
  summary: string;
  commentCount: number;
  lastCommentId: Types.ObjectId;
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  needsUpdate(currentCommentCount: number, latestCommentId: Types.ObjectId): boolean;
}

const ThreadSummarySchema = new Schema<IThreadSummary>({
  projectId: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    unique: true, // One summary per project
    index: true
  },
  summary: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  commentCount: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  lastCommentId: {
    type: Schema.Types.ObjectId,
    ref: 'Comment',
    required: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
ThreadSummarySchema.index({ projectId: 1, lastUpdated: -1 });
ThreadSummarySchema.index({ lastUpdated: -1 }); // For cleanup tasks

// Instance method to check if summary needs updating
ThreadSummarySchema.methods.needsUpdate = function(
  currentCommentCount: number, 
  latestCommentId: Types.ObjectId
): boolean {
  // Update if:
  // 1. Comment count has changed significantly (more than 3 new comments)
  // 2. Or it's been more than 24 hours since last update
  // 3. Or the latest comment is different from what we last processed
  
  const commentCountChanged = Math.abs(this.commentCount - currentCommentCount) >= 3;
  const timeThreshold = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  const timeExpired = Date.now() - this.lastUpdated.getTime() > timeThreshold;
  const lastCommentChanged = !this.lastCommentId.equals(latestCommentId);
  
  return commentCountChanged || timeExpired || lastCommentChanged;
};

// Static methods
ThreadSummarySchema.statics.findByProject = function(projectId: string | Types.ObjectId) {
  return this.findOne({ projectId: new Types.ObjectId(projectId) });
};

ThreadSummarySchema.statics.createOrUpdate = async function(
  projectId: string | Types.ObjectId,
  summary: string,
  commentCount: number,
  lastCommentId: string | Types.ObjectId
) {
  const projectObjectId = new Types.ObjectId(projectId);
  const lastCommentObjectId = new Types.ObjectId(lastCommentId);
  
  return this.findOneAndUpdate(
    { projectId: projectObjectId },
    {
      summary,
      commentCount,
      lastCommentId: lastCommentObjectId,
      lastUpdated: new Date()
    },
    {
      upsert: true,
      new: true,
      runValidators: true
    }
  );
};

ThreadSummarySchema.statics.getStaleEntries = function(olderThanDays: number = 7) {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - olderThanDays);
  
  return this.find({
    lastUpdated: { $lt: threshold }
  }).populate('projectId', 'title status');
};

export const ThreadSummary = mongoose.model<IThreadSummary>('ThreadSummary', ThreadSummarySchema);