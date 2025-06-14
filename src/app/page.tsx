
"use client";

import { useState, useCallback, useEffect } from 'react';
import ImageUpload from '@/components/style-seer/ImageUpload';
import AnalysisResults from '@/components/style-seer/AnalysisResults';
import LoadingSpinner from '@/components/style-seer/LoadingSpinner';
import Header from '@/components/style-seer/Header';
import SearchHistory from '@/components/style-seer/SearchHistory';
import { Button } from '@/components/ui/button';
import { analyzeClothingImage, AnalyzeClothingImageOutput } from '@/ai/flows/analyze-clothing-image';
import { findSimilarItems, FindSimilarItemsOutput, SimilarItem as GenkitSimilarItem } from '@/ai/flows/find-similar-items';
import { AlertCircle, RotateCcw, History as HistoryIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

type SimilarItem = Omit<GenkitSimilarItem, 'itemImageDataUri'>;

type AnalysisState = Partial<AnalyzeClothingImageOutput> & {
  similarItems?: SimilarItem[];
  // brandIsExplicit is already part of AnalyzeClothingImageOutput, so it's included here.
};

export type HistoryEntry = {
  id: string;
  timestamp: Date;
  imageUri: string;
  analysisResult: AnalysisState;
};

const MAX_HISTORY_ITEMS = 10;

export default function StyleSeerPage() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentLoadingMessage, setCurrentLoadingMessage] = useState("Analyzing image...");
  const [searchHistory, setSearchHistory] = useState<HistoryEntry[]>([]);

  const handleImageUpload = useCallback(async (dataUri: string) => {
    if (!dataUri) {
      setImageUri(null);
      setAnalysis(null);
      setError(null);
      setIsLoading(false);
      setCurrentLoadingMessage("Analyzing image...");
      return;
    }

    setImageUri(dataUri);
    setAnalysis(null);
    setError(null);
    setIsLoading(true);
    setCurrentLoadingMessage("Processing image and finding similar items...");

    let finalAnalysisState: AnalysisState = {
      clothingItems: [],
      genderDepartment: '',
      brand: undefined,
      brandIsExplicit: false, // Default to false
      similarItems: []
    };

    try {
      // Analyze clothing first to get brand and explicitness
      const clothingAnalysisResult = await analyzeClothingImage({ photoDataUri: dataUri });

      if (clothingAnalysisResult) {
        finalAnalysisState = { ...finalAnalysisState, ...clothingAnalysisResult };
      } else {
        console.warn("Clothing analysis returned no result. Similar items search may be less accurate.");
      }

      // Now find similar items, passing the brand and explicitness
      const similarItemsResult = await findSimilarItems({
        photoDataUri: dataUri,
        clothingItem: clothingAnalysisResult?.clothingItems?.[0] || "clothing item from image",
        brand: clothingAnalysisResult?.brand,
        initialBrandIsExplicit: clothingAnalysisResult?.brandIsExplicit,
      });
      
      finalAnalysisState.similarItems = (similarItemsResult?.similarItems || []).map(item => ({
        itemTitle: item.itemTitle,
        itemDescription: item.itemDescription,
        vendorLink: item.vendorLink,
      }));
      
      setAnalysis(finalAnalysisState);

      if (finalAnalysisState.clothingItems?.length || finalAnalysisState.brand || finalAnalysisState.genderDepartment || finalAnalysisState.similarItems?.length) {
        setSearchHistory(prevHistory => {
          const newEntry: HistoryEntry = {
            id: new Date().toISOString(),
            timestamp: new Date(),
            imageUri: dataUri,
            analysisResult: finalAnalysisState,
          };
          const updatedHistory = [newEntry, ...prevHistory];
          return updatedHistory.slice(0, MAX_HISTORY_ITEMS);
        });
      }

      if (!clothingAnalysisResult && (!similarItemsResult || similarItemsResult.similarItems.length === 0)) {
        setError("Failed to analyze image or find similar items. The AI could not retrieve details.");
        setAnalysis(null);
      } else {
        setError(null);
      }

    } catch (e: any) {
      console.error("Analysis Error:", e);
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred during image processing.";
      if (errorMessage.includes("NOT_FOUND")) {
        setError(`Model not found. Please check API key and project settings. Original error: ${errorMessage}`);
      } else {
        setError(`An error occurred: ${errorMessage}. Please try again or use a different image.`);
      }
      setAnalysis(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleReset = useCallback(() => {
    setImageUri(null);
    setAnalysis(null);
    setError(null);
    setIsLoading(false);
    setCurrentLoadingMessage("Analyzing image...");
  }, []);

  const handleSelectHistoryItem = useCallback((entry: HistoryEntry) => {
    setImageUri(entry.imageUri);
    setAnalysis(entry.analysisResult);
    setIsLoading(false);
    setError(null);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-72 md:w-80 lg:w-96 flex-shrink-0 border-r border-border/60 bg-card p-4 hidden md:flex flex-col overflow-y-auto">
          <Card className="flex-1 flex flex-col overflow-hidden shadow-md">
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="flex items-center text-xl gap-2">
                <HistoryIcon size={22} className="text-primary" />
                Search History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto">
              <ScrollArea className="h-full">
                <div className="p-4 pt-0">
                 <SearchHistory history={searchHistory} onSelectHistoryItem={handleSelectHistoryItem} />
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </aside>

        <main className="flex-1 flex flex-col overflow-y-auto">
          <div className="container mx-auto px-4 py-8 md:py-12 flex-grow">
            <div className="text-center mb-8 md:mb-12">
              {/* Flavor text removed as per request */}
            </div>

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
                  genderDepartment={analysis.genderDepartment}
                  brand={analysis.brand}
                  brandIsExplicit={analysis.brandIsExplicit} // Pass this new prop
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
          </div>
          <footer className="text-center py-8 border-t border-border/60 mt-auto">
            <p className="text-sm text-muted-foreground">
              Fitted Tool &copy; {new Date().getFullYear()} - Your AI Fashion Assistant.
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
