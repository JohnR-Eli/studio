
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
import { findComplementaryItems, ComplementaryItem, FindComplementaryItemsOutput } from '@/ai/flows/find-complementary-items';
import { findSimilarItems, FindSimilarItemsOutput } from '@/ai/flows/find-similar-items';
import { AlertCircle, RotateCcw, History as HistoryIcon, FileText, ShoppingBag } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import DebugPanel from '@/components/style-seer/DebugPanel';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BackendLogs from '@/components/style-seer/BackendLogs';


const AnalysisResults = dynamic(() => import('@/components/style-seer/AnalysisResults'), {
  loading: () => <div className="mt-10"><LoadingSpinner message="Loading results area..." /></div>,
  ssr: false
});

type SimilarItem = FindSimilarItemsOutput['similarItems'][0] & { imageURL?: string };

type AnalysisState = Omit<AnalyzeClothingImageOutput, 'brandIsExplicit'> & 
                     Partial<Pick<AnalyzeClothingImageOutput, 'identifiedBrand' | 'brandIsExplicit' | 'approximatedBrands' | 'alternativeBrands'>> & {
  similarItems?: SimilarItem[];
  complementaryItems?: ComplementaryItem[];
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
  flow: 'analyzeClothingImage' | 'findSimilarItems' | 'findComplementaryItems' | 'callExternalApi';
  data: any;
};

const MAX_HISTORY_ITEMS = 10;
const LOCAL_STORAGE_KEY = 'fittedToolSearchHistory';
const HISTORY_PREFERENCE_KEY = 'fittedToolSaveHistoryPreference';

const topCountries = [
    "United States",
    "United Kingdom",
    "Germany",
    "Canada",
    "South Africa",
    "Netherlands",
    "Mexico",
    "Pakistan",
    "Nigeria",
    "Philippines"
];

export default function StyleSeerPage() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSimilarItems, setIsLoadingSimilarItems] = useState(false);
  const [isLoadingComplementaryItems, setIsLoadingComplementaryItems] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentLoadingMessage, setCurrentLoadingMessage] = useState("Analyzing image...");
  const [searchHistory, setSearchHistory] = useState<HistoryEntry[]>([]);
  const [saveHistoryPreference, setSaveHistoryPreference] = useState<boolean>(false);
  const [country, setCountry] = useState('United States');
  const [genderDepartment, setGenderDepartment] = useState<'Male' | 'Female' | 'Unisex' | 'Auto'>('Auto');
  const [numSimilarItems, setNumSimilarItems] = useState(5);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [maxPrice, setMaxPrice] = useState(5000);
  const [activeTab, setActiveTab] = useState("recommendations");
  const [includeLingerie, setIncludeLingerie] = useState(false);


  const addLog = useCallback((log: Omit<LogEntry, 'id' | 'timestamp'> | Omit<LogEntry, 'id' | 'timestamp'>[]) => {
    const logsToAdd = Array.isArray(log) ? log : [log];
    const newLogs = logsToAdd.map(l => ({
        id: new Date().toISOString() + Math.random(),
        timestamp: new Date().toISOString(),
        ...l
    }));
    setLogs(prev => [...prev, ...newLogs]);
  }, []);

  const handleBrandSelect = useCallback(async (brandName: string, category: string, gender: 'Male' | 'Female' | 'Unisex', photoDataUri: string, clothingItems: string[]) => {
    setIsLoadingSimilarItems(true);
    setCurrentLoadingMessage(`Searching for ${category} from ${brandName}...`);

    const inputPayload = {
      photoDataUri: photoDataUri.substring(0, 50) + '...',
      clothingItem: category,
      targetBrandName: brandName,
      country,
      numSimilarItems,
      maxPrice,
      gender,
    };
    addLog({ event: 'invoke', flow: 'findSimilarItems', data: inputPayload });

    try {
      const result = await findSimilarItems({
        photoDataUri,
        clothingItem: category,
        targetBrandName: brandName,
        country,
        numSimilarItems,
        maxPrice,
        gender,
      });

      if (result.logs) {
        addLog(result.logs);
      }
      
      const newSimilarItems = result.similarItems.map(item => ({ ...item, imageURL: item.imageURL || 'https://placehold.co/400x500.png' }));


      setAnalysis(prevAnalysis => ({
        ...prevAnalysis!,
        similarItems: newSimilarItems,
      }));

      addLog({ event: 'response', flow: 'findSimilarItems', data: { similarItems: newSimilarItems } });
      setError(null);

      if (newSimilarItems.length > 0) {
        setIsLoadingComplementaryItems(true);
        setCurrentLoadingMessage("Searching for complementary items...");
        const compInput = {
            originalClothingCategories: clothingItems,
            gender: gender,
            country: country,
            numItemsPerCategory: numSimilarItems,
            // Only include lingerie if the USER selected Female, not if the AI detected it.
            includeLingerie: includeLingerie && genderDepartment === 'Female',
        };
        addLog({ event: 'invoke', flow: 'findComplementaryItems', data: compInput });
        findComplementaryItems(compInput).then(compResult => {
            if (compResult.logs) {
              addLog(compResult.logs);
            }
            addLog({ event: 'response', flow: 'findComplementaryItems', data: { complementaryItems: compResult.complementaryItems } });
            setAnalysis(prev => prev ? ({ ...prev, complementaryItems: compResult.complementaryItems }) : null);
        }).catch(e => {
            addLog({ event: 'error', flow: 'findComplementaryItems', data: e.message });
        }).finally(() => {
            setIsLoadingComplementaryItems(false);
        });
      }

    } catch (e: any) {
      addLog({ event: 'error', flow: 'findSimilarItems', data: e.message });
      console.error(`Error fetching items for brand ${brandName}:`, e);
      const errorMessage = e instanceof Error ? e.message : String(e) || "An unknown error occurred.";
      setError(`Could not fetch items for ${brandName}: ${errorMessage}`);
      setAnalysis(prevAnalysis => ({
        ...prevAnalysis!,
        similarItems: [],
      }));
    } finally {
      setIsLoadingSimilarItems(false);
      setCurrentLoadingMessage("Analysis complete.");
    }
  }, [country, numSimilarItems, addLog, maxPrice, includeLingerie, genderDepartment]);

  const handleImageUpload = useCallback(async (dataUri: string) => {
    if (!dataUri) {
      setImageUri(null);
      setAnalysis(null);
      setError(null);
      setIsLoading(false);
      setIsLoadingSimilarItems(false);
      setIsLoadingComplementaryItems(false);
      setCurrentLoadingMessage("Analyzing image...");
      return;
    }

    setImageUri(dataUri);
    setAnalysis(null);
    setError(null);
    setIsLoading(true);
    setIsLoadingSimilarItems(false);
    setIsLoadingComplementaryItems(false);
    setCurrentLoadingMessage("Analyzing image details...");
    setLogs([]);

    const inputPayload = { 
      photoDataUri: dataUri.substring(0, 50) + '...',
      genderDepartment,
      includeLingerie: includeLingerie && genderDepartment === 'Female',
    };
    addLog({ event: 'invoke', flow: 'analyzeClothingImage', data: inputPayload });

    try {
      const clothingAnalysisResult = await analyzeClothingImage({ 
        photoDataUri: dataUri, 
        genderDepartment,
        includeLingerie: includeLingerie && genderDepartment === 'Female',
      });
      addLog({ event: 'response', flow: 'analyzeClothingImage', data: clothingAnalysisResult || "No result" });

      if (clothingAnalysisResult) {
        const determinedGender = clothingAnalysisResult.genderDepartment;
        
        setCurrentLoadingMessage("Image analysis complete. Finding recommendations...");
        const currentAnalysis: AnalysisState = {
          ...clothingAnalysisResult, 
          similarItems: [], 
          complementaryItems: [],
        };
        setAnalysis(currentAnalysis);
        
        const brandToFetch = (clothingAnalysisResult.identifiedBrand && clothingAnalysisResult.identifiedBrand !== "null") 
            ? clothingAnalysisResult.identifiedBrand 
            : (clothingAnalysisResult.approximatedBrands && clothingAnalysisResult.approximatedBrands[0]);


        if (brandToFetch && clothingAnalysisResult.clothingItems.length > 0) {
            handleBrandSelect(brandToFetch, clothingAnalysisResult.clothingItems[0], determinedGender, dataUri, clothingAnalysisResult.clothingItems);
        }

        const { similarItems, complementaryItems, ...historyAnalysisData } = currentAnalysis;
        
        if (Object.values(historyAnalysisData).some(val => Array.isArray(val) ? val.length > 0 : !!val)) {
            const newEntry: HistoryEntry = {
                id: new Date().toISOString() + Math.random(),
                timestamp: new Date(),
                imageUri: dataUri, 
                analysisResult: historyAnalysisData,
            };
            setSearchHistory(prevHistory => {
                const updatedHistory = [newEntry, ...prevHistory.filter(item => item.id !== newEntry.id)];
                return updatedHistory.slice(0, MAX_HISTORY_ITEMS);
            });
        }

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
  }, [addLog, country, numSimilarItems, handleBrandSelect, genderDepartment, maxPrice, includeLingerie]);

  useEffect(() => {
    try {
      const storedPreference = localStorage.getItem(HISTORY_PREFERENCE_KEY);
      const save = storedPreference === 'true';
      setSaveHistoryPreference(save);

      if (save) {
        const storedHistory = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (storedHistory) {
          const parsedHistory = JSON.parse(storedHistory);
          if (Array.isArray(parsedHistory)) {
            setSearchHistory(parsedHistory.map((item: any) => ({ ...item, imageUri: undefined })));
          }
        }
      }
    } catch (e) {
      console.error("Failed to load history from localStorage:", e);
    }
  }, []);
  
  useEffect(() => {
    if (genderDepartment !== 'Female') {
      setIncludeLingerie(false);
    }
  }, [genderDepartment]);


  const handleReset = useCallback(() => {
    setImageUri(null);
    setAnalysis(null);
    setError(null);
    setIsLoading(false);
    setIsLoadingSimilarItems(false);
    setIsLoadingComplementaryItems(false);
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
    setIsLoadingSimilarItems(false);
    setIsLoadingComplementaryItems(false);
    setError(null);
    setLogs([]);
  }, []);

  const handleSaveHistoryPreferenceChange = (checked: boolean | 'indeterminate') => {
    if (typeof checked === 'boolean') {
      setSaveHistoryPreference(checked);
      if (!checked) {
        setSearchHistory([]);
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      }
    }
  };

  const handleNumItemsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value > 0) {
      setNumSimilarItems(value);
    }
  };
  
  const toggleDebugPanel = () => {
    setShowDebugPanel(prev => !prev);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header onIconClick={toggleDebugPanel} />
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="w-full">
            <TabsTrigger value="recommendations" className="flex-1">
                <ShoppingBag size={18} className="mr-2" />
                Recommendations
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex-1">
                <FileText size={18} className="mr-2" />
                Backend Logs
            </TabsTrigger>
        </TabsList>
        <TabsContent value="recommendations" className="flex-1 overflow-y-auto">
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
                                <Label htmlFor="country-select" className="text-sm font-medium text-muted-foreground">Country of Residence</Label>
                                <Select value={country} onValueChange={setCountry}>
                                    <SelectTrigger id="country-select" className="mt-1"><SelectValue placeholder="Select a country" /></SelectTrigger>
                                    <SelectContent>{topCountries.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent>
                                </Select>
                            </div>
                            <div className="mt-4 w-full max-w-sm">
                                <Label htmlFor="gender-select" className="text-sm font-medium text-muted-foreground">Gender Department</Label>
                                <Select value={genderDepartment} onValueChange={(value) => setGenderDepartment(value as 'Male' | 'Female' | 'Unisex' | 'Auto')}>
                                    <SelectTrigger id="gender-select" className="mt-1"><SelectValue placeholder="Select a department" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Auto">Auto</SelectItem>
                                        <SelectItem value="Male">Male</SelectItem>
                                        <SelectItem value="Female">Female</SelectItem>
                                        <SelectItem value="Unisex">Unisex</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {genderDepartment === 'Female' && (
                                <div className="mt-4 w-full max-w-sm flex items-center space-x-2">
                                    <Checkbox id="lingerie-checkbox" checked={includeLingerie} onCheckedChange={(checked) => setIncludeLingerie(!!checked)} />
                                    <Label htmlFor="lingerie-checkbox" className="text-sm font-medium text-muted-foreground cursor-pointer">Include lingerie?</Label>
                                </div>
                            )}
                            <div className="mt-4 w-full max-w-sm">
                                <Label htmlFor="num-items-input" className="text-sm font-medium text-muted-foreground">Number of Similar Items</Label>
                                <Input id="num-items-input" type="number" value={numSimilarItems} onChange={handleNumItemsChange} placeholder="e.g., 5" className="mt-1"/>
                            </div>
                            <div className="mt-4 w-full max-w-sm">
                                <Label htmlFor="price-range-slider" className="text-sm font-medium text-muted-foreground">Max Price: ${maxPrice}</Label>
                                <Slider id="price-range-slider" min={1} max={5000} step={10} value={[maxPrice]} onValueChange={(value: number[]) => setMaxPrice(value[0])} className="mt-2"/>
                            </div>
                        </div>
                        )}

                        {isLoading && (<div className="mt-10"><LoadingSpinner message={currentLoadingMessage} /></div>)}

                        {error && !isLoading && (
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
                            complementaryItems={analysis.complementaryItems}
                            isLoadingSimilarItems={isLoadingSimilarItems}
                            isLoadingComplementaryItems={isLoadingComplementaryItems}
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
                        <p className="text-sm text-muted-foreground">Fitted Tool &copy; {new Date().getFullYear()} - Your AI Fashion Assistant.</p>
                    </footer>
                </main>
            </div>
        </TabsContent>
        <TabsContent value="logs" className="flex-1 overflow-y-auto">
            <BackendLogs logs={logs} />
        </TabsContent>
      </Tabs>
      {showDebugPanel && <DebugPanel logs={logs} />}
    </div>
  );
}

    