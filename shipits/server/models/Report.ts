import mongoose, { Schema, Document, Types } from 'mongoose';

export type ReportTargetType = 'user' | 'project' | 'comment';
export type ReportReason = 'spam' | 'abuse' | 'harassment' | 'hate' | 'sexual' | 'self-harm' | 'copyright' | 'other';
export type ReportStatus = 'pending' | 'reviewed' | 'action_taken' | 'dismissed';

export interface IReportScores {
  heuristicScore?: number; // 0-1
  aiScore?: number; // 0-1
  categories?: Record<string, number>;
}

export interface IReport extends Document {
  _id: Types.ObjectId;
  reporterId: Types.ObjectId;
  targetType: ReportTargetType;
  targetId: Types.ObjectId;
  reason: ReportReason;
  details?: string;
  status: ReportStatus;
  autoFlagged: boolean;
  scores?: IReportScores;
  adminNotes?: string;
  processedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ReportScoresSchema = new Schema<IReportScores>({}, { strict: false, _id: false });

const ReportSchema = new Schema<IReport>({
  reporterId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  targetType: {
    type: String,
    enum: ['user', 'project', 'comment'],
    required: true,
    index: true,
  },
  targetId: {
    type: Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  reason: {
    type: String,
    enum: ['spam', 'abuse', 'harassment', 'hate', 'sexual', 'self-harm', 'copyright', 'other'],
    required: true,
    index: true,
  },
  details: {
    type: String,
    maxlength: 1000,
    trim: true,
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'action_taken', 'dismissed'],
    default: 'pending',
    index: true,
  },
  autoFlagged: {
    type: Boolean,
    default: false,
    index: true,
  },
  scores: {
    type: ReportScoresSchema,
    default: {},
  },
  adminNotes: {
    type: String,
    maxlength: 1000,
    trim: true,
  },
  processedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Compound indexes
ReportSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
ReportSchema.index({ reporterId: 1, createdAt: -1 });

export const Report = mongoose.model<IReport>('Report', ReportSchema);

