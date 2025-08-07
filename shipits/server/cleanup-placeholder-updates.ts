// Script to clean up existing projects with incorrect comment counts
// Run this once to sync all existing comment counts

import mongoose from 'mongoose';
import { Project } from './models/Project.js';
import { Comment } from './models/Comment.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shipits';

async function syncCommentCounts() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const projects = await Project.find({ isDeleted: { $ne: true } });
    console.log(`Found ${projects.length} projects to sync`);

    let updatedCount = 0;
    
    for (const project of projects) {
      // Count actual non-deleted comments for this project
      const actualCommentCount = await Comment.countDocuments({
        projectId: project._id,
        isDeleted: { $ne: true }
      });
      
      // Get current stored count
      const storedCount = project.analytics?.totalComments || 0;
      
      if (actualCommentCount !== storedCount) {
        console.log(`Project "${project.title}" - Stored: ${storedCount}, Actual: ${actualCommentCount}`);
        
        // Update the stored count
        await Project.findByIdAndUpdate(project._id, {
          $set: { 'analytics.totalComments': actualCommentCount }
        });
        
        updatedCount++;
      }
    }

    console.log(`\nSync completed! Updated ${updatedCount} projects.`);
    
  } catch (error) {
    console.error('Error syncing comment counts:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the sync if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  syncCommentCounts();
}

export { syncCommentCounts };