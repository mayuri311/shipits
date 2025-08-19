// Quick test to verify S3 connection works
import { config } from 'dotenv';
import { s3Storage } from './server/services/s3Storage.ts';

config();

async function testS3Connection() {
  console.log('🧪 Testing S3 connection...');
  
  if (!s3Storage.isConfigured()) {
    console.log('❌ S3 not configured - check environment variables');
    return;
  }
  
  console.log(`✅ S3 configured for bucket: ${process.env.AWS_S3_BUCKET}`);
  
  try {
    // Test upload
    console.log('📤 Testing file upload...');
    const testContent = Buffer.from('Hello ShipIts S3 Test!', 'utf8');
    const result = await s3Storage.uploadFile(
      testContent, 
      'test-file.txt', 
      'text/plain',
      'test-file.txt'
    );
    console.log('✅ Upload successful:', result.url);
    
    // Test existence check
    console.log('🔍 Testing file existence...');
    const exists = await s3Storage.fileExists('test-file.txt');
    console.log(`✅ File exists: ${exists}`);
    
    // Test streaming
    console.log('📥 Testing file retrieval...');
    const { stream, contentType } = await s3Storage.getFileStream('test-file.txt');
    console.log(`✅ Retrieved file, content type: ${contentType}`);
    
    // Cleanup
    console.log('🧹 Cleaning up test file...');
    await s3Storage.deleteFile('test-file.txt');
    console.log('✅ Test file deleted');
    
    console.log('🎉 All S3 tests passed!');
    
  } catch (error) {
    console.error('❌ S3 test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testS3Connection();
