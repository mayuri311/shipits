import mongoose, { Schema, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IContactInfo {
  phone?: string;
  linkedin?: string;
  github?: string;
  personalWebsite?: string;
}

export interface IStreaks {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate?: Date;
  totalActiveDays: number;
}

export interface IUserStatistics {
  projectsCreated: number;
  commentsPosted: number;
  projectsRevived: number;
  helpfulAnswers: number;
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  cmuId?: string;
  email: string;
  username: string;
  password?: string; // Optional for SSO users
  fullName?: string;
  college?: string;
  graduationYear?: number;
  profileImage?: string;
  bio?: string;
  contactInfo: IContactInfo;
  streaks: IStreaks;
  statistics: IUserStatistics;
  subscriptions: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  isActive: boolean;
  role: 'user' | 'moderator' | 'admin';
  
  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  updateStreak(): Promise<void>;
  incrementStatistic(field: keyof IUserStatistics): Promise<void>;
}

const ContactInfoSchema = new Schema<IContactInfo>({
  phone: { type: String, trim: true },
  linkedin: { type: String, trim: true },
  github: { type: String, trim: true },
  personalWebsite: { type: String, trim: true }
}, { _id: false });

const StreaksSchema = new Schema<IStreaks>({
  currentStreak: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
  lastActivityDate: { type: Date },
  totalActiveDays: { type: Number, default: 0 }
}, { _id: false });

const UserStatisticsSchema = new Schema<IUserStatistics>({
  projectsCreated: { type: Number, default: 0 },
  commentsPosted: { type: Number, default: 0 },
  projectsRevived: { type: Number, default: 0 },
  helpfulAnswers: { type: Number, default: 0 }
}, { _id: false });

const UserSchema = new Schema<IUser>({
  cmuId: {
    type: String,
    unique: true,
    sparse: true, // Allows multiple null values
    trim: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
    validate: {
      validator: function(email: string) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      },
      message: 'Invalid email format'
    }
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
    index: true,
    validate: {
      validator: function(username: string) {
        return /^[a-zA-Z0-9_-]+$/.test(username);
      },
      message: 'Username can only contain letters, numbers, hyphens, and underscores'
    }
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    select: false // Don't include password in queries by default
  },
  fullName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  college: {
    type: String,
    trim: true,
    enum: [
      'School of Computer Science',
      'Carnegie Institute of Technology',
      'College of Engineering',
      'College of Fine Arts',
      'Dietrich College of Humanities and Social Sciences',
      'Heinz College of Information Systems and Public Policy',
      'Mellon College of Science',
      'Tepper School of Business',
      'Other'
    ]
  },
  graduationYear: {
    type: Number,
    min: new Date().getFullYear() - 10,
    max: new Date().getFullYear() + 10
  },
  profileImage: {
    type: String,
    trim: true,
    validate: {
      validator: function(url: string) {
        if (!url) return true;
        return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(url);
      },
      message: 'Invalid image URL format'
    }
  },
  bio: {
    type: String,
    trim: true,
    maxlength: 500
  },
  contactInfo: {
    type: ContactInfoSchema,
    default: {}
  },
  streaks: {
    type: StreaksSchema,
    default: {}
  },
  statistics: {
    type: UserStatisticsSchema,
    default: {}
  },
  subscriptions: [{
    type: Schema.Types.ObjectId,
    ref: 'Project'
  }],
  lastLoginAt: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  role: {
    type: String,
    enum: ['user', 'moderator', 'admin'],
    default: 'user',
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true, transform: function(doc, ret) {
    delete ret.password;
    return ret;
  }},
  toObject: { virtuals: true }
});

// Additional compound indexes for performance
UserSchema.index({ role: 1, isActive: 1 });
UserSchema.index({ 'streaks.currentStreak': -1 });
UserSchema.index({ createdAt: -1 });

// Pre-save middleware for password hashing
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Instance methods
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

UserSchema.methods.updateStreak = async function(): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const lastActivity = this.streaks.lastActivityDate;
  
  if (!lastActivity) {
    // First activity
    this.streaks.currentStreak = 1;
    this.streaks.longestStreak = 1;
    this.streaks.totalActiveDays = 1;
  } else {
    const lastActivityDate = new Date(lastActivity);
    lastActivityDate.setHours(0, 0, 0, 0);
    
    const diffTime = today.getTime() - lastActivityDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      // Consecutive day
      this.streaks.currentStreak += 1;
      this.streaks.totalActiveDays += 1;
    } else if (diffDays > 1) {
      // Streak broken
      this.streaks.currentStreak = 1;
      this.streaks.totalActiveDays += 1;
    }
    // If diffDays === 0, it's the same day, no change needed
    
    if (this.streaks.currentStreak > this.streaks.longestStreak) {
      this.streaks.longestStreak = this.streaks.currentStreak;
    }
  }
  
  this.streaks.lastActivityDate = today;
  await this.save();
};

UserSchema.methods.incrementStatistic = async function(field: keyof IUserStatistics): Promise<void> {
  this.statistics[field] += 1;
  await this.save();
};

// Virtual for full profile URL
UserSchema.virtual('profileUrl').get(function() {
  return `/profile/${this.username}`;
});

export const User = mongoose.model<IUser>('User', UserSchema);