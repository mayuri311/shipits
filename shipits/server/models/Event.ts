import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IEventLocation {
  name: string;
  address?: string;
  room?: string;
  virtualLink?: string;
}

export interface IEventAttendee {
  userId: Types.ObjectId;
  status: 'registered' | 'attended' | 'cancelled';
  registeredAt: Date;
}

export interface IEvent extends Document {
  _id: Types.ObjectId;
  title: string;
  description: string;
  googleCalendarId?: string;
  eventType: 'major' | 'minor' | 'workshop' | 'meetup';
  startDateTime: Date;
  endDateTime: Date;
  location: IEventLocation;
  organizers: Types.ObjectId[];
  attendees: IEventAttendee[];
  capacity?: number;
  thumbnailImage?: string;
  tags: string[];
  isFeatured: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: Types.ObjectId;
  
  // Methods
  registerAttendee(userId: Types.ObjectId): Promise<boolean>;
  cancelRegistration(userId: Types.ObjectId): Promise<void>;
  markAttended(userId: Types.ObjectId): Promise<void>;
  isUserRegistered(userId: Types.ObjectId): boolean;
  getAvailableSpots(): number;
}

const EventLocationSchema = new Schema<IEventLocation>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  address: {
    type: String,
    trim: true,
    maxlength: 300
  },
  room: {
    type: String,
    trim: true,
    maxlength: 100
  },
  virtualLink: {
    type: String,
    trim: true,
    validate: {
      validator: function(url: string) {
        if (!url) return true;
        return /^https?:\/\/.+/.test(url);
      },
      message: 'Invalid URL format'
    }
  }
}, { _id: false });

const EventAttendeeSchema = new Schema<IEventAttendee>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['registered', 'attended', 'cancelled'],
    default: 'registered'
  },
  registeredAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const EventSchema = new Schema<IEvent>({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
    index: true
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  googleCalendarId: {
    type: String,
    trim: true,
    index: true
  },
  eventType: {
    type: String,
    enum: ['major', 'minor', 'workshop', 'meetup'],
    default: 'minor',
    index: true
  },
  startDateTime: {
    type: Date,
    required: true,
    index: true
  },
  endDateTime: {
    type: Date,
    required: true,
    validate: {
      validator: function(endDate: Date) {
        return endDate > this.startDateTime;
      },
      message: 'End date must be after start date'
    }
  },
  location: {
    type: EventLocationSchema,
    required: true
  },
  organizers: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  attendees: [EventAttendeeSchema],
  capacity: {
    type: Number,
    min: 1,
    max: 10000
  },
  thumbnailImage: {
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
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: 50
  }],
  isFeatured: {
    type: Boolean,
    default: false,
    index: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Additional compound indexes for performance  
EventSchema.index({ eventType: 1, isFeatured: 1 });
EventSchema.index({ tags: 1 });
EventSchema.index({ 'organizers': 1 });
EventSchema.index({ isFeatured: 1, startDateTime: 1 });

// Text search index
EventSchema.index({
  title: 'text',
  description: 'text',
  tags: 'text'
}, {
  weights: {
    title: 10,
    tags: 5,
    description: 1
  }
});

// Virtual for registered attendee count
EventSchema.virtual('registeredCount').get(function() {
  return this.attendees.filter(a => a.status === 'registered').length;
});

// Virtual for attended count
EventSchema.virtual('attendedCount').get(function() {
  return this.attendees.filter(a => a.status === 'attended').length;
});

// Virtual for duration in hours
EventSchema.virtual('durationHours').get(function() {
  const diffMs = this.endDateTime.getTime() - this.startDateTime.getTime();
  return Math.round(diffMs / (1000 * 60 * 60) * 100) / 100;
});

// Virtual for event status
EventSchema.virtual('status').get(function() {
  const now = new Date();
  if (now < this.startDateTime) return 'upcoming';
  if (now > this.endDateTime) return 'completed';
  return 'ongoing';
});

// Instance methods
EventSchema.methods.registerAttendee = async function(userId: Types.ObjectId): Promise<boolean> {
  // Check if already registered
  const existingAttendee = this.attendees.find(a => 
    a.userId.equals(userId) && a.status !== 'cancelled'
  );
  
  if (existingAttendee) {
    return false; // Already registered
  }
  
  // Check capacity
  if (this.capacity && this.registeredCount >= this.capacity) {
    throw new Error('Event is at full capacity');
  }
  
  // Add new attendee
  this.attendees.push({
    userId,
    status: 'registered',
    registeredAt: new Date()
  });
  
  await this.save();
  
  // Create notification for organizers
  const Notification = mongoose.model('Notification');
  for (const organizerId of this.organizers) {
    await Notification.create({
      recipientId: organizerId,
      type: 'event_registration',
      relatedUser: userId,
      title: 'New Event Registration',
      message: `Someone registered for your event: ${this.title}`,
      read: false
    });
  }
  
  return true;
};

EventSchema.methods.cancelRegistration = async function(userId: Types.ObjectId): Promise<void> {
  const attendee = this.attendees.find(a => a.userId.equals(userId));
  if (attendee) {
    attendee.status = 'cancelled';
    await this.save();
  }
};

EventSchema.methods.markAttended = async function(userId: Types.ObjectId): Promise<void> {
  const attendee = this.attendees.find(a => a.userId.equals(userId));
  if (attendee && attendee.status === 'registered') {
    attendee.status = 'attended';
    await this.save();
  }
};

EventSchema.methods.isUserRegistered = function(userId: Types.ObjectId): boolean {
  return this.attendees.some(a => 
    a.userId.equals(userId) && a.status === 'registered'
  );
};

EventSchema.methods.getAvailableSpots = function(): number {
  if (!this.capacity) return Infinity;
  return Math.max(0, this.capacity - this.registeredCount);
};

// Static methods
EventSchema.statics.findUpcoming = function(limit = 10) {
  return this.find({
    startDateTime: { $gt: new Date() }
  })
  .populate('organizers', 'username fullName profileImage')
  .sort({ startDateTime: 1 })
  .limit(limit);
};

EventSchema.statics.findFeatured = function() {
  return this.find({
    isFeatured: true,
    startDateTime: { $gt: new Date() }
  })
  .populate('organizers', 'username fullName profileImage')
  .sort({ startDateTime: 1 })
  .limit(3);
};

EventSchema.statics.findByType = function(eventType: string) {
  return this.find({
    eventType,
    startDateTime: { $gt: new Date() }
  })
  .populate('organizers', 'username fullName profileImage')
  .sort({ startDateTime: 1 });
};

EventSchema.statics.findUserEvents = function(userId: Types.ObjectId) {
  return this.find({
    $or: [
      { organizers: userId },
      { 'attendees.userId': userId, 'attendees.status': { $ne: 'cancelled' } }
    ]
  })
  .populate('organizers', 'username fullName profileImage')
  .sort({ startDateTime: 1 });
};

export const Event = mongoose.model<IEvent>('Event', EventSchema);