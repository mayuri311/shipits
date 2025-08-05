#!/usr/bin/env node

import { MongoClient } from 'mongodb';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';
import { promisify } from 'util';

dotenv.config();
const lookup = promisify(dns.lookup);

console.log('🧪 MongoDB Connection Test Suite');
console.log('================================\n');

// Test configurations
const ATLAS_URI = process.env.MONGODB_URI;
const LOCAL_URI = 'mongodb://localhost:27017/shipits-forum';

console.log('📋 Configuration:');
console.log(`Atlas URI: ${ATLAS_URI ? ATLAS_URI.replace(/\/\/[^@]+@/, '//***:***@') : 'Not set'}`);
console.log(`Local URI: ${LOCAL_URI}`);
console.log('');

// Test 1: DNS Resolution
async function testDNSResolution() {
  console.log('🔍 Test 1: DNS Resolution');
  console.log('-------------------------');
  
  if (!ATLAS_URI || !ATLAS_URI.includes('mongodb.net')) {
    console.log('⚠️  No Atlas URI found, skipping DNS test');
    return false;
  }

  try {
    const url = new URL(ATLAS_URI);
    const hostname = url.hostname;
    
    console.log(`Testing DNS resolution for: ${hostname}`);
    
    const addresses = await lookup(hostname);
    console.log(`✅ DNS Resolution successful: ${addresses.address}`);
    return true;
  } catch (error) {
    console.log(`❌ DNS Resolution failed: ${error.message}`);
    return false;
  }
}

// Test 2: MongoDB Native Driver Connection
async function testNativeConnection(uri, name) {
  console.log(`\n🔌 Test 2: ${name} - Native Driver Connection`);
  console.log('------------------------------------------------');
  
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 5000,
  });

  try {
    console.log(`Connecting to ${name}...`);
    await client.connect();
    
    console.log(`✅ Connected to ${name} successfully`);
    
    // Test database operations
    const db = client.db('shipits-forum');
    const collection = db.collection('connection-test');
    
    // Insert test document
    const testDoc = { 
      test: true, 
      timestamp: new Date(),
      message: `Connection test from ${name}`
    };
    
    const insertResult = await collection.insertOne(testDoc);
    console.log(`✅ Insert test successful: ${insertResult.insertedId}`);
    
    // Read test document
    const foundDoc = await collection.findOne({ _id: insertResult.insertedId });
    console.log(`✅ Read test successful: ${foundDoc.message}`);
    
    // Clean up
    await collection.deleteOne({ _id: insertResult.insertedId });
    console.log(`✅ Cleanup successful`);
    
    return true;
    
  } catch (error) {
    console.log(`❌ ${name} connection failed: ${error.message}`);
    return false;
  } finally {
    await client.close();
  }
}

// Test 3: Mongoose Connection
async function testMongooseConnection(uri, name) {
  console.log(`\n🔗 Test 3: ${name} - Mongoose Connection`);
  console.log('------------------------------------------');
  
  try {
    console.log(`Connecting to ${name} with Mongoose...`);
    
    await mongoose.connect(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 5000,
    });
    
    console.log(`✅ Mongoose connected to ${name} successfully`);
    
    // Test schema operations
    const TestSchema = new mongoose.Schema({
      message: String,
      timestamp: { type: Date, default: Date.now }
    });
    
    const TestModel = mongoose.model('ConnectionTest', TestSchema);
    
    // Create test document
    const testDoc = new TestModel({ 
      message: `Mongoose test from ${name}` 
    });
    
    await testDoc.save();
    console.log(`✅ Mongoose save successful: ${testDoc._id}`);
    
    // Find test document
    const foundDoc = await TestModel.findById(testDoc._id);
    console.log(`✅ Mongoose find successful: ${foundDoc.message}`);
    
    // Clean up
    await TestModel.findByIdAndDelete(testDoc._id);
    console.log(`✅ Mongoose cleanup successful`);
    
    await mongoose.disconnect();
    console.log(`✅ Mongoose disconnected from ${name}`);
    
    return true;
    
  } catch (error) {
    console.log(`❌ Mongoose ${name} connection failed: ${error.message}`);
    await mongoose.disconnect();
    return false;
  }
}

// Test 4: Connection Speed Test
async function testConnectionSpeed(uri, name) {
  console.log(`\n⚡ Test 4: ${name} - Connection Speed`);
  console.log('--------------------------------------');
  
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 10000,
  });

  try {
    const startTime = Date.now();
    await client.connect();
    const connectionTime = Date.now() - startTime;
    
    console.log(`✅ ${name} connection time: ${connectionTime}ms`);
    
    // Test query speed
    const db = client.db('shipits-forum');
    const queryStart = Date.now();
    await db.admin().ping();
    const queryTime = Date.now() - queryStart;
    
    console.log(`✅ ${name} ping time: ${queryTime}ms`);
    
    return { connectionTime, queryTime };
    
  } catch (error) {
    console.log(`❌ ${name} speed test failed: ${error.message}`);
    return null;
  } finally {
    await client.close();
  }
}

// Run all tests
async function runAllTests() {
  try {
    console.log('🚀 Starting MongoDB Connection Tests...\n');
    
    // Test DNS resolution first
    const dnsWorking = await testDNSResolution();
    
    const results = {
      atlas: { dns: dnsWorking, native: false, mongoose: false, speed: null },
      local: { native: false, mongoose: false, speed: null }
    };
    
    // Test Atlas connection if DNS works
    if (ATLAS_URI && dnsWorking) {
      results.atlas.native = await testNativeConnection(ATLAS_URI, 'Atlas');
      results.atlas.mongoose = await testMongooseConnection(ATLAS_URI, 'Atlas');
      results.atlas.speed = await testConnectionSpeed(ATLAS_URI, 'Atlas');
    }
    
    // Test Local connection
    results.local.native = await testNativeConnection(LOCAL_URI, 'Local');
    results.local.mongoose = await testMongooseConnection(LOCAL_URI, 'Local');
    results.local.speed = await testConnectionSpeed(LOCAL_URI, 'Local');
    
    // Summary
    console.log('\n📊 Test Results Summary');
    console.log('=======================');
    
    if (ATLAS_URI) {
      console.log('\n🌐 MongoDB Atlas:');
      console.log(`   DNS Resolution: ${results.atlas.dns ? '✅' : '❌'}`);
      console.log(`   Native Driver:  ${results.atlas.native ? '✅' : '❌'}`);
      console.log(`   Mongoose:       ${results.atlas.mongoose ? '✅' : '❌'}`);
      if (results.atlas.speed) {
        console.log(`   Connection Speed: ${results.atlas.speed.connectionTime}ms`);
      }
    }
    
    console.log('\n🏠 Local MongoDB:');
    console.log(`   Native Driver:  ${results.local.native ? '✅' : '❌'}`);
    console.log(`   Mongoose:       ${results.local.mongoose ? '✅' : '❌'}`);
    if (results.local.speed) {
      console.log(`   Connection Speed: ${results.local.speed.connectionTime}ms`);
    }
    
    // Recommendations
    console.log('\n💡 Recommendations:');
    console.log('==================');
    
    if (ATLAS_URI && !results.atlas.dns) {
      console.log('❌ Atlas cluster hostname is not resolving in DNS');
      console.log('   → Check your MongoDB Atlas dashboard');
      console.log('   → Verify cluster is running (not paused)');
      console.log('   → Get a fresh connection string');
    }
    
    if (results.local.native && results.local.mongoose) {
      console.log('✅ Local MongoDB is working perfectly');
      console.log('   → Your application can run with local data');
    }
    
    if (ATLAS_URI && results.atlas.native && results.atlas.mongoose) {
      console.log('✅ Atlas is working perfectly');
      console.log('   → Your application should work with cloud data');
    }
    
  } catch (error) {
    console.error('💥 Test suite failed:', error);
  }
}

// Run the tests
runAllTests().then(() => {
  console.log('\n🏁 Tests completed!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test suite crashed:', error);
  process.exit(1);
});