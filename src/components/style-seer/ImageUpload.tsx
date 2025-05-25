"use client";

import { useState, useCallback, ChangeEvent, DragEvent } from 'react';
import { UploadCloud, Image as ImageIconPrimitve, XCircle } from 'lucide-react'; // Renamed ImageIcon to avoid conflict
import { Button } from '@/components/ui/button';
import NextImage from 'next/image';

interface ImageUploadProps {
  onImageUpload: (dataUri: string) => void;
  isLoading: boolean;
}

export default function ImageUpload({ onImageUpload, isLoading }: ImageUploadProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = useCallback((file: File | null) => {
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // Max 5MB
        setError("File is too large. Maximum size is 5MB.");
        setImagePreview(null);
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError("Invalid file type. Please upload an image (PNG, JPG, GIF, WEBP).");
        setImagePreview(null);
        return;
      }
      setError(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUri = reader.result as string;
        setImagePreview(dataUri);
        onImageUpload(dataUri);
      };
      reader.readAsDataURL(file);
    }
  }, [onImageUpload]);

  const onDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    if (isLoading) return;
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      handleFileChange(event.dataTransfer.files[0]);
    }
  }, [isLoading, handleFileChange]);

  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (isLoading) return;
    setIsDragging(true);
  }, [isLoading]);

  const onDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  }, []);

  const onFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (isLoading) return;
    if (event.target.files && event.target.files[0]) {
      handleFileChange(event.target.files[0]);
    }
    event.target.value = ''; // Reset file input to allow re-uploading the same file
  };

  const clearImage = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent label click
    setImagePreview(null);
    setError(null);
    onImageUpload(""); // Signal parent that image is cleared
  };

  return (
    <div className="w-full max-w-lg mx-auto p-1 bg-card rounded-xl shadow-xl border border-border transition-all duration-300 ease-in-out">
      <label
        htmlFor="image-upload-input"
        className={`
          relative group flex flex-col items-center justify-center w-full h-72 border-2 border-dashed rounded-lg cursor-pointer
          hover:border-accent
          transition-colors duration-300
          ${isDragging ? 'border-accent bg-accent/10' : 'border-muted'}
          ${imagePreview ? 'border-solid !border-accent/50' : ''}
          ${isLoading ? 'cursor-not-allowed opacity-60' : ''}
        `}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
      >
        {imagePreview ? (
          <div className="relative w-full h-full rounded-md overflow-hidden">
            <NextImage src={imagePreview} alt="Uploaded preview" layout="fill" objectFit="contain" />
            {!isLoading && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 bg-card/70 hover:bg-card text-destructive-foreground hover:text-destructive rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={clearImage}
                aria-label="Remove image"
              >
                <XCircle size={28} />
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
            <UploadCloud className={`w-12 h-12 mb-4 ${isDragging ? 'text-accent' : 'text-muted-foreground'}`} strokeWidth={1.5} />
            <p className={`mb-2 text-md ${isDragging ? 'text-accent' : 'text-foreground/80'}`}>
              <span className="font-semibold text-accent">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-muted-foreground">PNG, JPG, GIF, WEBP (MAX. 5MB)</p>
          </div>
        )}
        <input
          id="image-upload-input"
          type="file"
          className="hidden"
          accept="image/png, image/jpeg, image/gif, image/webp"
          onChange={onFileInputChange}
          disabled={isLoading || !!imagePreview} // Disable if loading or image already present
        />
      </label>
      {error && <p className="mt-3 text-sm text-destructive text-center">{error}</p>}
    </div>
  );
}
