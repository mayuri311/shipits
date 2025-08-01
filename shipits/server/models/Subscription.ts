import mongoose, { Schema, Document, Types } from 'mongoose';

export interface INotificationPreferences {
  email: boolean;
  inApp: boolean;
  frequency: 'immediate' | 'daily' | 'weekly';
}

export interface ISubscription extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  projectId: Types.ObjectId;
  notificationPreferences: INotificationPreferences;
  subscribedAt: Date;
  lastNotificationSent?: Date;
  isActive: boolean;
  
  // Methods
  updatePreferences(preferences: Partial<INotificationPreferences>): Promise<void>;
  deactivate(): Promise<void>;
  activate(): Promise<void>;
}

const NotificationPreferencesSchema = new Schema<INotificationPreferences>({
  email: {
    type: Boolean,
    default: true
  },
  inApp: {
    type: Boolean,
    default: true
  },
  frequency: {
    type: String,
    enum: ['immediate', 'daily', 'weekly'],
    default: 'immediate'
  }
}, { _id: false });

const SubscriptionSchema = new Schema<ISubscription>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  projectId: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  notificationPreferences: {
    type: NotificationPreferencesSchema,
    default: {}
  },
  subscribedAt: {
    type: Date,
    default: Date.now
  },
  lastNotificationSent: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes
SubscriptionSchema.index({ userId: 1, projectId: 1 }, { unique: true });
SubscriptionSchema.index({ projectId: 1, isActive: 1 });
SubscriptionSchema.index({ userId: 1, isActive: 1 });
SubscriptionSchema.index({ 
  'notificationPreferences.frequency': 1, 
  lastNotificationSent: 1,
  isActive: 1 
});

// Post-save middleware to update project subscriber count
SubscriptionSchema.post('save', async function() {
  try {
    const activeCount = await mongoose.model('Subscription').countDocuments({
      projectId: this.projectId,
      isActive: true
    });
    
    await mongoose.model('Project').findByIdAndUpdate(
      this.projectId,
      { 'analytics.subscribers': activeCount }
    );
  } catch (error) {
    console.error('Error updating project subscriber count:', error);
  }
});

// Instance methods
SubscriptionSchema.methods.updatePreferences = async function(
  preferences: Partial<INotificationPreferences>
): Promise<void> {
  Object.assign(this.notificationPreferences, preferences);
  await this.save();
};

SubscriptionSchema.methods.deactivate = async function(): Promise<void> {
  this.isActive = false;
  await this.save();
};

SubscriptionSchema.methods.activate = async function(): Promise<void> {
  this.isActive = true;
  await this.save();
};

// Static methods
SubscriptionSchema.statics.findUserSubscriptions = function(userId: Types.ObjectId) {
  return this.find({ userId, isActive: true })
    .populate('projectId', 'title description ownerId status')
    .sort({ subscribedAt: -1 });
};

SubscriptionSchema.statics.findProjectSubscribers = function(projectId: Types.ObjectId) {
  return this.find({ projectId, isActive: true })
    .populate('userId', 'username email fullName notificationPreferences')
    .sort({ subscribedAt: -1 });
};

SubscriptionSchema.statics.findByFrequency = function(
  frequency: 'immediate' | 'daily' | 'weekly'
) {
  const query: any = {
    isActive: true,
    'notificationPreferences.frequency': frequency
  };
  
  // Add time-based filtering for daily/weekly
  if (frequency === 'daily') {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    query.$or = [
      { lastNotificationSent: { $lt: oneDayAgo } },
      { lastNotificationSent: { $exists: false } }
    ];
  } else if (frequency === 'weekly') {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    query.$or = [
      { lastNotificationSent: { $lt: oneWeekAgo } },
      { lastNotificationSent: { $exists: false } }
    ];
  }
  
  return this.find(query)
    .populate('userId', 'username email fullName')
    .populate('projectId', 'title ownerId');
};

export const Subscription = mongoose.model<ISubscription>('Subscription', SubscriptionSchema);