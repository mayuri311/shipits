#!/usr/bin/env tsx

import { MongoClient } from 'mongodb';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

console.log('🔧 MongoDB Atlas - Python Parameters Test');
console.log('==========================================\n');

// Try the exact same connection approach as Python
const MONGODB_URI = "mongodb+srv://shipits_user:gappir-vabzo3-cawBof@shipitsv0.qwh6arp.mongodb.net/shipits-forum?retryWrites=true&w=majority&appName=ShipItsV0";

async function testWithNativeDriver() {
  console.log('🔌 Test 1: Native Driver (Same as Python PyMongo)');
  console.log('================================================');
  
  // Use the same options that work in Python
  const client = new MongoClient(MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 10000,
    // Try additional options that might help
    maxPoolSize: 10,
    minPoolSize: 0,
    maxIdleTimeMS: 30000,
    waitQueueTimeoutMS: 10000,
    // Force IPv4 (like Python might use)
    family: 4,
  });

  try {
    console.log('Connecting with native driver...');
    await client.connect();
    
    // Get server info (same as Python)
    const admin = client.db().admin();
    const serverStatus = await admin.serverStatus();
    console.log(`✅ Native driver success! Server version: ${serverStatus.version}`);
    
    // Test actual database access
    const db = client.db('shipits-forum');
    const collections = await db.collections();
    console.log(`✅ Database access: ${collections.length} collections`);
    
    return true;
    
  } catch (error: any) {
    console.log(`❌ Native driver failed: ${error.message}`);
    console.log(`   Error code: ${error.code}`);
    
    return false;
  } finally {
    await client.close();
  }
}

async function testWithMongoose() {
  console.log('\n🔌 Test 2: Mongoose (Your Application Uses)');
  console.log('============================================');
  
  try {
    console.log('Connecting with Mongoose...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 10000,
      maxPoolSize: 10,
      // Force IPv4
      family: 4,
      // Additional Mongoose-specific options
      bufferMaxEntries: 0,
      autoIndex: false,
    });
    
    console.log(`✅ Mongoose success!`);
    
    // Test ping
    await mongoose.connection.db.admin().ping();
    console.log(`✅ Mongoose ping successful`);
    
    await mongoose.disconnect();
    return true;
    
  } catch (error: any) {
    console.log(`❌ Mongoose failed: ${error.message}`);
    
    if (error.message.includes('querySrv')) {
      console.log('   → SRV resolution still failing in Mongoose');
    }
    if (error.message.includes('ECONNREFUSED')) {
      console.log('   → DNS resolution issue');
    }
    
    try {
      await mongoose.disconnect();
    } catch (e) {}
    
    return false;
  }
}

async function testNetworkTroubleshooting() {
  console.log('\n🔍 Test 3: Network Troubleshooting');
  console.log('==================================');
  
  // Test if we can resolve the SRV records manually
  try {
    const dns = require('dns').promises;
    const srvRecord = '_mongodb._tcp.shipitsv0.qwh6arp.mongodb.net';
    
    console.log(`Attempting manual SRV lookup: ${srvRecord}`);
    const records = await dns.resolveSrv(srvRecord);
    
    console.log(`✅ Manual SRV lookup successful! Found ${records.length} records:`);
    records.forEach((record, i) => {
      console.log(`   ${i+1}. ${record.name}:${record.port} (priority: ${record.priority})`);
    });
    
    return true;
    
  } catch (error: any) {
    console.log(`❌ Manual SRV lookup failed: ${error.message}`);
    console.log('   → This confirms Node.js DNS SRV resolution is broken');
    return false;
  }
}

async function runParameterTests() {
  console.log('🚀 Testing with Python-style parameters...\n');
  
  const results = {
    native: false,
    mongoose: false,
    dns: false
  };
  
  results.native = await testWithNativeDriver();
  results.mongoose = await testWithMongoose();
  results.dns = await testNetworkTroubleshooting();
  
  console.log('\n📊 Parameter Test Results');
  console.log('=========================');
  console.log(`Native Driver: ${results.native ? '✅' : '❌'}`);
  console.log(`Mongoose:      ${results.mongoose ? '✅' : '❌'}`);
  console.log(`DNS SRV:       ${results.dns ? '✅' : '❌'}`);
  
  console.log('\n💡 Analysis:');
  console.log('============');
  
  if (results.native && results.mongoose) {
    console.log('🎉 SUCCESS: Both native and Mongoose work!');
    console.log('   → The issue was likely connection parameters');
    console.log('   → Your application should now work with Atlas');
  } else if (results.native && !results.mongoose) {
    console.log('⚠️  Native works but Mongoose fails');
    console.log('   → Issue is specific to Mongoose configuration');
    console.log('   → Try updating Mongoose connection options');
  } else if (!results.dns) {
    console.log('❌ DNS SRV resolution is fundamentally broken in Node.js');
    console.log('   → This is a Node.js environment issue');
    console.log('   → Consider using direct connection strings');
  } else {
    console.log('❌ Network/authentication issues persist');
    console.log('   → Check MongoDB Atlas network access settings');
    console.log('   → Verify IP whitelist includes your current IP');
  }
  
  return results.native || results.mongoose;
}

// Run the tests
runParameterTests()
  .then((success) => {
    console.log(`\n🏁 Parameter tests ${success ? 'SUCCEEDED' : 'FAILED'}!`);
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('💥 Tests crashed:', error);
    process.exit(1);
  });