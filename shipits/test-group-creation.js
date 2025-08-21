// Test script to verify group creation
import fetch from 'node-fetch';

// Test group creation without authentication first
async function testGroupCreation() {
  try {
    console.log('Testing group creation endpoint...');

    const testData = {
      type: 'group',
      name: 'Test Group',
      description: 'Test description',
      participants: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012']
    };

    const response = await fetch('http://127.0.0.1:3555/api/conversations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();
    console.log('Response status:', response.status);
    console.log('Response:', result);

  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testGroupCreation();
