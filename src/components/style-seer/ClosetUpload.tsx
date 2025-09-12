"use client";

import { useState, useCallback, ChangeEvent, DragEvent } from 'react';
import { UploadCloud, Image as ImageIconPrimitve, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NextImage from 'next/image';

interface ClosetUploadProps {
  onImagesUpload: (dataUris: string[]) => void;
  isLoading: boolean;
}

const MAX_IMAGES = 5;
const MAX_FILE_SIZE_MB = 5;

export default function ClosetUpload({ onImagesUpload, isLoading }: ClosetUploadProps) {
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFilesChange = useCallback((files: FileList | null) => {
    if (files) {
      setError(null);
      const newFiles = Array.from(files);
      const totalImages = imagePreviews.length + newFiles.length;

      if (totalImages > MAX_IMAGES) {
        setError(`You can only upload a maximum of ${MAX_IMAGES} images.`);
        return;
      }

      const validFiles = newFiles.filter(file => {
        if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
          setError(`File "${file.name}" is too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`);
          return false;
        }
        if (!file.type.startsWith('image/')) {
          setError(`File "${file.name}" is not a valid image type.`);
          return false;
        }
        return true;
      });

      if (validFiles.length > 0) {
        const fileReaders = validFiles.map(file => {
          return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        });

        Promise.all(fileReaders).then(dataUris => {
          const updatedPreviews = [...imagePreviews, ...dataUris];
          setImagePreviews(updatedPreviews);
          onImagesUpload(updatedPreviews);
        }).catch(err => {
          console.error("Error reading files:", err);
          setError("There was an error processing your images.");
        });
      }
    }
  }, [imagePreviews, onImagesUpload]);

  const onDrop = useCallback((event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    if (isLoading) return;
    handleFilesChange(event.dataTransfer.files);
  }, [isLoading, handleFilesChange]);

  const onDragOver = useCallback((event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (isLoading) return;
    setIsDragging(true);
  }, [isLoading]);

  const onDragLeave = useCallback((event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  }, []);

  const onFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (isLoading) return;
    handleFilesChange(event.target.files);
    event.target.value = '';
  };

  const removeImage = (e: React.MouseEvent<HTMLButtonElement>, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    const updatedPreviews = imagePreviews.filter((_, i) => i !== index);
    setImagePreviews(updatedPreviews);
    onImagesUpload(updatedPreviews);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-1 bg-card rounded-xl shadow-xl border border-border transition-all duration-300 ease-in-out">
      <label
        htmlFor="closet-upload-input"
        className={`
          relative group flex flex-col items-center justify-center w-full min-h-[20rem] border-2 border-dashed rounded-lg cursor-pointer
          hover:border-accent
          transition-colors duration-300
          ${isDragging ? 'border-accent bg-accent/10' : 'border-muted'}
          ${imagePreviews.length > 0 ? 'border-solid !border-accent/50' : ''}
          ${isLoading ? 'cursor-not-allowed opacity-60' : ''}
        `}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
      >
        {imagePreviews.length > 0 ? (
          <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 w-full">
            {imagePreviews.map((preview, index) => (
              <div key={index} className="relative group/image aspect-w-1 aspect-h-1">
                <NextImage src={preview} alt={`Uploaded preview ${index + 1}`} layout="fill" objectFit="cover" className="rounded-md" />
                {!isLoading && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 right-1 bg-card/70 hover:bg-card text-destructive-foreground hover:text-destructive rounded-full h-7 w-7 opacity-0 group-hover/image:opacity-100 transition-opacity"
                    onClick={(e) => removeImage(e, index)}
                    aria-label={`Remove image ${index + 1}`}
                  >
                    <XCircle size={20} />
                  </Button>
                )}
              </div>
            ))}
            {imagePreviews.length < MAX_IMAGES && !isLoading && (
              <div className="flex items-center justify-center aspect-w-1 aspect-h-1 border-2 border-dashed border-muted rounded-md hover:border-accent transition-colors">
                <div className="text-center text-muted-foreground">
                  <UploadCloud className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">Add more</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
            <UploadCloud className={`w-12 h-12 mb-4 ${isDragging ? 'text-accent' : 'text-muted-foreground'}`} strokeWidth={1.5} />
            <p className={`mb-2 text-md ${isDragging ? 'text-accent' : 'text-foreground/80'}`}>
              <span className="font-semibold text-accent">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-muted-foreground">Up to {MAX_IMAGES} images (PNG, JPG, etc.)</p>
          </div>
        )}
        <input
          id="closet-upload-input"
          type="file"
          multiple
          className="hidden"
          accept="image/png, image/jpeg, image/gif, image/webp"
          onChange={onFileInputChange}
          disabled={isLoading || imagePreviews.length >= MAX_IMAGES}
        />
      </label>
      {error && <p className="mt-3 text-sm text-destructive text-center">{error}</p>}
    </div>
  );
}
