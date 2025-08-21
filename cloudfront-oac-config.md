# CloudFront with Origin Access Control (OAC) Configuration

## Overview
CloudFront OAC allows CloudFront to access private S3 buckets while blocking direct public access.

## S3 Bucket Policy (Private with OAC)
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontServicePrincipal",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-bucket-name/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::ACCOUNT-ID:distribution/DISTRIBUTION-ID"
        }
      }
    }
  ]
}
```

## CloudFront Distribution Configuration

### Origin Settings
- **Origin Domain**: your-bucket-name.s3.us-east-1.amazonaws.com
- **Origin Access**: Origin Access Control (OAC)
- **Origin Path**: /uploads (to serve only files from uploads folder)

### OAC Settings
- **Name**: shipits-s3-oac
- **Origin Type**: S3
- **Signing Behavior**: Always sign requests

### Cache Behaviors
```yaml
Default Behavior:
  Path Pattern: "*"
  Origin: S3 Origin
  Viewer Protocol Policy: Redirect HTTP to HTTPS
  Allowed HTTP Methods: GET, HEAD, OPTIONS
  Cache Policy: CachingOptimized
  Compress Objects: Yes
  
Custom Behavior (for API):
  Path Pattern: "/api/*"
  Origin: Application Load Balancer
  Viewer Protocol Policy: Redirect HTTP to HTTPS
  Cache Policy: CachingDisabled
```

## Environment Variables Update
```bash
# Add to your .env
CLOUDFRONT_DOMAIN=https://d1234567890.cloudfront.net
# OR custom domain
CLOUDFRONT_DOMAIN=https://cdn.yourdomain.com
```

## Code Modification for CloudFront URLs
```typescript
// In fileUpload.ts
export const getFileUrl = (filename: string): string => {
  const cloudfrontDomain = process.env.CLOUDFRONT_DOMAIN;
  if (cloudfrontDomain) {
    return `${cloudfrontDomain}/uploads/${filename}`;
  }
  return `/uploads/${filename}`; // Fallback to application proxy
};
```

## Benefits
- ✅ Global CDN performance
- ✅ S3 bucket completely private
- ✅ Reduced server load (no proxying)
- ✅ Built-in DDoS protection
- ✅ Custom domain support
- ✅ Automatic HTTPS
