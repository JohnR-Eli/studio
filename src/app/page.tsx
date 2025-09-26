
"use client";

import { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import ImageUpload from '@/components/style-seer/ImageUpload';
import WardrobeTable, { WardrobeItem } from '@/components/style-seer/WardrobeTable';
import ImageWardrobe from '@/components/style-seer/ImageWardrobe';
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
import { Switch } from "@/components/ui/switch";
import DebugPanel from '@/components/style-seer/DebugPanel';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BackendLogs from '@/components/style-seer/BackendLogs';
import { getCurrencyByCountry } from '@/utils/currency';


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
const LOCAL_STORAGE_KEY = 'styleSeerSearchHistory';
const HISTORY_PREFERENCE_KEY = 'styleSeerSaveHistoryPreference';

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

const preferredBrands = [
    "Allbirds", "Allbirds AU", "Allbirds NZ", "Backcountry", "Belstaff", "Belstaff (Europe)", "Belstaff UK",
    "Bloomingdale", "Bloomingdale AU", "Bloomingdale UK", "Champion.com (Hanesbrands Inc.)", "Culture Kings",
    "Culture Kings US", "D1 Milano", "Dynamite Clothing", "Fanatics", "Fanatics UK", "Fabletics Europe",
    "Fabletics eur", "Fabletics uk", "FEATURE", "Flag & Anthem", "FootJoy", "GOLF le Fleur", "Garage Clothing",
    "JanSport", "Kappa", "Kut from the Kloth", "LUISAVIAROMA", "Luxury Closet", "Luxury Closet eur",
    "Luxury Closet uk", "MLB", "MLB AU", "MLB CA", "MLB UK", "MLS", "MLS CA", "MYTHERESA", "MYTHERESA au",
    "MYTHERESA ca", "MYTHERESA eur", "MYTHERESA uk", "Mytheresa", "NBA", "NBA AU", "NBA CA", "NBA UK",
    "NFL", "NFL CA", "NFL UK", "NHL", "NHL CA", "NHL UK", "NIKE", "Nisolo", "North Face UK", "North Face uk",
    "Osprey", "PGA", "PUMA", "PUMA India", "PUMA Thailand", "Poshmark", "SKECHERS eur", "Skechers",
    "Street Machine Skate", "Taylor Stitch", "The Double F", "UGG", "UGG US", "Unique Vintage", "WNBA"
];
  
const lingerieBrands = [
    "Savage x Fenty", "The Tight Spot", "The Tight Spot ca", "The Tight Spot eur", "The Tight Spot uk", "The Tight Spot au",
    "Maidenform", "Bali Bras", "onehanesplace"
];

const clothingCategories = [
    "Tops", "Bottoms", "Footwear", "Accessories", "Activewear", "Outerwear", 
    "Sweaters", "T-Shirts", "Jeans", "Pants", "Shoes", "Hats"
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
  const [currency, setCurrency] = useState('USD');
  const [genderDepartment, setGenderDepartment] = useState<'Male' | 'Female' | 'Unisex' | 'Auto'>('Auto');
  const [selectedBrand, setSelectedBrand] = useState('Auto');
  const [numSimilarItems, setNumSimilarItems] = useState(5);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [minPrice, setMinPrice] = useState(1);
  const [maxPrice, setMaxPrice] = useState(5000);
  const [activeTab, setActiveTab] = useState("recommendations");
  const [includeLingerie, setIncludeLingerie] = useState(false);
  const [availableBrands, setAvailableBrands] = useState(preferredBrands);
  const [selectedCategory, setSelectedCategory] = useState('Auto');
  const [mode, setMode] = useState<'single' | 'wardrobe'>('single');
  const [wardrobeInputMode, setWardrobeInputMode] = useState<'text' | 'image'>('text');
  const [wardrobe, setWardrobe] = useState<WardrobeItem[]>([{ category: '', brand: '' }]);
  const [imageAnalysisResults, setImageAnalysisResults] = useState<any[]>([]);


  const addLog = useCallback((log: Omit<LogEntry, 'id' | 'timestamp'> | Omit<LogEntry, 'id' | 'timestamp'>[]) => {
    const logsToAdd = Array.isArray(log) ? log : [log];
    const newLogs = logsToAdd.map(l => ({
        id: new Date().toISOString() + Math.random(),
        timestamp: new Date().toISOString(),
        ...l
    }));
    setLogs(prev => [...prev, ...newLogs]);
  }, []);

  const handleBrandSelect = useCallback(async (brands: string[], category: string, gender: 'Male' | 'Female' | 'Unisex', photoDataUri: string, clothingItems: string[]) => {
    setIsLoadingSimilarItems(true);
    setCurrentLoadingMessage(`Searching for items from recommended brands...`);

    const inputPayload = {
      photoDataUri: photoDataUri.substring(0, 50) + '...',
      clothingItem: category,
      targetBrandNames: brands,
      country,
      numSimilarItems,
      minPrice,
      maxPrice,
      gender,
      userProvidedCategory: selectedCategory !== 'Auto' ? selectedCategory : undefined,
    };
    addLog({ event: 'invoke', flow: 'findSimilarItems', data: inputPayload });

    try {
      const result = await findSimilarItems({
        photoDataUri,
        clothingItem: category,
        targetBrandNames: brands,
        country,
        numSimilarItems,
        minPrice,
        maxPrice,
        gender,
        userProvidedCategory: selectedCategory !== 'Auto' ? selectedCategory : undefined,
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
            minPrice: minPrice,
            maxPrice: maxPrice,
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
      console.error(`Error fetching items for brands ${brands.join(', ')}:`, e);
      const errorMessage = e instanceof Error ? e.message : String(e) || "An unknown error occurred.";
      setError(`Could not fetch items: ${errorMessage}`);
      setAnalysis(prevAnalysis => ({
        ...prevAnalysis!,
        similarItems: [],
      }));
    } finally {
      setIsLoadingSimilarItems(false);
      setCurrentLoadingMessage("Analysis complete.");
    }
  }, [country, numSimilarItems, addLog, minPrice, maxPrice, includeLingerie, genderDepartment, selectedCategory]);

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
      country,
    };
    addLog({ event: 'invoke', flow: 'analyzeClothingImage', data: inputPayload });

    try {
      const clothingAnalysisResult = await analyzeClothingImage({ 
        photoDataUri: dataUri, 
        genderDepartment,
        includeLingerie: includeLingerie && genderDepartment === 'Female',
        country,
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
        
        let brandsToFetch: string[] = [];
        if (selectedBrand !== 'Auto') {
            brandsToFetch = [selectedBrand];
        } else {
            const identified = (clothingAnalysisResult.identifiedBrand && clothingAnalysisResult.identifiedBrand !== "null") ? [clothingAnalysisResult.identifiedBrand] : [];
            const approximated = clothingAnalysisResult.approximatedBrands || [];
            const alternative = clothingAnalysisResult.alternativeBrands || [];
            brandsToFetch = [...new Set([...identified, ...approximated, ...alternative])];
        }

        const categoryToUse = selectedCategory !== 'Auto'
            ? selectedCategory
            : (clothingAnalysisResult.clothingItems.length > 0 ? clothingAnalysisResult.clothingItems[0] : 'Tops');

        if (brandsToFetch.length > 0) {
            handleBrandSelect(brandsToFetch, categoryToUse, determinedGender, dataUri, clothingAnalysisResult.clothingItems);
        } else {
            // If no brands were recommended, we need to stop the loading spinners.
            setIsLoadingSimilarItems(false);
            setIsLoadingComplementaryItems(false);
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
  }, [addLog, country, numSimilarItems, handleBrandSelect, genderDepartment, minPrice, maxPrice, includeLingerie, selectedBrand, selectedCategory]);

  const handleWardrobeAnalysisRecommendation = useCallback(async (results: any[]) => {
    if (results.length === 0) {
        setError("No items to analyze for recommendations.");
        return;
    }

    setIsLoading(true);
    setCurrentLoadingMessage("Analyzing wardrobe for recommendations...");

    try {
      const categoryCounts = results.reduce((acc: Record<string, number>, result) => {
        const category = result.category;
        if (category && category !== 'Unknown' && category !== 'Analysis Failed') {
          acc[category] = (acc[category] || 0) + 1;
        }
        return acc;
      }, {});

      const sortedEntries = Object.entries(categoryCounts).sort(([, a], [, b]) => b - a);

      let categoriesToSearch: string[];
      let itemsPerCategory: number;

      const thresholdMet = sortedEntries.length > 0 && sortedEntries[0][1] >= 3;

      if (thresholdMet) {
        categoriesToSearch = sortedEntries.slice(0, 3).map(([category]) => category);
        itemsPerCategory = 5;
      } else {
        categoriesToSearch = sortedEntries.map(([category]) => category);
        itemsPerCategory = 3;
      }

      if (categoriesToSearch.length === 0) {
        setError("Could not determine any valid categories from the uploaded images.");
        setIsLoading(false);
        return;
      }

      const initialAnalysis: AnalysisState = {
          clothingItems: categoriesToSearch,
          genderDepartment: genderDepartment === 'Auto' ? 'Unisex' : genderDepartment,
          similarItems: [],
          complementaryItems: [],
          approximatedBrands: [],
          alternativeBrands: [],
      };
      setAnalysis(initialAnalysis);

      // Fetch Similar Items ("Shop the Look")
      setIsLoadingSimilarItems(true);
      const recommendationPromises = categoriesToSearch.map(category =>
        findSimilarItems({
          isWardrobeFlow: true,
          wardrobe: [{ category: category, brand: '' }], // Simulate a wardrobe with one item
          country,
          numSimilarItems: itemsPerCategory,
          gender: genderDepartment === 'Auto' ? 'Unisex' : genderDepartment,
        })
      );
      const recommendationResults = await Promise.all(recommendationPromises);
      const allSimilarItems = recommendationResults.flatMap(result =>
          result.similarItems.map(item => ({ ...item, imageURL: item.imageURL || 'https://placehold.co/400x500.png' }))
      );
      setAnalysis(prev => prev ? { ...prev, similarItems: allSimilarItems } : null);
      setIsLoadingSimilarItems(false);

      // Fetch Complementary Items ("Complete the Look")
      setIsLoadingComplementaryItems(true);
      const complementaryResult = await findComplementaryItems({
          originalClothingCategories: categoriesToSearch,
          gender: genderDepartment === 'Auto' ? 'Unisex' : genderDepartment,
          country,
          numItemsPerCategory: 2,
      });
      setAnalysis(prev => prev ? { ...prev, complementaryItems: complementaryResult.complementaryItems } : null);

    } catch (e: any) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      setError(`Could not fetch recommendations: ${errorMessage}`);
    } finally {
      setIsLoading(false);
      setIsLoadingSimilarItems(false);
      setIsLoadingComplementaryItems(false);
    }
  }, [country, genderDepartment, setAnalysis, setError, setIsLoading, setCurrentLoadingMessage, setIsLoadingSimilarItems, setIsLoadingComplementaryItems]);

  const handleWardrobeRecommendation = useCallback(async () => {
    const validWardrobeItems = wardrobe.filter(item => item.category.trim() !== '' && item.brand.trim() !== '');
    if (validWardrobeItems.length === 0) {
      setError("Wardrobe is empty. Please add items to get a recommendation.");
      return;
    }

    setAnalysis(null);
    setError(null);
    setIsLoading(true);
    setIsLoadingSimilarItems(true);
    setIsLoadingComplementaryItems(false);
    setCurrentLoadingMessage("Getting recommendations for your wardrobe...");
    setLogs([]);

    const determinedGender = genderDepartment === 'Auto' ? 'Unisex' : genderDepartment;

    const inputPayload = {
      isWardrobeFlow: true,
      wardrobe: validWardrobeItems,
      country,
      numSimilarItems,
      minPrice,
      maxPrice,
      gender: determinedGender,
    } as const;
    addLog({ event: 'invoke', flow: 'findSimilarItems', data: inputPayload });

    try {
      const result = await findSimilarItems(inputPayload);

      if (result.logs) {
        addLog(result.logs);
      }

      const newSimilarItems = result.similarItems.map(item => ({ ...item, imageURL: item.imageURL || 'https://placehold.co/400x500.png' }));

      const currentAnalysis: AnalysisState = {
        clothingItems: result.clothingItems || [],
        genderDepartment: determinedGender,
        similarItems: newSimilarItems,
        approximatedBrands: [],
        alternativeBrands: [],
      };
      setAnalysis(currentAnalysis);

      addLog({ event: 'response', flow: 'findSimilarItems', data: { similarItems: newSimilarItems } });
      setError(null);

      if (newSimilarItems.length > 0 && result.category) {
        setIsLoadingComplementaryItems(true);
        setCurrentLoadingMessage("Searching for complementary items...");
        const compInput = {
            isWardrobeFlow: true,
            category: result.category,
            gender: determinedGender,
            country: country,
            numItemsPerCategory: numSimilarItems,
            minPrice: minPrice,
            maxPrice: maxPrice,
            includeLingerie: includeLingerie && genderDepartment === 'Female',
        } as const;
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
      } else {
        setIsLoadingComplementaryItems(false);
      }
    } catch (e: any) {
      addLog({ event: 'error', flow: 'findSimilarItems', data: e.message });
      console.error(`Error fetching wardrobe recommendations:`, e);
      const errorMessage = e instanceof Error ? e.message : String(e) || "An unknown error occurred.";
      setError(`Could not fetch recommendations: ${errorMessage}`);
      setAnalysis(null);
    } finally {
      setIsLoading(false);
      setIsLoadingSimilarItems(false);
    }
  }, [wardrobe, country, numSimilarItems, addLog, minPrice, maxPrice, includeLingerie, genderDepartment]);

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
    if (genderDepartment === 'Female' && includeLingerie) {
      setAvailableBrands([...preferredBrands, ...lingerieBrands].sort());
    } else {
      setAvailableBrands(preferredBrands.sort());
    }
  }, [genderDepartment, includeLingerie]);

  useEffect(() => {
    if (genderDepartment !== 'Female') {
      setIncludeLingerie(false);
    }
  }, [genderDepartment]);

  useEffect(() => {
    setCurrency(getCurrencyByCountry(country));
  }, [country]);


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

  const handleMinPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
        const newMinPrice = Math.max(0.01, value);
        setMinPrice(newMinPrice);
        // Ensure maxPrice is not less than the new minPrice
        if (maxPrice < newMinPrice) {
            setMaxPrice(newMinPrice);
        }
    }
  };
  
  const toggleDebugPanel = () => {
    setShowDebugPanel(prev => !prev);
  };
  
  const sliderMax = minPrice > 1 ? minPrice * 100 : 9000;

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
                            <div className="flex items-center space-x-2 mb-4">
                                <Label htmlFor="mode-switch">Single</Label>
                                <Switch
                                    id="mode-switch"
                                    checked={mode === 'wardrobe'}
                                    onCheckedChange={(checked) => setMode(checked ? 'wardrobe' : 'single')}
                                />
                                <Label htmlFor="mode-switch">Wardrobe</Label>
                            </div>

                            {mode === 'single' ? (
                                <ImageUpload onImageUpload={handleImageUpload} isLoading={isLoading} />
                            ) : (
                                <div className="w-full max-w-2xl">
                                    <div className="flex justify-center mb-4 space-x-2">
                                        <Button
                                            variant={wardrobeInputMode === 'text' ? 'secondary' : 'outline'}
                                            onClick={() => setWardrobeInputMode('text')}>
                                            Text Input
                                        </Button>
                                        <Button
                                            variant={wardrobeInputMode === 'image' ? 'secondary' : 'outline'}
                                            onClick={() => setWardrobeInputMode('image')}>
                                            Image Mode
                                        </Button>
                                    </div>

                                    {wardrobeInputMode === 'text' && (
                                        <>
                                            <WardrobeTable wardrobe={wardrobe} setWardrobe={setWardrobe} />
                                            <div className="mt-6 text-center">
                                                <Button onClick={handleWardrobeRecommendation} size="lg">
                                                    Get Recommendations
                                                </Button>
                                            </div>
                                        </>
                                    )}

                                    {wardrobeInputMode === 'image' && (
                                        <ImageWardrobe
                                            analyzeClothingImage={analyzeClothingImage}
                                            onAnalysisComplete={(results) => {
                                                addLog({
                                                    event: 'response',
                                                    flow: 'analyzeClothingImage',
                                                    data: results
                                                });
                                                setImageAnalysisResults(results);
                                                handleWardrobeAnalysisRecommendation(results);
                                            }}
                                        />
                                    )}
                                </div>
                            )}
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
                            <div className="mt-4 w-full max-w-sm">
                                <Label htmlFor="brand-select" className="text-sm font-medium text-muted-foreground">Preferred Brand</Label>
                                <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                                    <SelectTrigger id="brand-select" className="mt-1"><SelectValue placeholder="Select a brand" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Auto">Auto (Recommended)</SelectItem>
                                        {availableBrands.map((brand) => (<SelectItem key={brand} value={brand}>{brand}</SelectItem>))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="mt-4 w-full max-w-sm">
                                <Label htmlFor="category-select" className="text-sm font-medium text-muted-foreground">Clothing Category</Label>
                                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                    <SelectTrigger id="category-select" className="mt-1"><SelectValue placeholder="Select a category" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Auto">Auto (Detect from image)</SelectItem>
                                        {clothingCategories.map((category) => (<SelectItem key={category} value={category}>{category}</SelectItem>))}
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
                                <Label htmlFor="num-items-input" className="text-sm font-medium text-muted-foreground">Number of Items to Shop</Label>
                                <Input id="num-items-input" type="number" value={numSimilarItems} onChange={handleNumItemsChange} placeholder="e.g., 5" className="mt-1"/>
                            </div>
                            <div className="mt-4 w-full max-w-sm">
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
                            currency={currency}
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
                        <p className="text-sm text-muted-foreground">StyleSeer &copy; {new Date().getFullYear()} - Your AI Fashion Assistant.</p>
                    </footer>
                </main>
            </div>
        </TabsContent>
        <TabsContent value="logs" className="flex-1 overflow-y-auto">
            <BackendLogs logs={logs} />
        </TabsContent>
      </Tabs>
      {showDebugPanel && <DebugPanel logs={logs} imageAnalysisResults={imageAnalysisResults} />}
    </div>
  );
}
