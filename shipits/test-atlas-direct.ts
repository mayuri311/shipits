#!/usr/bin/env tsx

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

console.log('🧪 Direct MongoDB Atlas Test (Node.js vs Python)');
console.log('================================================\n');

// Use the exact same connection string as the working Python script
const ATLAS_URI = "mongodb+srv://shipits_user:gappir-vabzo3-cawBof@shipitsv0.qwh6arp.mongodb.net/shipits-forum?retryWrites=true&w=majority&appName=ShipItsV0";

// Also test the one from .env
const ATLAS_URI_FROM_ENV = process.env.MONGODB_URI;

console.log('🔍 Testing MongoDB Atlas Connection (Direct Native Driver)');
console.log('=========================================================');
console.log(`Direct URI: ${ATLAS_URI.replace(/\/\/[^@]+@/, '//***:***@')}`);
console.log(`ENV URI:    ${ATLAS_URI_FROM_ENV?.replace(/\/\/[^@]+@/, '//***:***@') || 'Not set'}`);
console.log(`Match:      ${ATLAS_URI === ATLAS_URI_FROM_ENV ? '✅' : '❌'}`);
console.log('');

async function testDirectConnection(uri: string, name: string): Promise<boolean> {
  console.log(`🔌 Testing ${name}`);
  console.log('─'.repeat(40));
  
  // Use MongoDB native client (same as Python PyMongo)
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
  });

  try {
    console.log(`Connecting to ${name}...`);
    const startTime = Date.now();
    
    await client.connect();
    const connectionTime = Date.now() - startTime;
    
    console.log(`✅ Connected successfully in ${connectionTime}ms`);
    
    // Test server info (same as Python client.server_info())
    const admin = client.db().admin();
    const serverStatus = await admin.serverStatus();
    console.log(`✅ Server version: ${serverStatus.version}`);
    
    // Test basic database operations
    const db = client.db('shipits-forum');
    const collection = db.collection('connection-test');
    
    // Insert test
    const insertResult = await collection.insertOne({
      test: true,
      timestamp: new Date(),
      message: `Direct connection test from ${name}`
    });
    console.log(`✅ Insert test: ${insertResult.insertedId}`);
    
    // Read test
    const document = await collection.findOne({ _id: insertResult.insertedId });
    console.log(`✅ Read test: ${document?.message}`);
    
    // Cleanup
    await collection.deleteOne({ _id: insertResult.insertedId });
    console.log(`✅ Cleanup successful`);
    
    return true;
    
  } catch (error: any) {
    console.log(`❌ ${name} failed: ${error.message}`);
    
    // Detailed error analysis
    console.log(`   Error code: ${error.code || 'N/A'}`);
    console.log(`   Error name: ${error.name || 'N/A'}`);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log(`   → Connection refused - check network/firewall`);
    }
    if (error.message.includes('querySrv')) {
      console.log(`   → DNS SRV lookup failed`);
    }
    if (error.message.includes('ENOTFOUND')) {
      console.log(`   → DNS hostname resolution failed`);
    }
    if (error.message.includes('authentication')) {
      console.log(`   → Authentication failed`);
    }
    
    return false;
    
  } finally {
    await client.close();
    console.log(`✅ Connection closed\n`);
  }
}

async function runDirectTests() {
  console.log('🚀 Starting Direct MongoDB Tests...\n');
  
  // Test 1: Direct hardcoded connection string (same as Python)
  const directResult = await testDirectConnection(ATLAS_URI, 'Direct Atlas Connection');
  
  // Test 2: Connection string from environment
  let envResult = false;
  if (ATLAS_URI_FROM_ENV) {
    envResult = await testDirectConnection(ATLAS_URI_FROM_ENV, 'Environment Atlas Connection');
  }
  
  // Summary
  console.log('📊 Direct Test Results');
  console.log('=====================');
  console.log(`Direct Connection (hardcoded): ${directResult ? '✅' : '❌'}`);
  console.log(`Environment Connection (.env): ${envResult ? '✅' : '❌'}`);
  
  if (directResult !== envResult) {
    console.log('\n⚠️  Different results suggest environment loading issue');
  }
  
  return directResult || envResult;
}

// Run the tests
runDirectTests()
  .then((success) => {
    console.log(`\n🏁 Direct tests ${success ? 'PASSED' : 'FAILED'}!`);
    if (success) {
      console.log('💡 Atlas connection works with native driver - issue is likely with Mongoose');
    }
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('💥 Test crashed:', error);
    process.exit(1);
  });