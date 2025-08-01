// MongoDB Models Export
// This file exports all MongoDB models for the ShipIts Forum application

export { User, type IUser } from './User';
export { Project, type IProject } from './Project';
export { Comment, type IComment } from './Comment';
export { Event, type IEvent } from './Event';
export { Subscription, type ISubscription } from './Subscription';
export { Notification, type INotification } from './Notification';
export { UserActivity, type IUserActivity } from './UserActivity';
export { ProjectAnalytics, type IProjectAnalytics } from './ProjectAnalytics';
export { ForumModerationLog, type IForumModerationLog } from './ForumModerationLog';
export { ThreadSummary, type IThreadSummary } from './ThreadSummary';
export { Contact, type IContact } from './Contact';

// Model initialization function
import mongoose from 'mongoose';
import { User } from './User';
import { Project } from './Project';
import { Comment } from './Comment';
import { Event } from './Event';
import { Subscription } from './Subscription';
import { Notification } from './Notification';
import { UserActivity } from './UserActivity';
import { ProjectAnalytics } from './ProjectAnalytics';
import { ForumModerationLog } from './ForumModerationLog';
import { ThreadSummary } from './ThreadSummary';
import { Contact } from './Contact';

/**
 * Initialize all MongoDB models
 * This function ensures all models are registered with Mongoose
 * and creates necessary indexes
 */
export async function initializeModels(): Promise<void> {
  console.log('🔧 Initializing MongoDB models...');
  
  try {
    // Register all models (they're already registered by importing)
    const models = [
      'User',
      'Project', 
      'Comment',
      'Event',
      'Subscription',
      'Notification',
      'UserActivity',
      'ProjectAnalytics',
      'ForumModerationLog',
      'Contact'
    ];
    
    // Ensure indexes are created for all models
    for (const modelName of models) {
      const model = mongoose.model(modelName);
      await model.ensureIndexes();
      console.log(`✅ Indexes created for ${modelName} model`);
    }
    
    console.log('🎉 All MongoDB models initialized successfully');
    
  } catch (error) {
    console.error('❌ Error initializing MongoDB models:', error);
    throw error;
  }
}

/**
 * Drop all collections (USE WITH CAUTION - for development only)
 */
export async function dropAllCollections(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Cannot drop collections in production environment');
  }
  
  console.log('⚠️  Dropping all MongoDB collections...');
  
  try {
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    for (const collection of collections) {
      await mongoose.connection.db.dropCollection(collection.name);
      console.log(`🗑️  Dropped collection: ${collection.name}`);
    }
    
    console.log('✅ All collections dropped successfully');
    
  } catch (error) {
    console.error('❌ Error dropping collections:', error);
    throw error;
  }
}

/**
 * Create default admin user and sample data
 */
export async function seedDatabase(): Promise<void> {
  console.log('🌱 Seeding database with initial data...');
  
  try {
    // Check if admin user already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('👑 Admin user already exists, skipping seed');
      return;
    }
    
    // Create admin user
    const adminUser = await User.create({
      username: 'admin',
      email: 'admin@shipits.com',
      password: 'admin123', // This will be hashed automatically
      fullName: 'ShipIts Administrator',
      role: 'admin',
      college: 'School of Computer Science',
      graduationYear: new Date().getFullYear(),
      bio: 'ShipIts Forum Administrator'
    });
    
    console.log('👑 Created admin user:', adminUser.username);
    
    // Create sample project categories/tags
    const sampleTags = [
      'tech', 'web-development', 'mobile-app', 'ai-ml', 'robotics',
      'art', 'design', 'music', 'photography', 'video',
      'hardware', 'iot', 'blockchain', 'cybersecurity', 'data-science',
      'game-development', 'vr-ar', 'startup', 'social-impact', 'research'
    ];
    
    // Create a sample featured project
    const sampleProject = await Project.create({
      title: 'Welcome to ShipIts Forum!',
      ownerId: adminUser._id,
      description: 'This is a sample project to get you started. Share your amazing creations with the CMU community!',
      status: 'active',
      tags: ['tech', 'community', 'sample'],
      featured: true,
      media: [],
      analytics: {
        views: 0,
        uniqueViewers: [],
        shares: 0,
        sharesByPlatform: new Map(),
        totalComments: 0,
        totalLikes: 0,
        subscribers: 0
      }
    });
    
    console.log('📋 Created sample project:', sampleProject.title);
    
    // Create sample event
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7); // One week from now
    
    const endDate = new Date(futureDate);
    endDate.setHours(futureDate.getHours() + 2); // 2 hours duration
    
    const sampleEvent = await Event.create({
      title: 'ShipIts Welcome Event',
      description: 'Join us for an introduction to the ShipIts community and learn how to showcase your projects!',
      eventType: 'major',
      startDateTime: futureDate,
      endDateTime: endDate,
      location: {
        name: 'Gates Hillman Center',
        room: 'GHC 4405',
        address: '4902 Forbes Ave, Pittsburgh, PA 15213'
      },
      organizers: [adminUser._id],
      tags: ['welcome', 'networking', 'community'],
      isFeatured: true,
      createdBy: adminUser._id,
      capacity: 100
    });
    
    console.log('📅 Created sample event:', sampleEvent.title);
    
    console.log('🎉 Database seeded successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

/**
 * Get database statistics
 */
export async function getDatabaseStats(): Promise<any> {
  try {
    const stats = {
      users: await User.countDocuments(),
      projects: await Project.countDocuments(),
      comments: await Comment.countDocuments(),
      events: await Event.countDocuments(),
      subscriptions: await Subscription.countDocuments(),
      notifications: await Notification.countDocuments(),
      activeUsers: await User.countDocuments({ isActive: true }),
      activeProjects: await Project.countDocuments({ status: 'active', isDeleted: false }),
      featuredProjects: await Project.countDocuments({ featured: true, status: 'active' }),
      upcomingEvents: await Event.countDocuments({ startDateTime: { $gt: new Date() } })
    };
    
    return stats;
  } catch (error) {
    console.error('Error getting database stats:', error);
    throw error;
  }
}