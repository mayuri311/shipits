#!/usr/bin/env tsx

import dns from 'dns';
import { promisify } from 'util';

const resolveSrv = promisify(dns.resolveSrv);
const lookup = promisify(dns.lookup);
const resolve4 = promisify(dns.resolve4);

console.log('🔍 DNS Resolution Debug (Node.js vs Python)');
console.log('==========================================\n');

const ATLAS_HOSTNAME = 'shipitsv0.qwh6arp.mongodb.net';
const SRV_RECORD = `_mongodb._tcp.${ATLAS_HOSTNAME}`;

async function debugDNS() {
  console.log(`Testing DNS resolution for: ${ATLAS_HOSTNAME}`);
  console.log(`SRV record: ${SRV_RECORD}\n`);

  // Test 1: Basic hostname lookup
  console.log('🔍 Test 1: Basic Hostname Lookup');
  console.log('================================');
  try {
    const result = await lookup(ATLAS_HOSTNAME);
    console.log(`✅ Basic lookup successful: ${result.address} (${result.family})`);
  } catch (error: any) {
    console.log(`❌ Basic lookup failed: ${error.message}`);
  }

  // Test 2: IPv4 resolution
  console.log('\n🔍 Test 2: IPv4 Resolution');
  console.log('==========================');
  try {
    const addresses = await resolve4(ATLAS_HOSTNAME);
    console.log(`✅ IPv4 resolution successful: ${addresses.join(', ')}`);
  } catch (error: any) {
    console.log(`❌ IPv4 resolution failed: ${error.message}`);
  }

  // Test 3: SRV record lookup (what MongoDB Atlas uses)
  console.log('\n🔍 Test 3: SRV Record Lookup');
  console.log('=============================');
  try {
    const srvRecords = await resolveSrv(SRV_RECORD);
    console.log(`✅ SRV lookup successful: Found ${srvRecords.length} records`);
    srvRecords.forEach((record, index) => {
      console.log(`   ${index + 1}. ${record.name}:${record.port} (priority: ${record.priority}, weight: ${record.weight})`);
    });
  } catch (error: any) {
    console.log(`❌ SRV lookup failed: ${error.message}`);
    console.log(`   This is the root cause of the MongoDB connection failure!`);
  }

  // Test 4: Alternative DNS servers
  console.log('\n🔍 Test 4: Alternative DNS Servers');
  console.log('==================================');
  
  const alternativeDNS = ['8.8.8.8', '1.1.1.1', '208.67.222.222'];
  
  for (const dnsServer of alternativeDNS) {
    try {
      // Set DNS server temporarily
      dns.setServers([dnsServer]);
      const result = await lookup(ATLAS_HOSTNAME);
      console.log(`✅ ${dnsServer}: ${result.address}`);
    } catch (error: any) {
      console.log(`❌ ${dnsServer}: ${error.message}`);
    }
  }
  
  // Reset to system DNS
  dns.setServers([]);
  
  // Test 5: Manual SRV record construction
  console.log('\n🔍 Test 5: Manual SRV Resolution Workaround');
  console.log('===========================================');
  
  // Try to resolve the SRV record manually and construct direct connection strings
  try {
    // Some Atlas clusters use these common SRV patterns
    const commonSrvTargets = [
      'cluster0-shard-00-00.qwh6arp.mongodb.net',
      'cluster0-shard-00-01.qwh6arp.mongodb.net', 
      'cluster0-shard-00-02.qwh6arp.mongodb.net',
      'shipitsv0-shard-00-00.qwh6arp.mongodb.net',
      'shipitsv0-shard-00-01.qwh6arp.mongodb.net',
      'shipitsv0-shard-00-02.qwh6arp.mongodb.net'
    ];
    
    console.log('Testing common Atlas shard patterns...');
    for (const target of commonSrvTargets) {
      try {
        const result = await lookup(target);
        console.log(`✅ Found shard: ${target} -> ${result.address}`);
        
        // Create direct connection string (without SRV)
        const directUri = `mongodb://${target}:27017/shipits-forum?authSource=admin&replicaSet=atlas-abc123-shard-0&retryWrites=true&w=majority`;
        console.log(`   Direct URI: mongodb://${target}:27017/...`);
        
      } catch (error) {
        console.log(`❌ Shard not found: ${target}`);
      }
    }
    
  } catch (error: any) {
    console.log(`❌ Manual resolution failed: ${error.message}`);
  }
}

// Compare with what Python would see
console.log('📋 Comparison:');
console.log('Python PyMongo: ✅ Works perfectly');
console.log('Node.js Native: ❌ DNS SRV resolution fails');
console.log('');

debugDNS()
  .then(() => {
    console.log('\n💡 Recommendations:');
    console.log('===================');
    console.log('1. If SRV lookup fails, try using direct connection strings');
    console.log('2. Consider using a different DNS server');
    console.log('3. Check if this is a Node.js version-specific issue');
    console.log('4. Contact MongoDB Atlas support about Node.js SRV resolution');
  })
  .catch((error) => {
    console.error('Debug failed:', error);
  });