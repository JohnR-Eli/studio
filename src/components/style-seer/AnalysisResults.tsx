import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Tag, Palette as PaletteIcon, Shirt, ShoppingBag, AlertTriangle } from 'lucide-react';
import NextImage from 'next/image';

interface AnalysisResultsProps {
  imagePreview: string | null;
  clothingItems?: string[];
  dominantColors?: string[];
  style?: string;
  vendorLinks?: string[];
}

export default function AnalysisResults({
  imagePreview,
  clothingItems,
  dominantColors,
  style,
  vendorLinks,
}: AnalysisResultsProps) {
  if (!clothingItems && !dominantColors && !style && (!vendorLinks || vendorLinks.length === 0)) {
    // If only imagePreview is present but no actual analysis results, don't render this specific component.
    // The page itself can handle showing just the image if needed.
    return null;
  }
  
  const hasVendorLinks = vendorLinks && vendorLinks.length > 0;
  const hasAnyAnalysis = (clothingItems && clothingItems.length > 0) || (dominantColors && dominantColors.length > 0) || style;

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
        {!hasAnyAnalysis && (
             <Card className="shadow-lg rounded-xl border-dashed border-amber-500 bg-amber-500/10">
             <CardHeader>
               <CardTitle className="flex items-center gap-2 text-xl text-amber-700">
                 <AlertTriangle size={24} /> No Clothing Detected
               </CardTitle>
             </CardHeader>
             <CardContent>
               <p className="text-md text-amber-600">We couldn't identify specific clothing items in this image. Try a different image with clearer apparel.</p>
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

        {hasAnyAnalysis && ( // Only show vendor links if some analysis was successful
            <Card className="shadow-lg rounded-xl transition-all hover:shadow-xl">
                <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                    <ShoppingBag size={24} className="text-primary" /> Similar Items Online
                </CardTitle>
                {!hasVendorLinks && clothingItems && clothingItems.length > 0 && (
                    <CardDescription>We couldn't find specific online matches for this item at the moment.</CardDescription>
                )}
                 {!clothingItems || clothingItems.length === 0 && (
                    <CardDescription>Upload an image with clothing to find similar items.</CardDescription>
                 )}
                </CardHeader>
                {hasVendorLinks && (
                <CardContent>
                    <ul className="space-y-3">
                    {vendorLinks.map((link, index) => (
                        <li key={index} className="text-sm">
                        <a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-accent hover:text-accent/80 transition-colors group"
                        >
                            <ExternalLink size={18} className="text-accent/70 group-hover:text-accent transition-colors" />
                            <span className="underline group-hover:no-underline truncate">{new URL(link).hostname.replace('www.','')}</span>
                        </a>
                        </li>
                    ))}
                    </ul>
                </CardContent>
                )}
            </Card>
        )}
      </div>
    </div>
  );
}
