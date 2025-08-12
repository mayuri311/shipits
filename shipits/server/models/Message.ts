import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IMessage extends Document {
  _id: Types.ObjectId;
  conversationId: Types.ObjectId;
  senderId: Types.ObjectId;
  content: string;
  attachments?: Array<{
    type: 'image' | 'file' | 'other';
    url: string;
    filename?: string;
    size?: number;
  }>;
  mentions?: Types.ObjectId[];
  readBy: Types.ObjectId[];
  edited?: boolean;
  editHistory?: Array<{ content: string; editedAt: Date }>;
  isDeleted?: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AttachmentSchema = new Schema({
  type: { type: String, enum: ['image', 'file', 'other'], required: true },
  url: { type: String, required: true },
  filename: { type: String },
  size: { type: Number },
}, { _id: false });

const MessageSchema = new Schema<IMessage>({
  conversationId: {
    type: Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true,
  },
  senderId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  content: {
    type: String,
    trim: true,
    maxlength: 5000,
    default: '',
  },
  attachments: [AttachmentSchema],
  mentions: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  readBy: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],
  edited: { type: Boolean, default: false },
  editHistory: [{
    content: { type: String },
    editedAt: { type: Date, default: Date.now },
    _id: false,
  }],
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
  deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

MessageSchema.index({ conversationId: 1, createdAt: -1 });

export const Message = mongoose.model<IMessage>('Message', MessageSchema);

