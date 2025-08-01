# MongoDB Integration Guide for ShipIts Forum

This guide covers the comprehensive MongoDB setup for the ShipIts Forum application.

## 🚀 Quick Start

### 1. Environment Setup

Copy the environment template and configure your MongoDB connection:

```bash
# Copy the environment template (create your own .env file)
# The template is provided in .env.template

# Create .env file with your MongoDB configuration
MONGODB_URI=mongodb://localhost:27017/shipits-forum
# For MongoDB Atlas: mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Database Initialization

```bash
# Seed the database with initial data
npm run db:seed

# OR reset and seed the database (⚠️ DELETES ALL DATA)
npm run db:reset
```

### 4. Start the Application

```bash
# Development mode
npm run dev

# Production mode
npm run build && npm start
```

## 📊 Database Schema Overview

The application uses 9 main MongoDB collections:

### Core Collections

1. **Users** - User accounts and profiles
2. **Projects** - Student projects and updates
3. **Comments** - Project comments and discussions
4. **Events** - ShipIts events and calendar integration

### Feature Collections

5. **Subscriptions** - Project subscription management
6. **Notifications** - Real-time notification system
7. **UserActivity** - Activity tracking for streaks
8. **ProjectAnalytics** - Project view and engagement analytics
9. **ForumModerationLog** - Moderation actions and audit trail

## 🏗️ Detailed Schema Descriptions

### Users Collection

Comprehensive user management with CMU SSO integration support:

```javascript
{
  _id: ObjectId,
  cmuId: String,           // CMU SSO identifier
  email: String,           // Required, unique
  username: String,        // Required, unique
  password: String,        // Hashed, optional for SSO users
  fullName: String,
  college: String,         // CMU college/school
  graduationYear: Number,
  profileImage: String,    // URL
  bio: String,
  contactInfo: {
    phone: String,
    linkedin: String,
    github: String,
    personalWebsite: String
  },
  streaks: {
    currentStreak: Number,
    longestStreak: Number,
    lastActivityDate: Date,
    totalActiveDays: Number
  },
  statistics: {
    projectsCreated: Number,
    commentsPosted: Number,
    projectsRevived: Number,
    helpfulAnswers: Number
  },
  subscriptions: [ObjectId],  // Project IDs
  role: String,               // 'user', 'moderator', 'admin'
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Projects Collection

Rich project data with media, updates, and analytics:

```javascript
{
  _id: ObjectId,
  title: String,
  ownerId: ObjectId,        // Reference to Users
  collaborators: [ObjectId], // User references
  status: String,           // 'active', 'inactive', 'archived', 'completed'
  description: String,
  tags: [String],           // Categories like 'tech', 'art', 'robotics'
  media: [{
    type: String,           // 'image' or 'video'
    url: String,
    caption: String,
    uploadedAt: Date,
    order: Number
  }],
  updates: [{              // Project update posts
    _id: ObjectId,
    title: String,
    content: String,
    media: [{ type: String, url: String }],
    createdAt: Date,
    updatedAt: Date
  }],
  analytics: {
    views: Number,
    uniqueViewers: [ObjectId],
    totalComments: Number,
    totalLikes: Number,
    subscribers: Number
  },
  featured: Boolean,        // Homepage featured
  isDeleted: Boolean,
  lastActivityAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Comments Collection

Threaded comments with Stack Overflow-style Q&A features:

```javascript
{
  _id: ObjectId,
  projectId: ObjectId,
  authorId: ObjectId,
  parentCommentId: ObjectId,  // For nested replies
  content: String,
  type: String,               // 'general', 'question', 'improvement', 'answer'
  tags: {
    isQuestion: Boolean,
    isAnswered: Boolean,
    acceptedAnswer: ObjectId,
    isPinned: Boolean
  },
  mentions: [ObjectId],       // @mentioned users
  reactions: [{
    userId: ObjectId,
    type: String              // 'like', 'helpful', etc.
  }],
  edited: Boolean,
  editHistory: [{ content: String, editedAt: Date }],
  isDeleted: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Events Collection

Google Calendar integration with registration management:

```javascript
{
  _id: ObjectId,
  title: String,
  description: String,
  googleCalendarId: String,   // For calendar sync
  eventType: String,          // 'major', 'minor', 'workshop', 'meetup'
  startDateTime: Date,
  endDateTime: Date,
  location: {
    name: String,
    address: String,
    room: String,
    virtualLink: String       // For online events
  },
  organizers: [ObjectId],
  attendees: [{
    userId: ObjectId,
    status: String,           // 'registered', 'attended', 'cancelled'
    registeredAt: Date
  }],
  capacity: Number,
  thumbnailImage: String,
  tags: [String],
  isFeatured: Boolean,        // Homepage display
  createdBy: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```

## 🔧 Advanced Features

### 1. User Activity Tracking & Streaks

The system automatically tracks user activity for gamification:

- Daily activity logging
- Streak calculation and maintenance
- Leaderboards and statistics
- Activity calendar visualization

### 2. Real-time Notifications

Comprehensive notification system:

- In-app notifications
- Email notifications (configurable)
- Batched delivery (immediate/daily/weekly)
- Auto-expiring notifications

### 3. Project Analytics

Detailed analytics for project performance:

- View tracking with unique visitor counts
- Time-spent metrics
- Referrer tracking
- Trending project algorithms

### 4. Forum Moderation

Complete moderation toolkit:

- Content deletion with audit trail
- User banning/unbanning
- Comment pinning and featuring
- Revertible moderation actions

### 5. Subscription System

User engagement through subscriptions:

- Project update notifications
- Customizable notification preferences
- Bulk notification delivery
- Subscription analytics

## 🚀 Performance Optimizations

### Database Indexes

Comprehensive indexing strategy for optimal performance:

```javascript
// Users
{ email: 1 }, { cmuId: 1 }, { username: 1 }
{ role: 1, isActive: 1 }
{ 'streaks.currentStreak': -1 }

// Projects  
{ ownerId: 1, status: 1 }
{ status: 1, createdAt: -1 }
{ tags: 1 }
{ 'analytics.views': -1 }
{ title: 'text', description: 'text', tags: 'text' }

// Comments
{ projectId: 1, createdAt: -1 }
{ parentCommentId: 1, createdAt: 1 }
{ authorId: 1, createdAt: -1 }

// Events
{ startDateTime: 1 }
{ eventType: 1, isFeatured: 1 }
```

### Connection Management

- Connection pooling with configurable limits
- Automatic reconnection handling
- Graceful shutdown procedures
- Health check endpoints

## 🔒 Security Features

### Data Protection

- Password hashing with bcrypt (12 rounds)
- Input validation with Zod schemas
- XSS protection through content sanitization
- Rate limiting on sensitive endpoints

### Authentication

- JWT-based session management
- CMU SSO integration ready
- Role-based access control (RBAC)
- Session timeout and refresh tokens

## 📚 API Integration

### RESTful Endpoints

The system provides comprehensive REST APIs:

```
GET    /api/users          - List users (paginated)
POST   /api/users          - Create user
GET    /api/users/:id      - Get user details
PUT    /api/users/:id      - Update user

GET    /api/projects       - List projects (filtered, paginated)
POST   /api/projects       - Create project
GET    /api/projects/:id   - Get project details
PUT    /api/projects/:id   - Update project

GET    /api/comments       - List comments (by project)
POST   /api/comments       - Create comment
PUT    /api/comments/:id   - Update comment

GET    /api/events         - List events
POST   /api/events         - Create event
POST   /api/events/:id/register - Register for event
```

### Real-time Features

- WebSocket support for live notifications
- Real-time comment updates
- Live event registration counters
- Activity feed updates

## 🧪 Development Tools

### Database Scripts

```bash
# Seed database with sample data
npm run db:seed

# Reset database (⚠️ DELETES ALL DATA)
npm run db:reset

# Check database connection
npm run db:check
```

### Development Helpers

- Comprehensive error logging
- Request/response logging middleware
- Database query profiling
- Performance monitoring hooks

## 🚀 Deployment Considerations

### MongoDB Atlas Setup

For production deployment with MongoDB Atlas:

1. Create a cluster on MongoDB Atlas
2. Configure network access (IP whitelist)
3. Create database user with appropriate permissions
4. Update `MONGODB_URI` with Atlas connection string

### Environment Variables

Required environment variables for production:

```env
MONGODB_URI=mongodb+srv://...
NODE_ENV=production
SESSION_SECRET=secure-random-string
CMU_SSO_CLIENT_ID=your-sso-client-id
CMU_SSO_CLIENT_SECRET=your-sso-secret
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@example.com
SMTP_PASS=your-email-password
```

### Monitoring & Maintenance

- Regular database backups
- Index performance monitoring
- Query optimization
- User activity analytics
- Error rate tracking

## 🆘 Troubleshooting

### Common Issues

1. **Connection Timeout**
   - Check MongoDB URI format
   - Verify network connectivity
   - Check Atlas IP whitelist

2. **Index Creation Failures**
   - Ensure unique constraints are met
   - Check for duplicate data
   - Verify schema compatibility

3. **Performance Issues**
   - Review query patterns
   - Check index usage
   - Monitor connection pool
   - Optimize aggregation pipelines

### Debug Commands

```bash
# Check database connection
node -e "require('./server/db').db.connect().then(() => console.log('Connected')).catch(console.error)"

# View database statistics
npm run db:stats

# Test model validations
npm run test:models
```

## 🔄 Migration Path

This implementation provides a complete transition from the previous PostgreSQL/Drizzle setup to MongoDB/Mongoose, maintaining all existing functionality while adding comprehensive new features for the ShipIts Forum community.

The system is designed to scale with the growing CMU student community and supports all the outlined requirements including authentication, project management, forum discussions, event management, and advanced analytics.