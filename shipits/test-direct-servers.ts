#!/usr/bin/env tsx

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

console.log('🎯 Direct MongoDB Atlas Connection Test');
console.log('=====================================\n');

// Original SRV connection (fails)
const ORIGINAL_SRV_URI = process.env.MONGODB_URI;

// Direct connection using the servers Python discovered
const DIRECT_SERVERS_URI = "mongodb://shipits_user:gappir-vabzo3-cawBof@ac-hgjdpyu-shard-00-00.qwh6arp.mongodb.net:27017,ac-hgjdpyu-shard-00-01.qwh6arp.mongodb.net:27017,ac-hgjdpyu-shard-00-02.qwh6arp.mongodb.net:27017/shipits-forum?authSource=admin&replicaSet=atlas-9vqzuk-shard-0&retryWrites=true&w=majority";

// Direct connection using IP addresses (fallback)  
const DIRECT_IP_URI = "mongodb://shipits_user:gappir-vabzo3-cawBof@89.193.237.165:27017,89.193.237.185:27017,89.193.237.174:27017/shipits-forum?authSource=admin&replicaSet=atlas-9vqzuk-shard-0&retryWrites=true&w=majority";

async function testConnection(uri: string, name: string): Promise<boolean> {
  console.log(`🔌 Testing ${name}`);
  console.log('─'.repeat(50));
  console.log(`URI: ${uri.replace(/\/\/[^@]+@/, '//***:***@')}`);
  
  try {
    console.log(`Connecting to ${name}...`);
    const startTime = Date.now();
    
    await mongoose.connect(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000, // Give it more time
      socketTimeoutMS: 10000,
    });
    
    const connectionTime = Date.now() - startTime;
    console.log(`✅ Connected successfully in ${connectionTime}ms`);
    
    // Test basic operations
    const db = mongoose.connection.db;
    const pingStart = Date.now();
    await db.admin().ping();
    const pingTime = Date.now() - pingStart;
    console.log(`✅ Database ping: ${pingTime}ms`);
    
    // Test collection access
    const collections = await db.collections();
    console.log(`✅ Database access: Found ${collections.length} collections`);
    
    await mongoose.disconnect();
    console.log(`✅ Disconnected successfully\n`);
    
    return true;
    
  } catch (error: any) {
    console.log(`❌ ${name} failed: ${error.message}`);
    
    if (error.message.includes('Authentication failed')) {
      console.log(`   → Check username/password in connection string`);
    }
    if (error.message.includes('replicaSet')) {
      console.log(`   → May need correct replica set name`);
    }
    if (error.message.includes('ENOTFOUND')) {
      console.log(`   → DNS resolution still failing`);
    }
    
    try {
      await mongoose.disconnect();
    } catch (e) {
      // Ignore disconnect errors
    }
    
    console.log('');
    return false;
  }
}

async function runDirectTests() {
  console.log('🚀 Testing Direct MongoDB Atlas Connections...\n');
  
  const results = {
    original: false,
    directServers: false,
    directIPs: false
  };
  
  // Test 1: Original SRV connection (expected to fail)
  console.log('📋 Test 1: Original SRV Connection (Expected to Fail)');
  if (ORIGINAL_SRV_URI) {
    results.original = await testConnection(ORIGINAL_SRV_URI, 'Original SRV');
  }
  
  // Test 2: Direct server hostnames
  console.log('📋 Test 2: Direct Server Hostnames');
  results.directServers = await testConnection(DIRECT_SERVERS_URI, 'Direct Servers');
  
  // Test 3: Direct IP addresses (if hostnames fail)
  console.log('📋 Test 3: Direct IP Addresses');
  results.directIPs = await testConnection(DIRECT_IP_URI, 'Direct IPs');
  
  // Results summary
  console.log('📊 Test Results Summary');
  console.log('======================');
  console.log(`Original SRV:      ${results.original ? '✅' : '❌'}`);
  console.log(`Direct Servers:    ${results.directServers ? '✅' : '❌'}`);
  console.log(`Direct IPs:        ${results.directIPs ? '✅' : '❌'}`);
  
  // Determine best approach
  if (results.directServers) {
    console.log('\n🎉 SOLUTION FOUND: Use direct server hostnames!');
    console.log('Update your .env file with:');
    console.log(`MONGODB_URI="${DIRECT_SERVERS_URI}"`);
  } else if (results.directIPs) {
    console.log('\n🎉 SOLUTION FOUND: Use direct IP addresses!');
    console.log('Update your .env file with:');
    console.log(`MONGODB_URI="${DIRECT_IP_URI}"`);
  } else {
    console.log('\n❌ No direct connection method worked.');
    console.log('   → May need to update replica set name');
    console.log('   → Check MongoDB Atlas network access settings');
  }
  
  return results.directServers || results.directIPs;
}

// Run the tests
runDirectTests()
  .then((success) => {
    console.log(`\n🏁 Direct connection tests ${success ? 'SUCCEEDED' : 'FAILED'}!`);
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });