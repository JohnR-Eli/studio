"use client";

import { useState, useCallback } from 'react';
import ClosetUpload from '@/components/style-seer/ClosetUpload';
import { Button } from '@/components/ui/button';
import LoadingSpinner from '@/components/style-seer/LoadingSpinner';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from 'lucide-react';
import { analyzeCloset, ClosetAnalysisResult } from '@/ai/flows/analyze-closet';
import ClosetAnalysisResults from './ClosetAnalysisResults';

export default function ClosetMode() {
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<ClosetAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImagesUpload = useCallback((dataUris: string[]) => {
    setImageUris(dataUris);
    // Reset analysis when images change
    setAnalysis(null);
    setError(null);
  }, []);

  const handleAnalyzeCloset = async () => {
    if (imageUris.length === 0) {
      setError("Please upload at least one image to analyze.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const result = await analyzeCloset({ photoDataUris: imageUris });
      if (result) {
        setAnalysis(result);
      } else {
        setError("The closet analysis returned no result.");
      }
    } catch (e: any) {
      console.error("Closet Analysis Error:", e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      setError(`An error occurred during closet analysis: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="flex flex-col items-center">
        <h2 className="text-2xl font-bold tracking-tight mb-4">Your Virtual Closet</h2>
        <p className="text-muted-foreground mb-8 max-w-2xl text-center">
          Upload images of your clothes, and we'll analyze your style to recommend matching items from your favorite brands.
        </p>
        <ClosetUpload onImagesUpload={handleImagesUpload} isLoading={isLoading} />

        {imageUris.length > 0 && !isLoading && (
          <div className="mt-8">
            <Button onClick={handleAnalyzeCloset} size="lg" disabled={isLoading}>
              {isLoading ? 'Analyzing...' : `Analyze ${imageUris.length} Item(s)`}
            </Button>
          </div>
        )}

        {isLoading && (
          <div className="mt-10">
            <LoadingSpinner message="Analyzing your closet..." />
          </div>
        )}

        {error && !isLoading && (
          <Alert variant="destructive" className="mt-10 max-w-xl mx-auto shadow-md">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {analysis && !isLoading && (
          <div className="mt-10 w-full max-w-4xl">
            <ClosetAnalysisResults analysis={analysis} />
          </div>
        )}
      </div>
    </div>
  );
}
