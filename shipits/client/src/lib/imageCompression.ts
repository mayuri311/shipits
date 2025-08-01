/**
 * Image compression utility for handling large image uploads
 * Automatically compresses images to reduce file size while maintaining quality
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeKB?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

export interface CompressionResult {
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  width: number;
  height: number;
}

/**
 * Compresses an image file to reduce its size
 * @param file - The image file to compress
 * @param options - Compression options
 * @returns Promise with compression result
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const {
    maxWidth = 800,
    maxHeight = 800,
    quality = 0.8,
    maxSizeKB = 500, // Target max size in KB
    format = 'jpeg'
  } = options;

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = () => {
      try {
        // Calculate new dimensions while maintaining aspect ratio
        const { width: newWidth, height: newHeight } = calculateDimensions(
          img.width,
          img.height,
          maxWidth,
          maxHeight
        );

        // Set canvas dimensions
        canvas.width = newWidth;
        canvas.height = newHeight;

        // Draw and compress the image
        ctx.drawImage(img, 0, 0, newWidth, newHeight);

        // Start with the specified quality and reduce if needed
        let currentQuality = quality;
        let dataUrl = '';
        let attempts = 0;
        const maxAttempts = 10;

        const tryCompress = () => {
          const mimeType = format === 'png' ? 'image/png' : 
                          format === 'webp' ? 'image/webp' : 'image/jpeg';
          
          dataUrl = canvas.toDataURL(mimeType, currentQuality);
          const compressedSize = getDataUrlSize(dataUrl);
          
          // If size is acceptable or we've tried enough times, return result
          if (compressedSize <= maxSizeKB * 1024 || attempts >= maxAttempts || currentQuality <= 0.1) {
            const result: CompressionResult = {
              dataUrl,
              originalSize: file.size,
              compressedSize,
              compressionRatio: file.size / compressedSize,
              width: newWidth,
              height: newHeight
            };
            resolve(result);
            return;
          }

          // Reduce quality and try again
          currentQuality = Math.max(0.1, currentQuality - 0.1);
          attempts++;
          tryCompress();
        };

        tryCompress();
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    // Load the image
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        img.src = e.target.result as string;
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Calculate new dimensions while maintaining aspect ratio
 */
function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  const aspectRatio = originalWidth / originalHeight;

  let newWidth = originalWidth;
  let newHeight = originalHeight;

  // Scale down if larger than max dimensions
  if (newWidth > maxWidth) {
    newWidth = maxWidth;
    newHeight = newWidth / aspectRatio;
  }

  if (newHeight > maxHeight) {
    newHeight = maxHeight;
    newWidth = newHeight * aspectRatio;
  }

  return {
    width: Math.round(newWidth),
    height: Math.round(newHeight)
  };
}

/**
 * Get the size of a data URL in bytes
 */
function getDataUrlSize(dataUrl: string): number {
  // Remove data URL prefix to get just the base64 data
  const base64 = dataUrl.split(',')[1];
  if (!base64) return 0;
  
  // Calculate size: base64 is about 4/3 the size of the original data
  return Math.round((base64.length * 3) / 4);
}

/**
 * Format file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Compress image specifically for profile pictures
 * Uses optimized settings for profile photos
 */
export async function compressProfileImage(file: File): Promise<CompressionResult> {
  return compressImage(file, {
    maxWidth: 400,
    maxHeight: 400,
    quality: 0.85,
    maxSizeKB: 200, // Keep profile pics small
    format: 'jpeg'
  });
}