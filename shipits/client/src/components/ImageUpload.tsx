import { useState, useRef } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { compressImage, formatFileSize } from "@/lib/imageCompression";

interface UploadedImage {
  filename: string;
  originalName: string;
  data: string; // Base64 data URL
  size: number;
  mimetype: string;
}

interface ImageUploadProps {
  onImagesUploaded: (images: UploadedImage[]) => void;
  maxImages?: number;
  existingImages?: UploadedImage[];
}

export function ImageUpload({ onImagesUploaded, maxImages = 10, existingImages = [] }: ImageUploadProps) {
  const [images, setImages] = useState<UploadedImage[]>(existingImages);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    // Check if adding these files would exceed the limit
    if (images.length + files.length > maxImages) {
      toast({
        title: "Too many images",
        description: `You can only upload up to ${maxImages} images.`,
        variant: "destructive",
      });
      return;
    }

    // Validate file types and sizes
    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not an image file.`,
          variant: "destructive",
        });
        continue;
      }
      // Allow larger files since we'll compress them
      if (file.size > 50 * 1024 * 1024) { // 50MB limit for original file
        toast({
          title: "File too large",
          description: `${file.name} is larger than 50MB. Please select a smaller image.`,
          variant: "destructive",
        });
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    setUploading(true);
    try {
      // Show compression progress
      toast({
        title: "Processing images...",
        description: `Compressing ${validFiles.length} image(s) for optimal upload.`,
      });

      // Compress each image
      const compressedImages: UploadedImage[] = [];
      let totalOriginalSize = 0;
      let totalCompressedSize = 0;

      for (const file of validFiles) {
        try {
          const compressionResult = await compressImage(file, {
            maxWidth: 1200,
            maxHeight: 1200,
            quality: 0.8,
            maxSizeKB: 800, // 800KB max for project images
            format: 'jpeg'
          });

          totalOriginalSize += compressionResult.originalSize;
          totalCompressedSize += compressionResult.compressedSize;

          compressedImages.push({
            filename: file.name,
            originalName: file.name,
            data: compressionResult.dataUrl,
            size: compressionResult.compressedSize,
            mimetype: 'image/jpeg'
          });
        } catch (compressionError) {
          console.error('Failed to compress image:', file.name, compressionError);
          toast({
            title: "Compression failed",
            description: `Failed to process ${file.name}. Skipping this image.`,
            variant: "destructive",
          });
        }
      }

      if (compressedImages.length > 0) {
        // Now upload the compressed images to the server
        toast({
          title: "Uploading images...",
          description: `Uploading ${compressedImages.length} compressed image(s) to server.`,
        });

        try {
          const response = await uploadApi.uploadProcessedImages(compressedImages);
          
          if (response.success) {
            const newImages = [...images, ...response.data.files];
            setImages(newImages);
            onImagesUploaded(newImages);
            
            const compressionRatio = totalOriginalSize / totalCompressedSize;
            toast({
              title: "Images uploaded successfully",
              description: `${response.data.files.length} image(s) uploaded (compressed from ${formatFileSize(totalOriginalSize)} to ${formatFileSize(totalCompressedSize)}).`,
            });
          } else {
            throw new Error(response.error || 'Upload failed');
          }
        } catch (uploadError) {
          console.error('Server upload error:', uploadError);
          toast({
            title: "Upload failed",
            description: "Images were processed but failed to upload to server. Please try again.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Processing failed",
        description: "Failed to process images. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    onImagesUploaded(newImages);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragOver
            ? 'border-maroon bg-maroon/10'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />
        
        <div className="flex flex-col items-center gap-2">
          <Upload className="w-8 h-8 text-gray-400" />
          <div>
            <p className="text-sm font-medium text-gray-900">
              Drop images here or{" "}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-maroon hover:text-maroon/80"
              >
                browse
              </button>
            </p>
            <p className="text-xs text-gray-500">
              PNG, JPG, GIF up to 20MB each, automatically compressed (max {maxImages} images)
            </p>
          </div>
        </div>
      </div>

      {/* Upload Button */}
      <Button
        type="button"
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading || images.length >= maxImages}
        className="w-full"
      >
        {uploading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-maroon mr-2"></div>
            Uploading...
          </>
        ) : (
          <>
            <ImageIcon className="w-4 h-4 mr-2" />
            Add Images ({images.length}/{maxImages})
          </>
        )}
      </Button>

      {/* Image Preview Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <div key={image.filename} className="relative group">
              <img
                src={image.data}
                alt={image.originalName}
                className="w-full h-24 object-cover rounded-lg border"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
                {image.originalName}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}