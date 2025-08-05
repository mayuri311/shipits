#!/usr/bin/env python3

import socket
import dns.resolver
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ConfigurationError
import sys

# MongoDB Atlas connection string
MONGODB_URI = "mongodb+srv://shipits_user:gappir-vabzo3-cawBof@shipitsv0.qwh6arp.mongodb.net/shipits-forum?retryWrites=true&w=majority&appName=ShipItsV0"

def debug_dns_resolution():
    print("🔍 Python DNS Resolution Debug")
    print("==============================\n")
    
    hostname = "shipitsv0.qwh6arp.mongodb.net"
    srv_record = f"_mongodb._tcp.{hostname}"
    
    # Test 1: Basic hostname resolution
    print("🔍 Test 1: Basic Hostname Resolution")
    print("===================================")
    try:
        ip = socket.gethostbyname(hostname)
        print(f"✅ Basic resolution successful: {hostname} -> {ip}")
    except socket.gaierror as e:
        print(f"❌ Basic resolution failed: {e}")
    
    # Test 2: SRV record resolution
    print("\n🔍 Test 2: SRV Record Resolution")
    print("================================")
    try:
        answers = dns.resolver.resolve(srv_record, 'SRV')
        print(f"✅ SRV resolution successful: Found {len(answers)} records")
        for i, answer in enumerate(answers):
            print(f"   {i+1}. {answer.target}:{answer.port} (priority: {answer.priority}, weight: {answer.weight})")
            
            # Try to resolve each SRV target
            try:
                target_ip = socket.gethostbyname(str(answer.target).rstrip('.'))
                print(f"      → Target IP: {target_ip}")
            except socket.gaierror as e:
                print(f"      → Target resolution failed: {e}")
                
    except Exception as e:
        print(f"❌ SRV resolution failed: {e}")
    
    # Test 3: Check what PyMongo actually connects to
    print("\n🔍 Test 3: PyMongo Connection Analysis")
    print("=====================================")
    
    try:
        # Create client but don't connect yet
        client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
        
        # Get the actual hosts PyMongo will connect to
        print("PyMongo parsed hosts:")
        for seed in client.address:
            print(f"   Seed: {seed}")
        
        # Try to connect and get server info
        print("\nConnecting...")
        info = client.server_info()
        print(f"✅ Connection successful!")
        print(f"   Server version: {info.get('version')}")
        
        # Get actual connection details
        print("\nConnection details:")
        primary = client.primary
        if primary:
            print(f"   Primary: {primary}")
        
        for server in client.topology_description.server_descriptions():
            print(f"   Server: {server.address} - {server.server_type}")
            
    except Exception as e:
        print(f"❌ PyMongo analysis failed: {e}")

def test_with_verbose_logging():
    print("\n🔍 Test 4: Verbose Connection Test")
    print("==================================")
    
    import logging
    
    # Enable MongoDB logging
    logging.basicConfig(level=logging.DEBUG)
    logger = logging.getLogger('pymongo')
    logger.setLevel(logging.DEBUG)
    
    try:
        client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
        info = client.server_info()
        print(f"✅ Verbose connection successful: {info.get('version')}")
    except Exception as e:
        print(f"❌ Verbose connection failed: {e}")

if __name__ == "__main__":
    print("🧪 Python MongoDB Connection Deep Debug")
    print("=======================================\n")
    
    # Run all debug tests
    debug_dns_resolution()
    
    # Note: Commenting out verbose test as it's very noisy
    # test_with_verbose_logging()
    
    print("\n💡 Key Findings:")
    print("================")
    print("If Python works but Node.js fails:")
    print("1. Python PyMongo may use cached DNS entries")
    print("2. Python may have different DNS resolution logic")
    print("3. SRV record resolution may differ between platforms")
    print("4. Network configuration may affect Node.js differently")