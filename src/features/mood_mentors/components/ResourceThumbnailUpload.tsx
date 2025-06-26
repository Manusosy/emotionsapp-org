import { useState, useRef } from 'react';
import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/authContext';
import { toast } from 'sonner';
import { resourceService } from '@/services/resource/resource.service';

interface ResourceThumbnailUploadProps {
  onThumbnailChange: (url: string) => void;
  existingThumbnail?: string;
}

const ALLOWED_THUMBNAIL_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_THUMBNAIL_SIZE = 5 * 1024 * 1024; // 5MB

export function ResourceThumbnailUpload({ onThumbnailChange, existingThumbnail }: ResourceThumbnailUploadProps) {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>(existingThumbnail || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!ALLOWED_THUMBNAIL_TYPES.includes(file.type)) {
      toast.error('Please upload a JPEG, PNG, or WebP image');
      return;
    }

    // Validate file size
    if (file.size > MAX_THUMBNAIL_SIZE) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    try {
      setIsUploading(true);

      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const { success, url, error } = await resourceService.uploadFile(
        file,
        user.id,
        'thumbnail'
      );

      if (!success || !url) {
        throw new Error(error || 'Failed to upload thumbnail');
      }

      setPreviewUrl(url);
      onThumbnailChange(url);
      toast.success('Thumbnail uploaded successfully');
    } catch (error: any) {
      console.error('Error uploading thumbnail:', error);
      toast.error(error.message || 'Failed to upload thumbnail');
      // Reset the file input on error
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    setPreviewUrl('');
    onThumbnailChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <Label className="font-medium">Thumbnail Image</Label>
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_THUMBNAIL_TYPES.join(',')}
        onChange={handleFileChange}
        className="hidden"
      />
      {previewUrl ? (
        <div className="relative w-full h-40">
          <img
            src={previewUrl}
            alt="Thumbnail preview"
            className="w-full h-full object-cover rounded-md"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2"
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div
          className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-gray-300 rounded-md cursor-pointer hover:border-gray-400 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-6 w-6 text-gray-400 mb-2" />
          <p className="text-sm text-gray-500">Click to upload or drag and drop</p>
          <p className="text-xs text-gray-400 mt-1">JPEG, PNG, or WebP (max 5MB)</p>
        </div>
      )}
      {isUploading && (
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-sm text-gray-500">Uploading...</span>
        </div>
      )}
    </div>
  );
} 