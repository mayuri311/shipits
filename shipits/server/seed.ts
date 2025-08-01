#!/usr/bin/env tsx

/**
 * Database Seeding Script for ShipIts Forum
 * 
 * This script seeds the MongoDB database with initial data including:
 * - Admin user
 * - Sample projects  
 * - Sample events
 * - Default categories/tags
 * 
 * Usage: npm run db:seed
 */

import { db } from './db';
import { initializeModels, seedDatabase, getDatabaseStats } from './models';

async function runSeed() {
  console.log('🌱 Starting database seed process...');
  
  try {
    // Connect to database
    console.log('📡 Connecting to MongoDB...');
    await db.connect();
    
    // Initialize models
    console.log('🔧 Initializing models...');
    await initializeModels();
    
    // Seed the database
    console.log('🌱 Seeding database...');
    await seedDatabase();
    
    // Show database statistics
    console.log('📊 Database statistics:');
    const stats = await getDatabaseStats();
    console.table(stats);
    
    console.log('✅ Database seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during database seeding:', error);
    process.exit(1);
  } finally {
    // Disconnect from database
    await db.disconnect();
    process.exit(0);
  }
}

// Run the seed if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSeed();
}

export { runSeed };