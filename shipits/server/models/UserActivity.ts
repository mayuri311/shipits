import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IActivity {
  type: 'project_update' | 'comment' | 'project_created' | 'project_revived';
  relatedId: Types.ObjectId;
  timestamp: Date;
}

export interface IUserActivity extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  date: Date; // Store as start of day for easy querying
  activities: IActivity[];
  points: number; // For gamification
  createdAt: Date;
  
  // Methods
  addActivity(type: IActivity['type'], relatedId: Types.ObjectId): Promise<void>;
  calculatePoints(): number;
}

const ActivitySchema = new Schema<IActivity>({
  type: {
    type: String,
    enum: ['project_update', 'comment', 'project_created', 'project_revived'],
    required: true
  },
  relatedId: {
    type: Schema.Types.ObjectId,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const UserActivitySchema = new Schema<IUserActivity>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  activities: [ActivitySchema],
  points: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

// Compound indexes
UserActivitySchema.index({ userId: 1, date: -1 }, { unique: true });
UserActivitySchema.index({ date: -1, points: -1 });

// Pre-save middleware to calculate points
UserActivitySchema.pre('save', function(next) {
  this.points = this.calculatePoints();
  next();
});

// Instance methods
UserActivitySchema.methods.addActivity = async function(
  type: IActivity['type'], 
  relatedId: Types.ObjectId
): Promise<void> {
  const activity: IActivity = {
    type,
    relatedId,
    timestamp: new Date()
  };
  
  this.activities.push(activity);
  await this.save();
  
  // Update user's streak
  const User = mongoose.model('User');
  const user = await User.findById(this.userId);
  if (user) {
    await user.updateStreak();
  }
};

UserActivitySchema.methods.calculatePoints = function(): number {
  const pointValues = {
    project_created: 10,
    project_update: 5,
    comment: 2,
    project_revived: 15
  };
  
  return this.activities.reduce((total, activity) => {
    return total + (pointValues[activity.type] || 0);
  }, 0);
};

// Static methods
UserActivitySchema.statics.findOrCreateToday = async function(userId: Types.ObjectId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let activity = await this.findOne({ userId, date: today });
  
  if (!activity) {
    activity = await this.create({
      userId,
      date: today,
      activities: [],
      points: 0
    });
  }
  
  return activity;
};

UserActivitySchema.statics.getUserStreak = async function(userId: Types.ObjectId) {
  const activities = await this.find({ userId })
    .sort({ date: -1 })
    .limit(365); // Last year
  
  if (activities.length === 0) return 0;
  
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  for (let i = 0; i < activities.length; i++) {
    const activityDate = new Date(activities[i].date);
    const expectedDate = new Date(today.getTime() - (i * 24 * 60 * 60 * 1000));
    
    if (activityDate.getTime() === expectedDate.getTime()) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
};

UserActivitySchema.statics.getLeaderboard = function(period = 30, limit = 10) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - period);
  startDate.setHours(0, 0, 0, 0);
  
  return this.aggregate([
    {
      $match: {
        date: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$userId',
        totalPoints: { $sum: '$points' },
        totalActivities: { $sum: { $size: '$activities' } },
        activeDays: { $sum: 1 }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }
    },
    {
      $unwind: '$user'
    },
    {
      $project: {
        _id: 1,
        totalPoints: 1,
        totalActivities: 1,
        activeDays: 1,
        username: '$user.username',
        fullName: '$user.fullName',
        profileImage: '$user.profileImage'
      }
    },
    {
      $sort: { totalPoints: -1 }
    },
    {
      $limit: limit
    }
  ]);
};

UserActivitySchema.statics.getActivityCalendar = function(userId: Types.ObjectId, year?: number) {
  const targetYear = year || new Date().getFullYear();
  const startDate = new Date(targetYear, 0, 1);
  const endDate = new Date(targetYear + 1, 0, 1);
  
  return this.find({
    userId,
    date: {
      $gte: startDate,
      $lt: endDate
    }
  })
  .select('date activities points')
  .sort({ date: 1 });
};

UserActivitySchema.statics.recordActivity = async function(
  userId: Types.ObjectId,
  type: IActivity['type'],
  relatedId: Types.ObjectId
) {
  const activity = await this.findOrCreateToday(userId);
  await activity.addActivity(type, relatedId);
  return activity;
};

export const UserActivity = mongoose.model<IUserActivity>('UserActivity', UserActivitySchema);