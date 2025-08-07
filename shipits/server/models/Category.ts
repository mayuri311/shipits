import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICategory extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  color: string;
  tags: string[];
  isActive: boolean;
  createdBy: Types.ObjectId;
  projectCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 50,
    index: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: 200
  },
  color: {
    type: String,
    required: true,
    match: /^#[0-9a-fA-F]{6}$/,
    default: '#3b82f6'
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: 50
  }],
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for project count
CategorySchema.virtual('projectCount', {
  ref: 'Project',
  localField: 'tags',
  foreignField: 'tags',
  count: true,
  match: { status: 'active', isDeleted: false }
});

// Indexes for performance
CategorySchema.index({ isActive: 1, createdAt: -1 });
CategorySchema.index({ name: 'text', description: 'text' });

// Static methods for common queries
CategorySchema.statics.findActive = function() {
  return this.find({ isActive: true }).sort({ name: 1 });
};

CategorySchema.statics.findByTag = function(tag: string) {
  return this.find({ 
    tags: { $in: [tag.toLowerCase()] },
    isActive: true 
  });
};

export const Category = mongoose.model<ICategory>('Category', CategorySchema);