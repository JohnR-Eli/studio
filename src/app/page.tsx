
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
    setCurrentLoadingMessage("Analyzing clothing, colors, style, and brand...");

    try {
      const clothingAnalysisResult: AnalyzeClothingImageOutput | null = await analyzeClothingImage({ photoDataUri: dataUri });

      if (clothingAnalysisResult) {
        // Initialize the final state with potentially empty similarItems
        let finalAnalysisState: AnalysisState = { 
          ...clothingAnalysisResult, 
          similarItems: [] 
        };

        // If primary analysis yielded clothing items, try to find similar ones
        if (clothingAnalysisResult.clothingItems && clothingAnalysisResult.clothingItems.length > 0) {
          setCurrentLoadingMessage("Finding similar items online...");
          const similarItemsData: FindSimilarItemsOutput = await findSimilarItems({
            photoDataUri: dataUri,
            clothingItem: clothingAnalysisResult.clothingItems[0], // Assuming at least one item
            brand: clothingAnalysisResult.brand,
            dominantColors: clothingAnalysisResult.dominantColors,
            style: clothingAnalysisResult.style,
          });
          finalAnalysisState.similarItems = similarItemsData.similarItems || [];
        }
        
        // Check if the initial AI call returned any meaningful data to display
        // This allows UI to differentiate "no results found" from an error
        const hasMeaningfulAnalysis = 
          (clothingAnalysisResult.clothingItems && clothingAnalysisResult.clothingItems.length > 0) ||
          (clothingAnalysisResult.dominantColors && clothingAnalysisResult.dominantColors.length > 0) ||
          clothingAnalysisResult.style || 
          clothingAnalysisResult.brand;

        if (hasMeaningfulAnalysis) {
          setAnalysis(finalAnalysisState);
          setError(null); // Clear previous errors if we have some results
        } else {
          // The AI call was successful but returned no specific details (e.g. image didn't have clear clothing)
          setAnalysis(finalAnalysisState); // Show the (empty) results so UI can adapt
          setError(null); // Not an error, but no specific findings
        }

      } else {
        // AI call for clothingAnalysis failed or returned null
        setError("Failed to analyze image. The AI could not process the request.");
        setAnalysis(null);
      }
    } catch (e: any) {
      console.error("Analysis Error:", e);
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred during image processing.";
      setError(`An error occurred: ${errorMessage}. Please try again.`);
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
    setCurrentLoadingMessage("Analyzing image...");
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
              brand={analysis.brand}
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
