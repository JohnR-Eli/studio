
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Tag, Palette as PaletteIcon, Shirt, ShoppingBag, AlertTriangle, Ticket, Image as ImageIcon } from 'lucide-react'; // Added ImageIcon
import NextImage from 'next/image'; // For the main uploaded image
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
// Use the exported SimilarItem type from the flow if it includes itemImageDataUri
import type { SimilarItem as GenkitSimilarItem } from '@/ai/flows/find-similar-items';

// Define the SimilarItem interface locally if not importing, or extend/use the imported one
interface SimilarItem extends GenkitSimilarItem {
  // itemImageDataUri is now part of GenkitSimilarItem from the flow
}

interface AnalysisResultsProps {
  imagePreview: string | null;
  clothingItems?: string[];
  dominantColors?: string[];
  style?: string;
  brand?: string;
  similarItems?: SimilarItem[];
}

export default function AnalysisResults({
  imagePreview,
  clothingItems,
  dominantColors,
  style,
  brand,
  similarItems,
}: AnalysisResultsProps) {
  if (!clothingItems && !dominantColors && !style && !brand && (!similarItems || similarItems.length === 0)) {
    // If there's an image preview but no analysis data yet (e.g. during loading or if analysis failed partially)
    // we might still want to show the image. This condition should ideally be handled by the parent's loading/error state.
    // For now, if all analysis fields are empty, don't render this component.
    return null;
  }
  
  const hasSimilarItems = similarItems && similarItems.length > 0;
  const hasAnyAnalysis = (clothingItems && clothingItems.length > 0) || (dominantColors && dominantColors.length > 0) || style || brand;

  return (
    <div className="w-full max-w-5xl mx-auto mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3 items-start">
      {imagePreview && (
        <Card className="lg:col-span-1 overflow-hidden shadow-lg rounded-xl transition-all hover:shadow-xl">
          <CardHeader className="p-0">
            <div className="aspect-[4/3] relative w-full bg-muted/30 rounded-t-xl">
              <NextImage src={imagePreview} alt="Analyzed image" layout="fill" objectFit="contain" className="rounded-t-xl" data-ai-hint="fashion clothing" />
            </div>
          </CardHeader>
          <CardContent className="p-4 text-center">
            <CardDescription>Your Uploaded Image</CardDescription>
          </CardContent>
        </Card>
      )}

      <div className={`flex flex-col gap-6 ${imagePreview ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
        {!hasAnyAnalysis && ( // Show this only if there's an image but no analysis (implies AI couldn't find anything)
             <Card className="shadow-lg rounded-xl border-dashed border-amber-500 bg-amber-500/10">
             <CardHeader>
               <CardTitle className="flex items-center gap-2 text-xl text-amber-700">
                 <AlertTriangle size={24} /> No Clothing Details Detected
               </CardTitle>
             </CardHeader>
             <CardContent>
               <p className="text-md text-amber-600">We couldn't identify specific clothing details (items, colors, style) in this image. Try a different image with clearer apparel.</p>
             </CardContent>
           </Card>
        )}

        {clothingItems && clothingItems.length > 0 && (
          <Card className="shadow-lg rounded-xl transition-all hover:shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Shirt size={24} className="text-primary" /> Detected Clothing
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

        {brand && (
          <Card className="shadow-lg rounded-xl transition-all hover:shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Ticket size={24} className="text-primary" /> Brand
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-md font-medium">{brand}</p>
            </CardContent>
          </Card>
        )}

        {dominantColors && dominantColors.length > 0 && (
          <Card className="shadow-lg rounded-xl transition-all hover:shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <PaletteIcon size={24} className="text-primary" /> Dominant Colors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {dominantColors.map((color, index) => (
                  <Badge key={index} variant="outline" className="text-sm px-3 py-1.5 flex items-center gap-2 shadow-sm">
                     <span className="inline-block w-4 h-4 rounded-full border border-black/20" style={{ backgroundColor: color }}></span>
                    {color}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {style && (
          <Card className="shadow-lg rounded-xl transition-all hover:shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Tag size={24} className="text-primary" /> Clothing Style
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-md font-medium">{style}</p>
            </CardContent>
          </Card>
        )}

        {/* Always show Similar Items card if any analysis was done, even if no similar items found yet */}
        {hasAnyAnalysis && ( 
            <Card className="shadow-lg rounded-xl transition-all hover:shadow-xl">
                <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                    <ShoppingBag size={24} className="text-primary" /> Similar Items Online
                </CardTitle>
                {!hasSimilarItems && clothingItems && clothingItems.length > 0 && (
                    <CardDescription>We couldn't find specific online matches or suggestions for this item at the moment, or image previews are still loading.</CardDescription>
                )}
                 {(!clothingItems || clothingItems.length === 0) && !brand && !style && ( // Only show if no primary analysis at all
                    <CardDescription>Upload an image with clothing to find similar items.</CardDescription>
                 )}
                </CardHeader>
                {hasSimilarItems && (
                <CardContent>
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
                            {item.itemImageDataUri ? (
                              // Using NextImage for optimization if it's a data URI from a trusted source (our AI)
                              // However, standard <img> is simpler here for data URIs and avoids domain configuration for next/image.
                              // Let's use a standard img tag for simplicity with data URIs.
                              <img 
                                src={item.itemImageDataUri} 
                                alt={`Preview of ${item.itemTitle}`} 
                                className="w-full h-auto rounded-md mb-2 object-contain max-h-48"
                                data-ai-hint="fashion clothing item" // Generic hint for AI-generated content
                              />
                            ) : (
                              <div className="w-full h-32 flex items-center justify-center bg-muted rounded-md mb-2">
                                <ImageIcon className="w-10 h-10 text-muted-foreground" />
                              </div>
                            )}
                            <p className="text-sm font-semibold mb-1">{item.itemTitle}</p>
                            <p className="text-sm">{item.itemDescription}</p>
                          </TooltipContent>
                        </Tooltip>
                      </li>
                    ))}
                    </ul>
                  </TooltipProvider>
                </CardContent>
                )}
            </Card>
        )}
      </div>
    </div>
  );
}
