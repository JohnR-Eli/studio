
"use client";

import { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import ImageUpload from '@/components/style-seer/ImageUpload';
import LoadingSpinner from '@/components/style-seer/LoadingSpinner';
import Header from '@/components/style-seer/Header';
import SearchHistory from '@/components/style-seer/SearchHistory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { analyzeClothingImage, AnalyzeClothingImageOutput } from '@/ai/flows/analyze-clothing-image';
import { callExternalApi, ApiResponse } from '@/ai/flows/call-external-api';
import { AlertCircle, RotateCcw, History as HistoryIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import DebugPanel from '@/components/style-seer/DebugPanel';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


const AnalysisResults = dynamic(() => import('@/components/style-seer/AnalysisResults'), {
  loading: () => <div className="mt-10"><LoadingSpinner message="Loading results area..." /></div>,
  ssr: false
});

type SimilarItem = {
    itemTitle: string;
    itemDescription: string;
    vendorLink: string;
    imageURL: string;
};

type AnalysisState = Omit<AnalyzeClothingImageOutput, 'brandIsExplicit'> & 
                     Partial<Pick<AnalyzeClothingImageOutput, 'identifiedBrand' | 'brandIsExplicit' | 'approximatedBrands' | 'alternativeBrands'>> & {
  similarItems?: SimilarItem[];
};


export type HistoryEntry = {
  id: string;
  timestamp: Date;
  imageUri?: string; 
  analysisResult: AnalysisState; 
};

export type LogEntry = {
  id: string;
  timestamp: string;
  event: 'invoke' | 'response' | 'error';
  flow: 'analyzeClothingImage' | 'callExternalApi';
  data: any;
};

const MAX_HISTORY_ITEMS = 10;
const LOCAL_STORAGE_KEY = 'fittedToolSearchHistory';
const HISTORY_PREFERENCE_KEY = 'fittedToolSaveHistoryPreference';

const topCountries = [
    "United States",
    "United Kingdom",
    "Canada",
    "Australia",
    "Germany",
    "France",
    "Japan",
    "India",
    "Brazil",
    "China"
];

export default function StyleSeerPage() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpecificItemsLoading, setIsSpecificItemsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentLoadingMessage, setCurrentLoadingMessage] = useState("Analyzing image...");
  const [searchHistory, setSearchHistory] = useState<HistoryEntry[]>([]);
  const [saveHistoryPreference, setSaveHistoryPreference] = useState<boolean>(false);
  const [country, setCountry] = useState('United States');
  const [numSimilarItems, setNumSimilarItems] = useState(5);
  const [numItemsInput, setNumItemsInput] = useState('5');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  const addLog = useCallback((log: Omit<LogEntry, 'id' | 'timestamp'>) => {
    setLogs(prev => [...prev, {
        id: new Date().toISOString() + Math.random(),
        timestamp: new Date().toISOString(),
        ...log
    }]);
  }, []);

  useEffect(() => {
    let initialPreference = false;
    try {
      const storedPreference = localStorage.getItem(HISTORY_PREFERENCE_KEY);
      initialPreference = storedPreference === 'true';
      setSaveHistoryPreference(initialPreference); 
    } catch (e) {
      console.error("Failed to load history preference from localStorage:", e);
      localStorage.removeItem(HISTORY_PREFERENCE_KEY);
    }

    if (initialPreference) {
      try {
        const storedHistory = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (storedHistory) {
          const parsedHistory: Omit<HistoryEntry, 'imageUri'>[] = JSON.parse(storedHistory);
          if (Array.isArray(parsedHistory)) {
            setSearchHistory(parsedHistory.map(item => ({ ...item, imageUri: undefined })));
          } else {
            console.warn("Invalid history format in localStorage, clearing:", parsedHistory);
            localStorage.removeItem(LOCAL_STORAGE_KEY);
          }
        }
      } catch (e) {
        console.error("Failed to load search history from localStorage:", e);
        localStorage.removeItem(LOCAL_STORAGE_KEY); 
      }
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setSearchHistory([]); 
    }
  }, []); 

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_PREFERENCE_KEY, String(saveHistoryPreference));
      if (!saveHistoryPreference) {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        setSearchHistory([]); 
      } else {
        if (searchHistory.length > 0) {
           const storableHistory = searchHistory.map(entry => {
              const { imageUri, ...restOfEntry } = entry;
              return restOfEntry;
            });
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(storableHistory));
        }
      }
    } catch (e) {
      console.error("Failed to update history preference or related data in localStorage:", e);
    }
  }, [saveHistoryPreference]);


  useEffect(() => {
    if (saveHistoryPreference) {
      try {
        if (searchHistory.length > 0) {
          const storableHistory = searchHistory.map(entry => {
            const { imageUri, ...restOfEntry } = entry;
            return restOfEntry;
          });
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(storableHistory));
        } else {
          localStorage.removeItem(LOCAL_STORAGE_KEY);
        }
      } catch (e: any) {
        console.error("Failed to save search history to localStorage:", e);
        if (e && e.name === 'QuotaExceededError') {
          console.warn("LocalStorage quota exceeded. Search history for this session might not be fully saved.");
           setError("Could not save full search history: Local storage quota exceeded. Try clearing some history or unchecking 'Save for next session' temporarily.");
        }
      }
    }
  }, [searchHistory, saveHistoryPreference]);


  const handleImageUpload = useCallback(async (dataUri: string) => {
    if (!dataUri) {
      setImageUri(null);
      setAnalysis(null);
      setError(null);
      setIsLoading(false);
      setIsSpecificItemsLoading(false);
      setCurrentLoadingMessage("Analyzing image...");
      return;
    }

    setImageUri(dataUri);
    setAnalysis(null);
    setError(null);
    setIsLoading(true);
    setIsSpecificItemsLoading(false);
    setCurrentLoadingMessage("Analyzing image details...");

    const inputPayload = { photoDataUri: dataUri.substring(0, 50) + '...' }; // Truncate for logging
    addLog({ event: 'invoke', flow: 'analyzeClothingImage', data: inputPayload });

    try {
      const clothingAnalysisResult = await analyzeClothingImage({ photoDataUri: dataUri });
      addLog({ event: 'response', flow: 'analyzeClothingImage', data: clothingAnalysisResult || "No result" });

      if (clothingAnalysisResult) {
        const currentAnalysis: AnalysisState = {
          ...clothingAnalysisResult, 
          similarItems: [], 
        };
        setAnalysis(currentAnalysis);
        
        const brandToFetch = clothingAnalysisResult.identifiedBrand || (clothingAnalysisResult.approximatedBrands && clothingAnalysisResult.approximatedBrands[0]);

        if (brandToFetch) {
            handleBrandSelect(brandToFetch, currentAnalysis.clothingItems[0], currentAnalysis.genderDepartment);
        }

        const { similarItems, ...historyAnalysisData } = currentAnalysis;
        
         if (Object.values(historyAnalysisData).some(val => Array.isArray(val) ? val.length > 0 : !!val)) {
            setSearchHistory(prevHistory => {
            const newEntry: HistoryEntry = {
                id: new Date().toISOString() + Math.random(),
                timestamp: new Date(),
                imageUri: dataUri, 
                analysisResult: historyAnalysisData,
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
      addLog({ event: 'error', flow: 'analyzeClothingImage', data: e.message });
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
  }, [addLog]);

  const handleBrandSelect = useCallback(async (brandName: string, category: string, gender: string) => {
    setIsSpecificItemsLoading(true);

    const inputPayload = { howMany: numSimilarItems, category, brand: brandName, gender, country };
    addLog({ event: 'invoke', flow: 'callExternalApi', data: inputPayload });

    try {
      const apiResponse = await callExternalApi(
        numSimilarItems,
        category,
        brandName,
        gender,
        country
      );

      addLog({ event: 'response', flow: 'callExternalApi', data: apiResponse });

      const newSimilarItems = apiResponse.imageURLs.map((imageUrl, index) => ({
          itemTitle: 'Similar Item',
          itemDescription: 'Click to view product page.',
          vendorLink: apiResponse.URLs[index],
          imageURL: imageUrl,
      }));

      setAnalysis(prevAnalysis => ({
        ...prevAnalysis!,
        similarItems: newSimilarItems,
      }));

      setError(null);
    } catch (e: any) {
      addLog({ event: 'error', flow: 'callExternalApi', data: e.message });
      console.error(`Error fetching items for brand ${brandName}:`, e);
      const errorMessage = e instanceof Error ? e.message : String(e) || "An unknown error occurred.";
      setError(`Could not fetch items for ${brandName}: ${errorMessage}`);
      setAnalysis(prevAnalysis => ({
        ...prevAnalysis!,
        similarItems: [],
      }));
    } finally {
      setIsSpecificItemsLoading(false);
    }
  }, [country, numSimilarItems, addLog]);


  const handleReset = useCallback(() => {
    setImageUri(null);
    setAnalysis(null);
    setError(null);
    setIsLoading(false);
    setIsSpecificItemsLoading(false);
    setCurrentLoadingMessage("Analyzing image...");
    setLogs([]);
  }, []);

  const handleSelectHistoryItem = useCallback((entry: HistoryEntry) => {
    setImageUri(entry.imageUri || null); 
    setAnalysis({
        ...entry.analysisResult, 
        similarItems: [] 
    });
    setIsLoading(false);
    setIsSpecificItemsLoading(false);
    setError(null);
    setLogs([]);
  }, []);

  const handleSaveHistoryPreferenceChange = (checked: boolean | 'indeterminate') => {
    if (typeof checked === 'boolean') {
      setSaveHistoryPreference(checked);
    }
  };

  const handleNumItemsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNumItemsInput(value);

    if (value.toLowerCase() === 'debug') {
      setShowDebugPanel(true);
    } else {
      setShowDebugPanel(false);
      const parsedValue = parseInt(value, 10);
      if (!isNaN(parsedValue) && parsedValue > 0) {
        setNumSimilarItems(parsedValue);
      }
    }
  };


  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-72 md:w-80 lg:w-96 flex-shrink-0 border-r border-border/60 bg-card p-4 hidden md:flex flex-col overflow-y-auto">
          <Card className="flex-1 flex flex-col overflow-hidden shadow-md">
            <CardHeader className="pb-3 pt-4 px-4 flex flex-row justify-between items-center">
              <CardTitle className="flex items-center text-xl gap-2">
                <HistoryIcon size={22} className="text-primary" />
                Search History
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="save-history-checkbox"
                  checked={saveHistoryPreference}
                  onCheckedChange={handleSaveHistoryPreferenceChange}
                  aria-label="Save search history for next session"
                />
                <Label htmlFor="save-history-checkbox" className="text-xs font-normal text-muted-foreground cursor-pointer select-none">
                  Save for next session
                </Label>
              </div>
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
            {!isLoading && !analysis && (
              <div className="flex flex-col items-center">
                  <ImageUpload onImageUpload={handleImageUpload} isLoading={isLoading} />
                  <div className="mt-4 w-full max-w-sm">
                      <Label htmlFor="country-select" className="text-sm font-medium text-muted-foreground">
                          Country of Residence
                      </Label>
                      <Select value={country} onValueChange={setCountry}>
                        <SelectTrigger id="country-select" className="mt-1">
                            <SelectValue placeholder="Select a country" />
                        </SelectTrigger>
                        <SelectContent>
                            {topCountries.map((c) => (
                                <SelectItem key={c} value={c}>
                                    {c}
                                </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                  </div>
                  <div className="mt-4 w-full max-w-sm">
                      <Label htmlFor="num-items-input" className="text-sm font-medium text-muted-foreground">
                          Number of Similar Items
                      </Label>
                      <Input
                          id="num-items-input"
                          type="text"
                          value={numItemsInput}
                          onChange={handleNumItemsChange}
                          placeholder="e.g., 5"
                          className="mt-1"
                      />
                  </div>
              </div>
            )}

            {isLoading && (
              <div className="mt-10">
                <LoadingSpinner message={currentLoadingMessage} />
              </div>
            )}

            {error && !isLoading && !isSpecificItemsLoading && (
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
                  identifiedBrand={analysis.identifiedBrand}
                  brandIsExplicit={analysis.brandIsExplicit}
                  approximatedBrands={analysis.approximatedBrands}
                  alternativeBrands={analysis.alternativeBrands}
                  similarItems={analysis.similarItems}
                  isSpecificItemsLoading={isSpecificItemsLoading}
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
      {showDebugPanel && <DebugPanel logs={logs} />}
    </div>
  );
}

    