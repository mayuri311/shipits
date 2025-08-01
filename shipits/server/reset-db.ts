#!/usr/bin/env tsx

/**
 * Database Reset Script for ShipIts Forum
 * 
 * This script completely resets the MongoDB database by:
 * - Dropping all collections
 * - Recreating indexes
 * - Seeding with fresh data
 * 
 * ⚠️  WARNING: This will DELETE ALL DATA in the database!
 * Only use this in development environments.
 * 
 * Usage: npm run db:reset
 */

import { db } from './db';
import { initializeModels, dropAllCollections, seedDatabase, getDatabaseStats } from './models';
import readline from 'readline';

function askQuestion(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function resetDatabase() {
  console.log('🔄 Database Reset Script');
  console.log('⚠️  WARNING: This will DELETE ALL DATA in the database!');
  
  // Safety check - don't run in production
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ Cannot run database reset in production environment!');
    process.exit(1);
  }
  
  // Ask for confirmation
  const answer = await askQuestion('Are you sure you want to reset the database? (yes/no): ');
  
  if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
    console.log('🚫 Database reset cancelled.');
    process.exit(0);
  }
  
  try {
    // Connect to database
    console.log('📡 Connecting to MongoDB...');
    await db.connect();
    
    // Drop all collections
    console.log('🗑️  Dropping all collections...');
    await dropAllCollections();
    
    // Initialize models (recreate indexes)
    console.log('🔧 Reinitializing models and indexes...');
    await initializeModels();
    
    // Seed with fresh data
    console.log('🌱 Seeding with fresh data...');
    await seedDatabase();
    
    // Show database statistics
    console.log('📊 Database statistics after reset:');
    const stats = await getDatabaseStats();
    console.table(stats);
    
    console.log('✅ Database reset completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during database reset:', error);
    process.exit(1);
  } finally {
    // Disconnect from database
    await db.disconnect();
    process.exit(0);
  }
}

// Run the reset if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  resetDatabase();
}

export { resetDatabase };