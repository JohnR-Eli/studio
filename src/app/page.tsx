
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
};

export type HistoryEntry = {
  id: string;
  timestamp: Date;
  imageUri: string;
  analysisResult: AnalysisState; // This will store the primary analysis, not the dynamically loaded similar items for hovered brands
};

const MAX_HISTORY_ITEMS = 10;
const LOCAL_STORAGE_KEY = 'fittedToolSearchHistory';

export default function StyleSeerPage() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisState | null>(null);
  const [isLoading, setIsLoading] = useState(false); // For initial image analysis
  const [isSpecificItemsLoading, setIsSpecificItemsLoading] = useState(false); // For loading items of a hovered brand
  const [currentlyDisplayedBrandItems, setCurrentlyDisplayedBrandItems] = useState<string | null>(null); // Name of the brand whose items are shown
  const [error, setError] = useState<string | null>(null);
  const [currentLoadingMessage, setCurrentLoadingMessage] = useState("Analyzing image...");
  const [searchHistory, setSearchHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (storedHistory) {
        const parsedHistory = JSON.parse(storedHistory);
        if (Array.isArray(parsedHistory)) {
          setSearchHistory(parsedHistory);
        } else {
          console.warn("Invalid history format in localStorage:", parsedHistory);
          localStorage.removeItem(LOCAL_STORAGE_KEY);
        }
      }
    } catch (e) {
      console.error("Failed to load search history from localStorage:", e);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    try {
      if (searchHistory.length > 0) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(searchHistory));
      } else if (localStorage.getItem(LOCAL_STORAGE_KEY)) {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      }
    } catch (e) {
      console.error("Failed to save search history to localStorage:", e);
    }
  }, [searchHistory]);

  const handleImageUpload = useCallback(async (dataUri: string) => {
    if (!dataUri) {
      setImageUri(null);
      setAnalysis(null);
      setError(null);
      setIsLoading(false);
      setIsSpecificItemsLoading(false);
      setCurrentlyDisplayedBrandItems(null);
      setCurrentLoadingMessage("Analyzing image...");
      return;
    }

    setImageUri(dataUri);
    setAnalysis(null); // Clear previous analysis
    setError(null);
    setIsLoading(true);
    setIsSpecificItemsLoading(false);
    setCurrentlyDisplayedBrandItems(null);
    setCurrentLoadingMessage("Analyzing image details...");

    try {
      const clothingAnalysisResult = await analyzeClothingImage({ photoDataUri: dataUri });

      if (clothingAnalysisResult) {
        const currentAnalysis: AnalysisState = {
          ...clothingAnalysisResult,
          similarItems: [], // Initialize similarItems as empty; will be populated on hover
        };
        setAnalysis(currentAnalysis);

        // Save to history (without similarItems, as they are dynamic)
        const historyAnalysisResult: AnalysisState = { ...clothingAnalysisResult, similarItems: undefined };
         if (historyAnalysisResult.clothingItems?.length || historyAnalysisResult.brand || historyAnalysisResult.genderDepartment || historyAnalysisResult.alternativeBrands?.length) {
            setSearchHistory(prevHistory => {
            const newEntry: HistoryEntry = {
                id: new Date().toISOString() + Math.random(),
                timestamp: new Date(),
                imageUri: dataUri,
                analysisResult: historyAnalysisResult,
            };
            const updatedHistory = [newEntry, ...prevHistory.filter(item => item.id !== newEntry.id)];
            return updatedHistory.slice(0, MAX_HISTORY_ITEMS);
            });
        }
        setError(null);
      } else {
        setError("Failed to analyze image. The AI could not retrieve details for this image.");
        setAnalysis(null);
      }
    } catch (e: any) {
      console.error("Analysis Error:", e);
      const errorMessage = e instanceof Error ? e.message : String(e) || "An unknown error occurred during image processing.";
      if (errorMessage.toLowerCase().includes("model") && (errorMessage.toLowerCase().includes("not found") || errorMessage.toLowerCase().includes("cannot be accessed"))) {
        setError(`AI Model Access Issue: The AI model configured for analysis could not be accessed. Please verify your API key, Google Cloud project settings, and ensure the necessary AI/ML APIs (e.g., 'Generative Language API' or 'Vertex AI API') are enabled with billing. Original error: ${errorMessage}`);
      } else if (errorMessage.toLowerCase().includes("safety") || errorMessage.toLowerCase().includes("blocked")) {
        setError(`Content Blocked: The AI model blocked the response, likely due to safety settings or the nature of the image content. Please try a different image. Original error: ${errorMessage}`);
      } else if (errorMessage.toLowerCase().includes("api key") || errorMessage.toLowerCase().includes("permission denied")) {
         setError(`API Key or Permissions Issue: There might be a problem with your API key or its permissions. Please check your credentials and project configuration. Original error: ${errorMessage}`);
      } else {
        setError(`An error occurred during processing: ${errorMessage}. Please try again or use a different image.`);
      }
      setAnalysis(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleBrandHover = useCallback(async (brandName: string) => {
    if (!imageUri || !analysis) return; // Need image and initial analysis context

    // Optional: Basic cache check - if we are already showing items for this brand, don't reload.
    // if (currentlyDisplayedBrandItems === brandName && (analysis.similarItems && analysis.similarItems.length > 0) && !isSpecificItemsLoading) {
    //   return;
    // }

    setIsSpecificItemsLoading(true);
    setCurrentlyDisplayedBrandItems(brandName);
    // Clear previous brand's items before loading new ones for better UX
    setAnalysis(prevAnalysis => ({
        ...prevAnalysis!,
        similarItems: [], 
    }));


    try {
      const similarItemsResult = await findSimilarItems({
        photoDataUri: imageUri,
        clothingItem: analysis.clothingItems?.[0] || "clothing item from image",
        brand: brandName, // Focus on the hovered brand
        initialBrandIsExplicit: analysis.brand === brandName && analysis.brandIsExplicit, // True if hovered brand is the explicitly ID'd one
      });

      setAnalysis(prevAnalysis => ({
        ...prevAnalysis!,
        similarItems: (similarItemsResult?.similarItems || []).map(item => ({
          itemTitle: item.itemTitle,
          itemDescription: item.itemDescription,
          vendorLink: item.vendorLink,
        })),
      }));
      setError(null); // Clear previous errors if successful
    } catch (e: any) {
      console.error(`Error fetching items for brand ${brandName}:`, e);
      const errorMessage = e instanceof Error ? e.message : String(e) || "An unknown error occurred.";
      setError(`Could not fetch items for ${brandName}: ${errorMessage}`);
      setAnalysis(prevAnalysis => ({ // Ensure analysis state is maintained even on error
        ...prevAnalysis!,
        similarItems: [], // Clear items on error for this brand
      }));
    } finally {
      setIsSpecificItemsLoading(false);
    }
  }, [imageUri, analysis]);


  const handleReset = useCallback(() => {
    setImageUri(null);
    setAnalysis(null);
    setError(null);
    setIsLoading(false);
    setIsSpecificItemsLoading(false);
    setCurrentlyDisplayedBrandItems(null);
    setCurrentLoadingMessage("Analyzing image...");
  }, []);

  const handleSelectHistoryItem = useCallback((entry: HistoryEntry) => {
    setImageUri(entry.imageUri);
    // Restore only the primary analysis from history. Similar items will be fetched on hover.
    setAnalysis({
        ...entry.analysisResult,
        similarItems: [] // Reset similar items, will load on hover
    });
    setIsLoading(false);
    setIsSpecificItemsLoading(false);
    setCurrentlyDisplayedBrandItems(null);
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
            
            <ImageUpload onImageUpload={handleImageUpload} isLoading={isLoading} />

            {isLoading && ( // For initial analysis
              <div className="mt-10">
                <LoadingSpinner message={currentLoadingMessage} />
              </div>
            )}

            {error && !isLoading && !isSpecificItemsLoading && ( // Show general errors if not loading anything
              <Alert variant="destructive" className="mt-10 max-w-xl mx-auto shadow-md">
                <AlertCircle className="h-5 w-5" />
                <AlertTitle>Error</AlertTitle>
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
                  brandIsExplicit={analysis.brandIsExplicit}
                  alternativeBrands={analysis.alternativeBrands}
                  similarItems={analysis.similarItems}
                  onBrandHover={handleBrandHover}
                  isSpecificItemsLoading={isSpecificItemsLoading}
                  currentlyDisplayedBrandItems={currentlyDisplayedBrandItems}
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
    
