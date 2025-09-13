"use client";

import { useState, useCallback, useEffect } from 'react';
import ClosetUpload from '@/components/style-seer/ClosetUpload';
import { Button } from '@/components/ui/button';
import LoadingSpinner from '@/components/style-seer/LoadingSpinner';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from 'lucide-react';
import { analyzeClothingImage, AnalyzeClothingImageOutput } from '@/ai/flows/analyze-clothing-image';
import { ClosetAnalysisResult } from '@/ai/flows/types';
import ClosetAnalysisResults from './ClosetAnalysisResults';
import { findClosetRecommendations } from '@/ai/flows/find-closet-recommendations';
import { SimilarItem } from '@/ai/flows/types';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { getCurrencyByCountry } from '@/utils/currency';
import ClosetRecommendations from './ClosetRecommendations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import SearchHistory from './SearchHistory';
import { History as HistoryIcon } from 'lucide-react';


export type ClosetHistoryEntry = {
  id: string;
  timestamp: Date;
  imageUris: string[];
  analysisResult: ClosetAnalysisResult;
};

const CLOSET_LOCAL_STORAGE_KEY = 'closetSeerSearchHistory';
const CLOSET_HISTORY_PREFERENCE_KEY = 'closetSeerSaveHistoryPreference';

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

export default function ClosetMode() {
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<ClosetAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recommendedItems, setRecommendedItems] = useState<SimilarItem[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [recommendationError, setRecommendationError] = useState<string | null>(null);
  const [currentLoadingMessage, setCurrentLoadingMessage] = useState("Analyzing image...");
  const [country, setCountry] = useState('United States');
  const [genderDepartment, setGenderDepartment] = useState<'Male' | 'Female' | 'Unisex' | 'Auto'>('Auto');
  const [minPrice, setMinPrice] = useState(1);
  const [maxPrice, setMaxPrice] = useState(5000);
  const [currency, setCurrency] = useState('USD');
  const [closetHistory, setClosetHistory] = useState<ClosetHistoryEntry[]>([]);
  const [saveClosetHistoryPreference, setSaveClosetHistoryPreference] = useState<boolean>(false);

  useEffect(() => {
    setCurrency(getCurrencyByCountry(country));
  }, [country]);

  useEffect(() => {
    try {
      const storedPreference = localStorage.getItem(CLOSET_HISTORY_PREFERENCE_KEY);
      const save = storedPreference === 'true';
      setSaveClosetHistoryPreference(save);

      if (save) {
        const storedHistory = localStorage.getItem(CLOSET_LOCAL_STORAGE_KEY);
        if (storedHistory) {
          const parsedHistory = JSON.parse(storedHistory);
          if (Array.isArray(parsedHistory)) {
            setClosetHistory(parsedHistory);
          }
        }
      }
    } catch (e) {
      console.error("Failed to load closet history from localStorage:", e);
    }
  }, []);

  useEffect(() => {
    if (saveClosetHistoryPreference) {
      localStorage.setItem(CLOSET_LOCAL_STORAGE_KEY, JSON.stringify(closetHistory));
    } else {
      localStorage.removeItem(CLOSET_LOCAL_STORAGE_KEY);
    }
    localStorage.setItem(CLOSET_HISTORY_PREFERENCE_KEY, String(saveClosetHistoryPreference));
  }, [closetHistory, saveClosetHistoryPreference]);

  const handleMinPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
        const newMinPrice = Math.max(0.01, value);
        setMinPrice(newMinPrice);
        if (maxPrice < newMinPrice) {
            setMaxPrice(newMinPrice);
        }
    }
  };

  const handleSaveClosetHistoryPreferenceChange = (checked: boolean | 'indeterminate') => {
    if (typeof checked === 'boolean') {
      setSaveClosetHistoryPreference(checked);
      if (!checked) {
        setClosetHistory([]);
      }
    }
  };

  const handleSelectClosetHistoryItem = (entry: ClosetHistoryEntry) => {
    // TODO: Implement logic to restore state from history
    console.log("Selected history item:", entry);
    setImageUris(entry.imageUris);
    setAnalysis(entry.analysisResult);
    setRecommendedItems([]);
    setRecommendationError(null);
  };

  const sliderMax = minPrice > 1 ? minPrice * 100 : 9000;

  const handleImagesUpload = useCallback((dataUris: string[]) => {
    setImageUris(dataUris);
    // Reset analysis when images change
    setAnalysis(null);
    setError(null);
  }, []);

  const handleFindRecommendations = async (analysisResult: ClosetAnalysisResult) => {
    setIsLoadingRecommendations(true);
    setRecommendationError(null);
    setRecommendedItems([]);

    try {
        const result = await findClosetRecommendations({
            dominantClothingItems: analysisResult.dominantClothingItems.map(i => i.item),
            targetBrandNames: analysisResult.recommendedBrands,
            country: country,
            minPrice: minPrice,
            maxPrice: maxPrice,
            gender: genderDepartment,
        });

        if (result && result.recommendedItems) {
            setRecommendedItems(result.recommendedItems);
        } else {
            setRecommendationError("Could not fetch recommendations for your closet.");
        }
    } catch (e: any) {
        console.error("Recommendation fetching error:", e);
        setRecommendationError(`An error occurred while fetching recommendations: ${e.message}`);
    } finally {
        setIsLoadingRecommendations(false);
    }
  };

  const handleAnalyzeCloset = async () => {
    if (imageUris.length === 0) {
      setError("Please upload at least one image to analyze.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysis(null);
    setRecommendedItems([]);
    setRecommendationError(null);

    try {
      const analysisResults: AnalyzeClothingImageOutput[] = [];
      for (const uri of imageUris) {
        // Update loading message for user feedback
        setCurrentLoadingMessage(`Analyzing image ${analysisResults.length + 1} of ${imageUris.length}...`);
        const result = await analyzeClothingImage({
          photoDataUri: uri,
          country: country,
          genderDepartment: genderDepartment,
        });
        if (result) {
          analysisResults.push(result);
        }
      }

      if (analysisResults.length === 0) {
        throw new Error("Could not analyze any of the images.");
      }

      // Aggregation logic moved from backend to frontend
      setCurrentLoadingMessage("Aggregating results...");
      const clothingItemsCount: Record<string, number> = {};
      const stylesCount: Record<string, number> = {};
      const allRecommendedBrands = new Set<string>();

      analysisResults.forEach(result => {
          result.clothingItems.forEach(item => {
              clothingItemsCount[item] = (clothingItemsCount[item] || 0) + 1;
          });
          result.styles.forEach(style => {
              stylesCount[style] = (stylesCount[style] || 0) + 1;
          });
          result.approximatedBrands.forEach(brand => allRecommendedBrands.add(brand));
          result.alternativeBrands.forEach(brand => allRecommendedBrands.add(brand));
          if (result.identifiedBrand) {
              allRecommendedBrands.add(result.identifiedBrand);
          }
      });

      const sortedClothingItems = Object.entries(clothingItemsCount)
          .sort((a, b) => b[1] - a[1])
          .map(([item, count]) => ({ item, count }));

      const sortedStyles = Object.entries(stylesCount)
          .sort((a, b) => b[1] - a[1])
          .map(([style, count]) => ({ style, count }));

      const recommendedBrands = Array.from(allRecommendedBrands);

      const aggregatedResult: ClosetAnalysisResult = {
          dominantClothingItems: sortedClothingItems.slice(0, 5),
          dominantStyles: sortedStyles.slice(0, 5),
          recommendedBrands: recommendedBrands.slice(0, 10),
      };

      setAnalysis(aggregatedResult);

      if (aggregatedResult.recommendedBrands.length > 0) {
          setCurrentLoadingMessage("Finding recommendations...");
          await handleFindRecommendations(aggregatedResult);
      }

      if (saveClosetHistoryPreference) {
        const newEntry: ClosetHistoryEntry = {
            id: new Date().toISOString() + Math.random(),
            timestamp: new Date(),
            imageUris: imageUris,
            analysisResult: aggregatedResult,
        };
        setClosetHistory(prevHistory => [newEntry, ...prevHistory].slice(0, 10));
      }

    } catch (e: any) {
      console.error("Closet Analysis Error:", e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      setError(`An error occurred during closet analysis: ${errorMessage}`);
    } finally {
      setIsLoading(false);
      setCurrentLoadingMessage("Analyzing image..."); // Reset message
    }
  };

  return (
    <div className="flex flex-1 overflow-hidden h-full">
        <aside className="w-72 md:w-80 lg:w-96 flex-shrink-0 border-r border-border/60 bg-card p-4 hidden md:flex flex-col overflow-y-auto">
            <Card className="flex-1 flex flex-col overflow-hidden shadow-md">
            <CardHeader className="pb-3 pt-4 px-4 flex flex-row justify-between items-center">
                <CardTitle className="flex items-center text-xl gap-2">
                <HistoryIcon size={22} className="text-primary" />
                Closet History
                </CardTitle>
                <div className="flex items-center space-x-2">
                <Checkbox
                    id="save-closet-history-checkbox"
                    checked={saveClosetHistoryPreference}
                    onCheckedChange={handleSaveClosetHistoryPreferenceChange}
                    aria-label="Save closet history for next session"
                />
                <Label htmlFor="save-closet-history-checkbox" className="text-xs font-normal text-muted-foreground cursor-pointer select-none">
                    Save for next session
                </Label>
                </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto">
                <ScrollArea className="h-full">
                <div className="p-4 pt-0">
                <SearchHistory history={closetHistory as any} onSelectHistoryItem={handleSelectClosetHistoryItem as any} />
                </div>
                </ScrollArea>
            </CardContent>
            </Card>
        </aside>

        <main className="flex-1 flex flex-col overflow-y-auto">
            <div className="container mx-auto px-4 py-8 md:py-12 flex-grow">
                <div className="flex flex-col items-center">
                    <h2 className="text-2xl font-bold tracking-tight mb-4">Your Virtual Closet</h2>
                    <p className="text-muted-foreground mb-8 max-w-2xl text-center">
                      Upload images of your clothes, and we'll analyze your style to recommend matching items from your favorite brands.
                    </p>

                    <div className="w-full max-w-sm space-y-4 mb-8">
                        <div>
                            <Label htmlFor="country-select" className="text-sm font-medium text-muted-foreground">Country of Residence</Label>
                            <Select value={country} onValueChange={setCountry}>
                                <SelectTrigger id="country-select" className="mt-1"><SelectValue placeholder="Select a country" /></SelectTrigger>
                                <SelectContent>{topCountries.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent>
                            </Select>
                        </div>
                        <div>
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
                        <div>
                            <Label className="text-sm font-medium text-muted-foreground">Price Range</Label>
                            <div className="flex items-center gap-4 mt-1">
                                <Input id="min-price-input" type="number" step="0.01" value={minPrice} onChange={handleMinPriceChange} placeholder="Min $" className="w-24 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"/>
                                <div className="flex-1">
                                  <div className="flex justify-between text-xs text-muted-foreground"><span>${minPrice.toFixed(2)}</span><span>${maxPrice.toFixed(2)}</span></div>
                                  <Slider id="price-range-slider" min={minPrice} max={sliderMax} step={0.01} value={[maxPrice]} onValueChange={(value: number[]) => setMaxPrice(value[0])} className="mt-1"/>
                                </div>
                            </div>
                        </div>
                    </div>

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
            <LoadingSpinner message={currentLoadingMessage} />
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

                    <div className="w-full max-w-6xl px-4 mt-8">
                        <ClosetRecommendations
                            items={recommendedItems}
                            isLoading={isLoadingRecommendations}
                            error={recommendationError}
                        />
                    </div>
                </div>
            </div>
            <footer className="text-center py-8 border-t border-border/60 mt-auto">
                <p className="text-sm text-muted-foreground">StyleSeer &copy; {new Date().getFullYear()} - Your AI Fashion Assistant.</p>
            </footer>
        </main>
    </div>
  );
}
