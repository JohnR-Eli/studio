"use client";

import { useState, useCallback } from 'react';
import { AnalyzeClothingImageOutput, analyzeClothingImage } from '@/ai/flows/analyze-clothing-image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import LoadingSpinner from './LoadingSpinner';
import { UploadCloud, X } from 'lucide-react';

type AnalysisResult = {
  category: string;
  brand: string;
};

type ImageState = {
  id: string;
  file: File;
  preview: string;
  result: AnalysisResult | null;
  isLoading: boolean;
  error: string | null;
};

interface ImageWardrobeProps {
  onAnalysisComplete: (results: AnalysisResult[]) => void;
  analyzeClothingImage: (input: { photoDataUri: string; }) => Promise<AnalyzeClothingImageOutput | null>;
}

export default function ImageWardrobe({ onAnalysisComplete, analyzeClothingImage }: ImageWardrobeProps) {
  const [images, setImages] = useState<ImageState[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback(async (files: File[]) => {
    const newImageStates: ImageState[] = Array.from(files).map(file => ({
      id: `${file.name}-${file.lastModified}`,
      file,
      preview: URL.createObjectURL(file),
      result: null,
      isLoading: true,
      error: null,
    }));

    setImages(prev => [...prev, ...newImageStates]);

    const allResults: AnalysisResult[] = [];

    for (const imageState of newImageStates) {
      try {
        const reader = new FileReader();
        reader.readAsDataURL(imageState.file);
        reader.onloadend = async () => {
          const base64data = reader.result as string;
          const analysisResult = await analyzeClothingImage({ photoDataUri: base64data });

          let finalResult: AnalysisResult;
          if (analysisResult) {
            const brand = analysisResult.identifiedBrand || analysisResult.approximatedBrands?.[0] || analysisResult.alternativeBrands?.[0] || 'Unknown';
            const category = analysisResult.clothingItems[0] || 'Unknown';
            finalResult = { brand, category };
          } else {
            finalResult = { brand: 'Unknown', category: 'Analysis Failed' };
          }

          allResults.push(finalResult);
          setImages(prev => prev.map(img => img.id === imageState.id ? { ...img, result: finalResult, isLoading: false } : img));

          // Check if all new images are processed
          if (allResults.length === newImageStates.length) {
            onAnalysisComplete(allResults);
          }
        };
      } catch (e: any) {
        const error = e instanceof Error ? e.message : String(e);
        setImages(prev => prev.map(img => img.id === imageState.id ? { ...img, error, isLoading: false } : img));
      }
    }
  }, [analyzeClothingImage, onAnalysisComplete]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    if (files.length > 0) {
      handleFiles(files);
    }
  }, [handleFiles]);

  const handleRemoveImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  return (
    <div className="w-full">
      <Card
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors
                    ${isDragging ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center space-y-4">
            <UploadCloud className="w-12 h-12 text-muted-foreground" />
            <p className="text-muted-foreground">Drag & drop your images here, or click to select files</p>
            <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                id="file-upload"
                onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))}
            />
            <Button onClick={() => document.getElementById('file-upload')?.click()}>
                Browse Files
            </Button>
        </div>
      </Card>

      {images.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4">Uploaded Images</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image) => (
              <Card key={image.id} className="relative group overflow-hidden">
                <CardContent className="p-0">
                  <img src={image.preview} alt={image.file.name} className="object-cover w-full h-48" />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleRemoveImage(image.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    {image.isLoading ? (
                      <LoadingSpinner message="Analyzing..." />
                    ) : image.result ? (
                      <div className="text-white text-center p-2">
                        <p className="font-bold text-sm">{image.result.brand}</p>
                        <p className="text-xs">{image.result.category}</p>
                      </div>
                    ) : (
                       <p className="text-red-400 text-xs p-2">{image.error || "An unknown error occurred"}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
