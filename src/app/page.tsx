
"use client";

import { useState } from 'react';
import ImageUpload from '@/components/style-seer/ImageUpload';
import AnalysisResults from '@/components/style-seer/AnalysisResults';
import LoadingSpinner from '@/components/style-seer/LoadingSpinner';
import Header from '@/components/style-seer/Header';
import { Button } from '@/components/ui/button';
import { analyzeClothingImage, AnalyzeClothingImageOutput } from '@/ai/flows/analyze-clothing-image';
import { findSimilarItems, FindSimilarItemsOutput } from '@/ai/flows/find-similar-items';
import { AlertCircle, Sparkles, RotateCcw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';


type SimilarItem = { itemName: string; vendorLink: string; };
// Include 'brand' from AnalyzeClothingImageOutput in AnalysisState
type AnalysisState = AnalyzeClothingImageOutput & { similarItems?: SimilarItem[] };

export default function StyleSeerPage() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentLoadingMessage, setCurrentLoadingMessage] = useState("Analyzing image...");

  const handleImageUpload = async (dataUri: string) => {
    if (!dataUri) {
      handleReset();
      return;
    }

    setImageUri(dataUri);
    setAnalysis(null);
    setError(null);
    setIsLoading(true);

    try {
      setCurrentLoadingMessage("Analyzing clothing, colors, style, and brand...");
      const clothingAnalysis = await analyzeClothingImage({ photoDataUri: dataUri });

      if (clothingAnalysis && (clothingAnalysis.clothingItems.length > 0 || clothingAnalysis.dominantColors.length > 0 || clothingAnalysis.style || clothingAnalysis.brand)) {
        setAnalysis(clothingAnalysis);

        if (clothingAnalysis.clothingItems.length > 0) {
            setCurrentLoadingMessage("Finding similar items online...");
            const similarItemsResult = await findSimilarItems({
                photoDataUri: dataUri, // Pass the original image URI
                clothingItem: clothingAnalysis.clothingItems[0],
                brand: clothingAnalysis.brand, // Pass the identified brand
                dominantColors: clothingAnalysis.dominantColors,
                style: clothingAnalysis.style,
            });
            setAnalysis(prev => ({ ...prev, ...clothingAnalysis, similarItems: similarItemsResult.similarItems }));
        } else {
             setAnalysis(prev => ({ ...prev, ...clothingAnalysis, similarItems: [] }));
        }
      } else if (clothingAnalysis) {
        setAnalysis({...clothingAnalysis, similarItems: []});
        setError(null);
      }
      else {
        setError("Failed to analyze image. The AI could not process the request.");
        setAnalysis(null);
      }
    } catch (e) {
      console.error("Analysis Error:", e);
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
      setError(`An error occurred during analysis: ${errorMessage}. Please try again.`);
      setAnalysis(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setImageUri(null);
    setAnalysis(null);
    setError(null);
    setIsLoading(false);
  };
  
  const showInitialHelper = !imageUri && !analysis && !isLoading && !error;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-3">
            Unlock Your Fashion Insights
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            Upload an image to instantly analyze clothing items, dominant colors, and overall style. We'll even help you find similar pieces online!
          </p>
        </div>

        {showInitialHelper && (
            <Card className="bg-primary/5 border-primary/10 p-6 rounded-xl mb-8 max-w-2xl mx-auto shadow-sm">
              <CardHeader className="p-0 mb-3">
                <CardTitle className="flex items-center gap-3 text-primary text-xl">
                    <Sparkles className="h-7 w-7" />
                    How StyleSeer Works
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ol className="list-decimal list-inside text-muted-foreground space-y-1.5 text-sm">
                    <li>Drag & drop or click to upload an image featuring clothing.</li>
                    <li>Our AI meticulously analyzes items, colors, style, and brand.</li>
                    <li>Discover the results and get links to similar fashion items online.</li>
                </ol>
              </CardContent>
            </Card>
        )}

        <ImageUpload onImageUpload={handleImageUpload} isLoading={isLoading} />

        {isLoading && (
          <div className="mt-10">
            <LoadingSpinner message={currentLoadingMessage} />
          </div>
        )}

        {error && !isLoading && (
          <Alert variant="destructive" className="mt-10 max-w-xl mx-auto shadow-md">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle>Analysis Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!isLoading && analysis && (
          <>
            <AnalysisResults
              imagePreview={imageUri}
              clothingItems={analysis.clothingItems}
              dominantColors={analysis.dominantColors}
              style={analysis.style}
              brand={analysis.brand} {/* Pass brand to results */}
              similarItems={analysis.similarItems}
            />
            <div className="mt-10 text-center">
              <Button onClick={handleReset} variant="outline" size="lg" className="shadow-sm hover:shadow-md transition-shadow">
                <RotateCcw size={18} className="mr-2" />
                Analyze Another Image
              </Button>
            </div>
          </>
        )}
      </main>
      <footer className="text-center py-8 border-t border-border/60 mt-12">
        <p className="text-sm text-muted-foreground">
          StyleSeer &copy; {new Date().getFullYear()} - Your AI Fashion Assistant.
        </p>
      </footer>
    </div>
  );
}
