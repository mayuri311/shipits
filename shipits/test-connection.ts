#!/usr/bin/env tsx

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

console.log('🧪 MongoDB Connection Test');
console.log('==========================\n');

const ATLAS_URI = process.env.MONGODB_URI;
const LOCAL_URI = 'mongodb://localhost:27017/shipits-forum';

console.log('📋 Configuration:');
console.log(`Atlas URI: ${ATLAS_URI ? ATLAS_URI.replace(/\/\/[^@]+@/, '//***:***@') : 'Not configured'}`);
console.log(`Local URI: ${LOCAL_URI}`);
console.log('');

async function testConnection(uri: string, name: string): Promise<boolean> {
  console.log(`🔌 Testing ${name} Connection`);
  console.log('─'.repeat(30));
  
  try {
    console.log(`Connecting to ${name}...`);
    const startTime = Date.now();
    
    await mongoose.connect(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 5000,
    });
    
    const connectionTime = Date.now() - startTime;
    console.log(`✅ Connected to ${name} successfully in ${connectionTime}ms`);
    
    // Test basic operations
    console.log('Testing database operations...');
    
    // Create a simple test schema
    const TestSchema = new mongoose.Schema({
      message: String,
      timestamp: { type: Date, default: Date.now }
    });
    
    const TestModel = mongoose.model('ConnectionTest_' + Date.now(), TestSchema);
    
    // Insert test document
    const testDoc = new TestModel({ 
      message: `Test from ${name} at ${new Date().toISOString()}` 
    });
    
    await testDoc.save();
    console.log(`✅ Insert operation successful: ${testDoc._id}`);
    
    // Read test document
    const foundDoc = await TestModel.findById(testDoc._id);
    console.log(`✅ Read operation successful: ${foundDoc?.message}`);
    
    // Count documents (to test query operations)
    const count = await TestModel.countDocuments();
    console.log(`✅ Query operation successful: Found ${count} test documents`);
    
    // Clean up
    await TestModel.findByIdAndDelete(testDoc._id);
    console.log(`✅ Delete operation successful`);
    
    // Test database ping
    const pingStart = Date.now();
    await mongoose.connection.db.admin().ping();
    const pingTime = Date.now() - pingStart;
    console.log(`✅ Database ping: ${pingTime}ms`);
    
    await mongoose.disconnect();
    console.log(`✅ Disconnected from ${name}\n`);
    
    return true;
    
  } catch (error) {
    console.log(`❌ ${name} connection failed: ${error.message}`);
    
    // Additional error analysis
    if (error.message.includes('ECONNREFUSED')) {
      console.log(`   → Connection refused - server not reachable`);
    }
    if (error.message.includes('querySrv')) {
      console.log(`   → DNS resolution failed - hostname not found`);
    }
    if (error.message.includes('authentication')) {
      console.log(`   → Authentication failed - check username/password`);
    }
    
    try {
      await mongoose.disconnect();
    } catch (disconnectError) {
      // Ignore disconnect errors
    }
    
    console.log('');
    return false;
  }
}

async function runTests() {
  const results = {
    atlas: false,
    local: false
  };
  
  // Test Atlas connection if configured
  if (ATLAS_URI && ATLAS_URI.includes('mongodb.net')) {
    console.log('🌐 Testing MongoDB Atlas Connection\n');
    results.atlas = await testConnection(ATLAS_URI, 'MongoDB Atlas');
  } else {
    console.log('⚠️  No Atlas URI configured, skipping Atlas test\n');
  }
  
  // Test Local connection
  console.log('🏠 Testing Local MongoDB Connection\n');
  results.local = await testConnection(LOCAL_URI, 'Local MongoDB');
  
  // Summary
  console.log('📊 Test Results Summary');
  console.log('======================');
  
  if (ATLAS_URI) {
    console.log(`🌐 MongoDB Atlas: ${results.atlas ? '✅ Working' : '❌ Failed'}`);
  }
  console.log(`🏠 Local MongoDB: ${results.local ? '✅ Working' : '❌ Failed'}`);
  
  console.log('\n💡 Recommendations:');
  console.log('==================');
  
  if (ATLAS_URI && !results.atlas) {
    console.log('❌ Atlas Connection Issues:');
    console.log('   → Check MongoDB Atlas dashboard at https://cloud.mongodb.com/');
    console.log('   → Verify cluster is running (not paused)');
    console.log('   → Confirm network access settings');
    console.log('   → Validate connection string and credentials');
  }
  
  if (!results.local) {
    console.log('❌ Local MongoDB Issues:');
    console.log('   → Ensure MongoDB is installed and running');
    console.log('   → Check if MongoDB service is started');
    console.log('   → Verify port 27017 is available');
  }
  
  if (results.local) {
    console.log('✅ Local MongoDB working - your application can run with local data');
  }
  
  if (results.atlas) {
    console.log('✅ Atlas working - your application can use cloud data');
  }
  
  return results.atlas || results.local;
}

// Run the tests
runTests()
  .then((success) => {
    console.log(`\n🏁 Tests ${success ? 'completed successfully' : 'completed with issues'}!`);
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('💥 Test suite crashed:', error);
    process.exit(1);
  });