import { useState, useRef } from "react";
import { Upload, X, File as FileIcon, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface UploadedFile {
  type: string;
  filename: string;
  originalName: string;
  data?: string; // For images (Base64)
  url?: string;  // For files (URL path)
  size: number;
  mimetype: string;
  category: string;
  icon: string;
}

interface FileUploadProps {
  onFilesUploaded: (files: UploadedFile[]) => void;
  maxFiles?: number;
  existingFiles?: UploadedFile[];
  acceptedTypes?: string[];
  label?: string;
  description?: string;
}

const defaultAcceptedTypes = [
  // Documents
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.rtf', '.md',
  // Archives
  '.zip', '.rar', '.7z', '.tar', '.gz',
  // Data formats
  '.json', '.csv', '.xml'
];

export function FileUpload({ 
  onFilesUploaded, 
  maxFiles = 10, 
  existingFiles = [], 
  acceptedTypes = defaultAcceptedTypes,
  label = "File Attachments",
  description = "Upload documents, archives, and other supporting files"
}: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>(existingFiles);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    // Check if adding these files would exceed the limit
    if (files.length + selectedFiles.length > maxFiles) {
      toast({
        title: "Too many files",
        description: `You can only upload up to ${maxFiles} files.`,
        variant: "destructive",
      });
      return;
    }

    // Validate file types and sizes
    const validFiles: File[] = [];
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      
      // Check file type
      const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
      if (!acceptedTypes.includes(fileExtension)) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not an allowed file type.`,
          variant: "destructive",
        });
        continue;
      }
      
      // Check file size (50MB limit)
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} is larger than 50MB. Please select a smaller file.`,
          variant: "destructive",
        });
        continue;
      }
      
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    setUploading(true);
    try {
      const formData = new FormData();
      validFiles.forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch('/api/upload/files', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        const newFiles = [...files, ...result.data.files];
        setFiles(newFiles);
        onFilesUploaded(newFiles);
        
        toast({
          title: "Files uploaded successfully",
          description: `${result.data.files.length} file(s) uploaded successfully.`,
        });
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload files. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    onFilesUploaded(newFiles);
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

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimetype: string): string => {
    if (mimetype.includes('pdf')) return '📄';
    if (mimetype.includes('word') || mimetype.includes('document')) return '📝';
    if (mimetype.includes('excel') || mimetype.includes('spreadsheet')) return '📊';
    if (mimetype.includes('powerpoint') || mimetype.includes('presentation')) return '📋';
    if (mimetype.includes('zip') || mimetype.includes('rar') || mimetype.includes('7z')) return '🗜️';
    if (mimetype.includes('text')) return '📋';
    return '📎';
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">{label}</h3>
        <p className="text-sm text-gray-600 mb-4">{description}</p>
      </div>

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
          accept={acceptedTypes.join(',')}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />
        
        <div className="flex flex-col items-center gap-2">
          <Upload className="w-8 h-8 text-gray-400" />
          <div>
            <p className="text-sm font-medium text-gray-900">
              Drop files here or{" "}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-maroon hover:text-maroon/80"
              >
                browse
              </button>
            </p>
            <p className="text-xs text-gray-500">
              PDF, DOC, ZIP and other files up to 50MB each (max {maxFiles} files)
            </p>
          </div>
        </div>
      </div>

      {/* Upload Button */}
      <Button
        type="button"
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading || files.length >= maxFiles}
        className="w-full"
      >
        {uploading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-maroon mr-2"></div>
            Uploading...
          </>
        ) : (
          <>
            <FileIcon className="w-4 h-4 mr-2" />
            Add Files ({files.length}/{maxFiles})
          </>
        )}
      </Button>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900">Uploaded Files</h4>
          <div className="space-y-2">
            {files.map((file, index) => (
              <div key={file.filename} className="flex items-center justify-between bg-gray-50 rounded-lg p-3 group">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getFileIcon(file.mimetype)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.originalName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.size)} • {file.mimetype}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {file.url && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => window.open(file.url, '_blank')}
                      title="Download file"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeFile(index)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    title="Remove file"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}