import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAnalyticsMetrics {
  views: number;
  uniqueViewers: Types.ObjectId[];
  comments: number;
  shares: number;
  avgTimeSpent: number; // in seconds
}

export interface IReferrer {
  source: string;
  count: number;
}

export interface IProjectAnalytics extends Document {
  _id: Types.ObjectId;
  projectId: Types.ObjectId;
  date: Date; // Daily aggregation
  metrics: IAnalyticsMetrics;
  referrers: IReferrer[];
  createdAt: Date;
  
  // Methods
  addView(userId?: Types.ObjectId, timeSpent?: number, referrer?: string): Promise<void>;
  addComment(): Promise<void>;
  addShare(referrer?: string): Promise<void>;
}

const AnalyticsMetricsSchema = new Schema<IAnalyticsMetrics>({
  views: {
    type: Number,
    default: 0,
    min: 0
  },
  uniqueViewers: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: {
    type: Number,
    default: 0,
    min: 0
  },
  shares: {
    type: Number,
    default: 0,
    min: 0
  },
  avgTimeSpent: {
    type: Number,
    default: 0,
    min: 0
  }
}, { _id: false });

const ReferrerSchema = new Schema<IReferrer>({
  source: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  count: {
    type: Number,
    default: 1,
    min: 1
  }
}, { _id: false });

const ProjectAnalyticsSchema = new Schema<IProjectAnalytics>({
  projectId: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  metrics: {
    type: AnalyticsMetricsSchema,
    default: {}
  },
  referrers: [ReferrerSchema]
}, {
  timestamps: true
});

// Compound indexes
ProjectAnalyticsSchema.index({ projectId: 1, date: -1 }, { unique: true });
ProjectAnalyticsSchema.index({ date: -1, 'metrics.views': -1 });

// Instance methods
ProjectAnalyticsSchema.methods.addView = async function(
  userId?: Types.ObjectId,
  timeSpent?: number,
  referrer?: string
): Promise<void> {
  this.metrics.views += 1;
  
  if (userId && !this.metrics.uniqueViewers.includes(userId)) {
    this.metrics.uniqueViewers.push(userId);
  }
  
  if (timeSpent && timeSpent > 0) {
    // Update average time spent (simple moving average)
    const totalViews = this.metrics.views;
    const currentTotal = this.metrics.avgTimeSpent * (totalViews - 1);
    this.metrics.avgTimeSpent = (currentTotal + timeSpent) / totalViews;
  }
  
  if (referrer) {
    const existingReferrer = this.referrers.find(r => r.source === referrer);
    if (existingReferrer) {
      existingReferrer.count += 1;
    } else {
      this.referrers.push({ source: referrer, count: 1 });
    }
  }
  
  await this.save();
};

ProjectAnalyticsSchema.methods.addComment = async function(): Promise<void> {
  this.metrics.comments += 1;
  await this.save();
};

ProjectAnalyticsSchema.methods.addShare = async function(referrer?: string): Promise<void> {
  this.metrics.shares += 1;
  
  if (referrer) {
    const existingReferrer = this.referrers.find(r => r.source === referrer);
    if (existingReferrer) {
      existingReferrer.count += 1;
    } else {
      this.referrers.push({ source: referrer, count: 1 });
    }
  }
  
  await this.save();
};

// Static methods
ProjectAnalyticsSchema.statics.findOrCreateToday = async function(projectId: Types.ObjectId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let analytics = await this.findOne({ projectId, date: today });
  
  if (!analytics) {
    analytics = await this.create({
      projectId,
      date: today,
      metrics: {
        views: 0,
        uniqueViewers: [],
        comments: 0,
        shares: 0,
        avgTimeSpent: 0
      },
      referrers: []
    });
  }
  
  return analytics;
};

ProjectAnalyticsSchema.statics.getProjectStats = function(
  projectId: Types.ObjectId, 
  startDate: Date, 
  endDate: Date
) {
  return this.aggregate([
    {
      $match: {
        projectId,
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$projectId',
        totalViews: { $sum: '$metrics.views' },
        totalComments: { $sum: '$metrics.comments' },
        totalShares: { $sum: '$metrics.shares' },
        avgTimeSpent: { $avg: '$metrics.avgTimeSpent' },
        uniqueViewers: { $addToSet: '$metrics.uniqueViewers' },
        topReferrers: { $push: '$referrers' }
      }
    }
  ]);
};

ProjectAnalyticsSchema.statics.getTrendingProjects = function(days = 7, limit = 10) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);
  
  return this.aggregate([
    {
      $match: {
        date: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$projectId',
        totalViews: { $sum: '$metrics.views' },
        totalComments: { $sum: '$metrics.comments' },
        uniqueViewers: { $addToSet: '$metrics.uniqueViewers' }
      }
    },
    {
      $addFields: {
        uniqueViewerCount: { $size: { $reduce: {
          input: '$uniqueViewers',
          initialValue: [],
          in: { $setUnion: ['$$value', '$$this'] }
        }}}
      }
    },
    {
      $lookup: {
        from: 'projects',
        localField: '_id',
        foreignField: '_id',
        as: 'project'
      }
    },
    {
      $unwind: '$project'
    },
    {
      $match: {
        'project.status': 'active',
        'project.isDeleted': false
      }
    },
    {
      $sort: { totalViews: -1, uniqueViewerCount: -1 }
    },
    {
      $limit: limit
    }
  ]);
};

ProjectAnalyticsSchema.statics.getTopReferrers = function(projectId: Types.ObjectId, limit = 10) {
  return this.aggregate([
    {
      $match: { projectId }
    },
    {
      $unwind: '$referrers'
    },
    {
      $group: {
        _id: '$referrers.source',
        totalCount: { $sum: '$referrers.count' }
      }
    },
    {
      $sort: { totalCount: -1 }
    },
    {
      $limit: limit
    }
  ]);
};

ProjectAnalyticsSchema.statics.recordView = async function(
  projectId: Types.ObjectId,
  userId?: Types.ObjectId,
  timeSpent?: number,
  referrer?: string
) {
  const analytics = await this.findOrCreateToday(projectId);
  await analytics.addView(userId, timeSpent, referrer);
  return analytics;
};

ProjectAnalyticsSchema.statics.recordComment = async function(projectId: Types.ObjectId) {
  const analytics = await this.findOrCreateToday(projectId);
  await analytics.addComment();
  return analytics;
};

ProjectAnalyticsSchema.statics.recordShare = async function(
  projectId: Types.ObjectId,
  referrer?: string
) {
  const analytics = await this.findOrCreateToday(projectId);
  await analytics.addShare(referrer);
  return analytics;
};

export const ProjectAnalytics = mongoose.model<IProjectAnalytics>('ProjectAnalytics', ProjectAnalyticsSchema);