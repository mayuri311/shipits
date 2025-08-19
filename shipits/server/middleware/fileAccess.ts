import type { Request, Response, NextFunction } from 'express';
import { s3Storage } from '../services/s3Storage';
import { mongoStorage } from '../services/mongoStorage';

export interface FileAccessRule {
  pattern: RegExp;
  requireAuth: boolean;
  checkOwnership?: boolean;
  allowedRoles?: string[];
}

// File access rules configuration
const ACCESS_RULES: FileAccessRule[] = [
  // Profile images - public
  {
    pattern: /^profile_/,
    requireAuth: false,
  },
  // Project images - public  
  {
    pattern: /^project_/,
    requireAuth: false,
  },
  // Document uploads - require auth
  {
    pattern: /\.(pdf|doc|docx|xls|xlsx)$/i,
    requireAuth: true,
    checkOwnership: true,
  },
  // Private user uploads - require ownership
  {
    pattern: /^private_/,
    requireAuth: true,
    checkOwnership: true,
  },
  // Admin only files
  {
    pattern: /^admin_/,
    requireAuth: true,
    allowedRoles: ['admin'],
  },
];

/**
 * Middleware to control file access based on rules
 */
export function fileAccessControl(req: Request, res: Response, next: NextFunction) {
  const filename = req.params.filename;
  const user = req.currentUser;

  // Find applicable rule
  const rule = ACCESS_RULES.find(rule => rule.pattern.test(filename));
  
  if (!rule) {
    // Default: require auth for unmatched files
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    return next();
  }

  // Check authentication requirement
  if (rule.requireAuth && !user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Check role requirements
  if (rule.allowedRoles && !rule.allowedRoles.includes(user?.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  // Check ownership (this would need to be implemented based on your file naming convention)
  if (rule.checkOwnership && user) {
    // Example: extract user ID from filename or check database
    // This is a simplified example - implement based on your needs
    if (!checkFileOwnership(filename, user.id)) {
      return res.status(403).json({ error: 'File access denied' });
    }
  }

  next();
}

/**
 * Check if user owns the file (implement based on your naming convention)
 */
function checkFileOwnership(filename: string, userId: string): boolean {
  // Example implementations:
  
  // Option 1: Filename contains user ID
  if (filename.includes(`_${userId}_`)) {
    return true;
  }
  
  // Option 2: Check database for file ownership
  // This would require storing file ownership in your database
  
  // Option 3: Extract from metadata
  // You could store ownership info in S3 object metadata
  
  return false; // Default deny
}

/**
 * Generate appropriate file URL based on access level
 */
export function getSecureFileUrl(filename: string, user?: any): string {
  const rule = ACCESS_RULES.find(rule => rule.pattern.test(filename));
  
  // Public files can use CloudFront/CDN
  if (!rule || !rule.requireAuth) {
    const cloudfrontDomain = process.env.CLOUDFRONT_DOMAIN;
    if (cloudfrontDomain) {
      return `${cloudfrontDomain}/uploads/${filename}`;
    }
  }
  
  // Private files must go through application
  return `/uploads/${filename}`;
}

/**
 * Generate signed URL for temporary access
 */
export async function generateSignedUrl(filename: string, expiresIn: number = 3600): Promise<string> {
  if (s3Storage.isConfigured()) {
    return await s3Storage.getSignedUrl(filename, expiresIn);
  }
  
  // Fallback: generate JWT token for local files
  const jwt = require('jsonwebtoken');
  const token = jwt.sign(
    { filename, exp: Math.floor(Date.now() / 1000) + expiresIn },
    process.env.SESSION_SECRET
  );
  
  return `/uploads/${filename}?token=${token}`;
}
