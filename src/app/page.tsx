
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
import { AlertCircle, Sparkles, RotateCcw, History as HistoryIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

type SimilarItem = Omit<GenkitSimilarItem, 'itemImageDataUri'>;

// AnalysisState now reflects the updated AnalyzeClothingImageOutput
type AnalysisState = Partial<AnalyzeClothingImageOutput> & {
  similarItems?: SimilarItem[];
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
    setCurrentLoadingMessage("Analyzing clothing, gender, and brand...");

    let finalAnalysisState: AnalysisState = {
      clothingItems: [],
      genderDepartment: '', // Default for new field
      brand: undefined,
      similarItems: []
    };

    try {
      const clothingAnalysisResult: AnalyzeClothingImageOutput | null = await analyzeClothingImage({ photoDataUri: dataUri });

      if (clothingAnalysisResult) {
        finalAnalysisState = { ...finalAnalysisState, ...clothingAnalysisResult };

        const hasMeaningfulAnalysis =
          (clothingAnalysisResult.clothingItems && clothingAnalysisResult.clothingItems.length > 0) ||
          clothingAnalysisResult.brand ||
          clothingAnalysisResult.genderDepartment;

        if (hasMeaningfulAnalysis) {
          setCurrentLoadingMessage("Finding similar items (this may take a moment)...");
          const similarItemsResult: FindSimilarItemsOutput = await findSimilarItems({
            photoDataUri: dataUri,
            clothingItem: clothingAnalysisResult.clothingItems?.[0] || "clothing item",
            brand: clothingAnalysisResult.brand,
            // dominantColors and style are now optional in findSimilarItems flow
            dominantColors: undefined, 
            style: undefined,
          });
          finalAnalysisState.similarItems = (similarItemsResult.similarItems || []).map(item => ({
            itemTitle: item.itemTitle,
            itemDescription: item.itemDescription,
            vendorLink: item.vendorLink,
          }));
        }
        setAnalysis(finalAnalysisState);
        setError(null);

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

      } else {
        setError("Failed to analyze image. The AI could not retrieve clothing details.");
        setAnalysis(null);
      }
    } catch (e: any) {
      console.error("Analysis Error:", e);
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred during image processing.";
      setError(`An error occurred: ${errorMessage}. Please try again or use a different image.`);
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

  const showInitialHelper = !imageUri && !analysis && !isLoading && !error;

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
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-3">
                Unlock Your Fashion Insights
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
                Upload an image to instantly analyze clothing items, gender, and brand. We'll even help you find similar pieces online!
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
                        <li>Our AI meticulously analyzes items, gender department, and brand.</li>
                        <li>Discover the results and get links to similar fashion items online. Hover for a quick description.</li>
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
                  genderDepartment={analysis.genderDepartment} // Pass new prop
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
          </div>
          <footer className="text-center py-8 border-t border-border/60 mt-auto">
            <p className="text-sm text-muted-foreground">
              StyleSeer &copy; {new Date().getFullYear()} - Your AI Fashion Assistant.
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
