
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Shirt, ShoppingBag, AlertTriangle, Ticket, Users, Info, Sparkles, Loader2 } from 'lucide-react';
import NextImage from 'next/image';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { SimilarItem as GenkitSimilarItemBase } from '@/ai/flows/find-similar-items';
import { Button } from '@/components/ui/button'; 

interface SimilarItem extends Omit<GenkitSimilarItemBase, 'itemImageDataUri'> {}

interface AnalysisResultsProps {
  imagePreview: string | null;
  clothingItems?: string[];
  genderDepartment?: string;
  brand?: string;
  brandIsExplicit?: boolean;
  alternativeBrands?: string[];
  similarItems?: SimilarItem[];
  onBrandHover: (brandName: string) => void;
  isSpecificItemsLoading: boolean;
  currentlyDisplayedBrandItems: string | null; 
}

export default function AnalysisResults({
  imagePreview,
  clothingItems,
  genderDepartment,
  brand,
  brandIsExplicit,
  alternativeBrands,
  similarItems,
  onBrandHover,
  isSpecificItemsLoading,
  currentlyDisplayedBrandItems,
}: AnalysisResultsProps) {
  // Determine if there's anything to show at all.
  const hasAnyDataToShow = imagePreview || 
                           (clothingItems && clothingItems.length > 0) || 
                           brand || 
                           genderDepartment || 
                           (alternativeBrands && alternativeBrands.length > 0);

  if (!hasAnyDataToShow) {
    // If no image preview and no analysis results, show nothing.
    // If there is an image preview but no other results, the structure below will handle it.
    if (!imagePreview) return null;
  }
  
  const hasPrimaryAnalysisDetails = (clothingItems && clothingItems.length > 0) || !!brand || !!genderDepartment;
  const brandDisplayTitle = brandIsExplicit ? "Brand (Clearly Identified)" : "Brand (AI Approximation)";
  const hasAlternativeBrands = alternativeBrands && alternativeBrands.length > 0;

  const similarItemsTitle = currentlyDisplayedBrandItems 
    ? `Style Suggestions from ${currentlyDisplayedBrandItems}` 
    : "Style Suggestions";

  return (
    <div className="w-full max-w-5xl mx-auto mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3 items-start">
      {imagePreview && (
        <Card className="lg:col-span-1 overflow-hidden shadow-lg rounded-xl transition-all hover:shadow-xl">
          <CardHeader className="p-0">
            <div className="aspect-[4/3] relative w-full bg-muted/30 rounded-t-xl">
              <NextImage src={imagePreview} alt="Analyzed image" fill className="rounded-t-xl object-contain" data-ai-hint="fashion clothing" />
            </div>
          </CardHeader>
          <CardContent className="p-4 text-center">
            <CardDescription>Your Uploaded Image</CardDescription>
          </CardContent>
        </Card>
      )}

      <div className={`flex flex-col gap-6 ${imagePreview ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
        {imagePreview && !hasPrimaryAnalysisDetails && !hasAlternativeBrands && ( 
             <Card className="shadow-lg rounded-xl border-dashed border-amber-500 bg-amber-500/10">
             <CardHeader>
               <CardTitle className="flex items-center gap-2 text-xl text-amber-700">
                 <AlertTriangle size={24} /> No Details Detected
               </CardTitle>
             </CardHeader>
             <CardContent>
               <p className="text-md text-amber-600">We couldn't identify specific clothing details for this image.</p>
             </CardContent>
           </Card>
        )}

        {hasPrimaryAnalysisDetails && (
          <>
            {clothingItems && clothingItems.length > 0 && (
              <Card className="shadow-lg rounded-xl transition-all hover:shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Shirt size={24} className="text-primary" /> Category
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {clothingItems.map((item, index) => (
                      <Badge key={index} variant="secondary" className="text-sm px-3 py-1.5 shadow-sm">{item}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {genderDepartment && (
              <Card className="shadow-lg rounded-xl transition-all hover:shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Users size={24} className="text-primary" /> Gender Department
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-md font-medium">{genderDepartment}</p>
                </CardContent>
              </Card>
            )}

            {brand && (
              <Card className="shadow-lg rounded-xl transition-all hover:shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Ticket size={24} className="text-primary" /> {brandDisplayTitle}
                    {!brandIsExplicit && (
                      <TooltipProvider>
                        <Tooltip delayDuration={100}>
                          <TooltipTrigger asChild>
                            <Info size={16} className="text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs bg-popover text-popover-foreground p-2 rounded-md shadow-lg border">
                            <p className="text-xs">This brand is an AI approximation as a clear brand was not visible or it was chosen from a best-fit list.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-md font-medium">{brand}</p>
                </CardContent>
              </Card>
            )}
          </>
        )}
        
        {hasAlternativeBrands && (
            <Card className="shadow-lg rounded-xl transition-all hover:shadow-xl">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                <Sparkles size={24} className="text-primary" /> Alternative Brands (Similar Style)
                </CardTitle>
                <CardDescription>Hover over a brand to see style suggestions from them below.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-wrap gap-2">
                {alternativeBrands?.map((altBrand, index) => (
                    <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onMouseEnter={() => onBrandHover(altBrand)}
                        className="text-sm px-3 py-1.5 shadow-sm hover:bg-accent hover:text-accent-foreground focus:ring-2 focus:ring-ring"
                        aria-label={`Show items from ${altBrand}`}
                    >
                        {altBrand}
                    </Button>
                ))}
                </div>
            </CardContent>
            </Card>
        )}

        {/* Similar Items Section - Now dynamically updated */}
        <Card className="shadow-lg rounded-xl transition-all hover:shadow-xl lg:col-span-full">
            <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
                <ShoppingBag size={24} className="text-primary" /> {similarItemsTitle}
            </CardTitle>
            {!isSpecificItemsLoading && (!similarItems || similarItems.length === 0) && (
                 <CardDescription>
                    {currentlyDisplayedBrandItems 
                        ? `No specific style suggestions found for ${currentlyDisplayedBrandItems} at the moment.`
                        : (hasAlternativeBrands ? "Hover over an alternative brand above to see style suggestions." : "No alternative brands found to explore for suggestions.")}
                 </CardDescription>
            )}
            </CardHeader>
            <CardContent>
                {isSpecificItemsLoading && (
                    <div className="flex items-center justify-center py-6">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="ml-3 text-muted-foreground">Loading suggestions for {currentlyDisplayedBrandItems}...</p>
                    </div>
                )}
                {!isSpecificItemsLoading && similarItems && similarItems.length > 0 && (
                    <TooltipProvider delayDuration={100}>
                        <ul className="space-y-4">
                        {similarItems.map((item, index) => (
                        <li key={index} className="p-3 border rounded-md shadow-sm bg-card hover:bg-muted/40 transition-colors">
                            <Tooltip>
                            <TooltipTrigger asChild>
                                <a
                                href={item.vendorLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block group"
                                >
                                <p className="font-semibold text-md mb-1.5 text-foreground group-hover:text-accent transition-colors">{item.itemTitle}</p>
                                <div className="flex items-center gap-1.5 text-sm text-accent/80 group-hover:text-accent transition-colors">
                                    <ExternalLink size={16} />
                                    <span className="underline group-hover:no-underline truncate">
                                    View on {new URL(item.vendorLink).hostname.replace('www.','')}
                                    </span>
                                </div>
                                </a>
                            </TooltipTrigger>
                            <TooltipContent side="top" align="start" className="max-w-xs bg-popover text-popover-foreground p-3 rounded-md shadow-lg border">
                                <p className="text-sm font-semibold mb-1">{item.itemTitle}</p>
                                <p className="text-sm">{item.itemDescription}</p>
                            </TooltipContent>
                            </Tooltip>
                        </li>
                        ))}
                        </ul>
                    </TooltipProvider>
                )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
    
