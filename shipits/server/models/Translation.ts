import mongoose, { Schema, Document, Types } from 'mongoose';

export type TranslationSourceType = 'project' | 'project_update' | 'comment' | 'user' | 'message' | 'event';

export interface ITranslation extends Document {
  _id: Types.ObjectId;
  sourceType: TranslationSourceType;
  sourceId: Types.ObjectId;
  field: string; // e.g., 'title', 'description', 'content', 'bio'
  sourceLanguage?: string; // ISO code like 'en'
  targetLanguage: string;  // ISO code like 'es'
  translatedText: string;
  originalTextHash?: string; // sha256 of source text, for cache invalidation
  provider: 'azure-openai' | 'community';
  createdBy?: Types.ObjectId; // present when provider = 'community'
  upvotes?: number;
  downvotes?: number;
  selected?: boolean; // preferred community translation selected by moderators
  createdAt: Date;
  updatedAt: Date;
}

const TranslationSchema = new Schema<ITranslation>({
  sourceType: {
    type: String,
    enum: ['project', 'project_update', 'comment', 'user', 'message', 'event'],
    required: true,
    index: true,
  },
  sourceId: {
    type: Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  field: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  sourceLanguage: {
    type: String,
    trim: true,
  },
  targetLanguage: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  translatedText: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50000,
  },
  originalTextHash: {
    type: String,
    trim: true,
    index: true,
  },
  provider: {
    type: String,
    enum: ['azure-openai', 'community'],
    required: true,
    index: true,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  upvotes: {
    type: Number,
    default: 0,
    min: 0,
  },
  downvotes: {
    type: Number,
    default: 0,
    min: 0,
  },
  selected: {
    type: Boolean,
    default: false,
    index: true,
  },
}, {
  timestamps: true,
});

// Ensure we do not create duplicate machine translations for the same field and language
TranslationSchema.index(
  { sourceType: 1, sourceId: 1, field: 1, targetLanguage: 1, provider: 1, originalTextHash: 1 },
  { unique: true, partialFilterExpression: { provider: { $eq: 'azure-openai' } } }
);

// Prefer selected community translations
TranslationSchema.index({ sourceType: 1, sourceId: 1, field: 1, targetLanguage: 1, selected: 1 });

export const Translation = mongoose.model<ITranslation>('Translation', TranslationSchema);

