import mongoose, { Schema, Document, Types } from 'mongoose';

export type ConversationType = 'dm' | 'group' | 'project';

export interface IConversation extends Document {
  _id: Types.ObjectId;
  type: ConversationType;
  name?: string;
  description?: string;
  participants: Types.ObjectId[];
  createdBy: Types.ObjectId;
  projectId?: Types.ObjectId;
  lastMessageAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>({
  type: {
    type: String,
    enum: ['dm', 'group', 'project'],
    required: true,
    index: true,
  },
  name: {
    type: String,
    trim: true,
    maxlength: 120,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  participants: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  }],
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  projectId: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    index: true,
  },
  lastMessageAt: {
    type: Date,
    index: true,
    default: Date.now,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

ConversationSchema.index({ type: 1, participants: 1 }, { unique: false });
ConversationSchema.index({ projectId: 1, type: 1 });

export const Conversation = mongoose.model<IConversation>('Conversation', ConversationSchema);

