import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { Readable } from 'stream';

// Lazy initialization - check environment variables when needed, not at import time
let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    const AWS_REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';
    s3Client = new S3Client({ region: AWS_REGION });
  }
  return s3Client;
}

export interface S3UploadResult {
  filename: string;
  originalName: string;
  url: string;
  size: number;
  mimetype: string;
  bucket: string;
  key: string;
}

export class S3StorageService {
  private getBucket(): string {
    return process.env.AWS_S3_BUCKET || '';
  }

  isConfigured(): boolean {
    return !!this.getBucket();
  }

  /**
   * Upload file buffer to S3
   */
  async uploadFile(
    buffer: Buffer, 
    filename: string, 
    mimetype: string, 
    originalName: string
  ): Promise<S3UploadResult> {
    if (!this.isConfigured()) {
      throw new Error('S3 not configured');
    }

    const bucket = this.getBucket();
    const key = `uploads/${filename}`;
    
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: mimetype,
      Metadata: {
        originalName: originalName,
        uploadedAt: new Date().toISOString(),
      },
    });

    await getS3Client().send(command);

    return {
      filename,
      originalName,
      url: `/uploads/${filename}`, // Keep same URL structure
      size: buffer.length,
      mimetype,
      bucket,
      key,
    };
  }

  /**
   * Get file stream from S3
   */
  async getFileStream(filename: string): Promise<{
    stream: Readable;
    contentType: string;
    contentLength: number;
    lastModified: Date;
  }> {
    if (!this.isConfigured()) {
      throw new Error('S3 not configured');
    }

    const bucket = this.getBucket();
    const key = `uploads/${filename}`;

    // First get metadata
    const headCommand = new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const headResult = await getS3Client().send(headCommand);

    // Then get the object
    const getCommand = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const result = await getS3Client().send(getCommand);

    if (!result.Body) {
      throw new Error('File not found');
    }

    return {
      stream: result.Body as Readable,
      contentType: headResult.ContentType || 'application/octet-stream',
      contentLength: headResult.ContentLength || 0,
      lastModified: headResult.LastModified || new Date(),
    };
  }

  /**
   * Delete file from S3
   */
  async deleteFile(filename: string): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('S3 not configured');
    }

    const bucket = this.getBucket();
    const key = `uploads/${filename}`;
    
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await getS3Client().send(command);
  }

  /**
   * Generate signed URL for temporary access (for authenticated users)
   */
  async getSignedUrl(filename: string, expiresIn: number = 3600): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('S3 not configured');
    }

    const bucket = this.getBucket();
    const key = `uploads/${filename}`;
    
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    return await getSignedUrl(getS3Client(), command, { expiresIn });
  }

  /**
   * Check if file exists
   */
  async fileExists(filename: string): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      const bucket = this.getBucket();
      const key = `uploads/${filename}`;
      const command = new HeadObjectCommand({
        Bucket: bucket,
        Key: key,
      });
      
      await getS3Client().send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound') {
        return false;
      }
      throw error;
    }
  }
}

export const s3Storage = new S3StorageService();
