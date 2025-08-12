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

export interface IThemePreferences {
  mode: 'light' | 'dark' | 'system';
  accentColor: 'blue' | 'purple' | 'green' | 'orange' | 'red' | 'pink';
  preset: string;
  customColors?: Record<string, string>;
  fontSize: 'small' | 'medium' | 'large';
  reducedMotion: boolean;
  highContrast: boolean;
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
  badges: IUserBadge[];
  themePreferences: IThemePreferences;
  subscriptions: Types.ObjectId[];
  followers: Types.ObjectId[];
  following: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  isActive: boolean;
  role: 'user' | 'moderator' | 'admin';
  isFollowersListPublic?: boolean;
  isFollowingListPublic?: boolean;
  // Onboarding and tips
  onboarding?: {
    completed: boolean;
    version?: number;
    stepsCompleted?: string[];
    completedAt?: Date;
  };
  uiTips?: {
    dismissed: string[];
  };
  // Dashboard customization
  dashboardPreferences?: {
    pinnedProjectIds: Types.ObjectId[];
    pinnedStats: Array<'totalProjectViews' | 'totalLikesReceived' | 'totalCommentsPosted' | 'totalProjectsCreated' | 'unreadNotifications'>;
    layout: 'standard' | 'compact' | 'cards';
  };
  // Last AI personalization suggestion applied/saved
  lastAiPersonalization?: {
    preset: string;
    accentColor: 'blue' | 'purple' | 'green' | 'orange' | 'red' | 'pink';
    mode: 'light' | 'dark' | 'system';
    layout: 'standard' | 'compact' | 'cards';
    reason?: string;
    generatedAt: Date;
  };
  // Email verification
  emailVerified?: boolean;
  emailVerificationToken?: string | null;
  emailVerificationExpiresAt?: Date | null;
  emailVerifiedAt?: Date | null;
  // Password reset
  passwordResetToken?: string | null;
  passwordResetExpiresAt?: Date | null;
  
  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  updateStreak(): Promise<void>;
  incrementStatistic(field: keyof IUserStatistics): Promise<void>;
}

export interface IUserBadge {
  key: string; // stable unique key, e.g., 'first_project', 'ten_comments'
  name: string;
  description: string;
  icon?: string; // optional icon name
  awardedAt: Date;
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

const ThemePreferencesSchema = new Schema<IThemePreferences>({
  mode: {
    type: String,
    enum: ['light', 'dark', 'system'],
    default: 'system'
  },
  accentColor: {
    type: String,
    enum: ['blue', 'purple', 'green', 'orange', 'red', 'pink'],
    default: 'blue'
  },
  preset: {
    type: String,
    default: 'default'
  },
  customColors: {
    type: Map,
    of: String,
    default: new Map()
  },
  fontSize: {
    type: String,
    enum: ['small', 'medium', 'large'],
    default: 'medium'
  },
  reducedMotion: {
    type: Boolean,
    default: false
  },
  highContrast: {
    type: Boolean,
    default: false
  }
}, { _id: false });

// Onboarding/tips/dashboard schemas
const OnboardingSchema = new Schema({
  completed: { type: Boolean, default: false },
  version: { type: Number, default: 1 },
  stepsCompleted: { type: [String], default: [] },
  completedAt: { type: Date, default: null },
}, { _id: false });

const UiTipsSchema = new Schema({
  dismissed: { type: [String], default: [] },
}, { _id: false });

const DashboardPreferencesSchema = new Schema({
  pinnedProjectIds: [{ type: Schema.Types.ObjectId, ref: 'Project', index: true }],
  pinnedStats: { type: [String], default: [] },
  layout: { type: String, enum: ['standard', 'compact', 'cards'], default: 'standard' },
}, { _id: false });

const AiPersonalizationSchema = new Schema({
  preset: { type: String, default: 'default' },
  accentColor: { type: String, enum: ['blue','purple','green','orange','red','pink'], default: 'blue' },
  mode: { type: String, enum: ['light','dark','system'], default: 'system' },
  layout: { type: String, enum: ['standard','compact','cards'], default: 'standard' },
  reason: { type: String, default: '' },
  generatedAt: { type: Date, default: Date.now },
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
    default: null,
    validate: {
      validator: function(url: string) {
        if (!url || url === null) return true;
        // Accept both HTTP/HTTPS URLs and Base64 data URLs
        const urlPattern = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i;
        const base64Pattern = /^data:image\/(jpeg|jpg|png|gif|webp);base64,/i;
        return urlPattern.test(url) || base64Pattern.test(url);
      },
      message: 'Invalid image format. Must be a valid URL or Base64 data URL'
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
  badges: [{
    key: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    icon: { type: String },
    awardedAt: { type: Date, default: Date.now }
  }],
  themePreferences: {
    type: ThemePreferencesSchema,
    default: {}
  },
  subscriptions: [{
    type: Schema.Types.ObjectId,
    ref: 'Project'
  }],
  followers: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true
  }],
  following: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true
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
  },
  isFollowersListPublic: {
    type: Boolean,
    default: true
  },
  isFollowingListPublic: {
    type: Boolean,
    default: true
  },
  onboarding: { type: OnboardingSchema, default: {} },
  uiTips: { type: UiTipsSchema, default: {} },
  dashboardPreferences: { type: DashboardPreferencesSchema, default: {} },
  lastAiPersonalization: { type: AiPersonalizationSchema, default: undefined },
  // Email verification fields
  emailVerified: {
    type: Boolean,
    default: false,
    index: true
  },
  emailVerificationToken: {
    type: String,
    default: null,
    index: true
  },
  emailVerificationExpiresAt: {
    type: Date,
    default: null,
    index: true
  },
  emailVerifiedAt: {
    type: Date,
    default: null
  },
  // Password reset fields
  passwordResetToken: {
    type: String,
    default: null,
    index: true
  },
  passwordResetExpiresAt: {
    type: Date,
    default: null,
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