
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Shirt, ShoppingBag, AlertTriangle, Ticket, Users, Info, Sparkles, Loader2, SearchCheck, Puzzle } from 'lucide-react';
import NextImage from 'next/image';

interface SimilarItem {
    itemTitle: string;
    itemDescription: string;
    vendorLink: string;
    imageURL: string;
}

interface ComplementaryItem {
    category: string;
    itemTitle: string;
    vendorLink: string;
    imageURL: string;
}

interface AnalysisResultsProps {
  imagePreview: string | null;
  clothingItems?: string[];
  genderDepartment?: string;
  identifiedBrand?: string;
  brandIsExplicit?: boolean;
  approximatedBrands?: string[];
  alternativeBrands?: string[];
  similarItems?: SimilarItem[];
  complementaryItems?: ComplementaryItem[];
  isSpecificItemsLoading: boolean;
}

export default function AnalysisResults({
  imagePreview,
  clothingItems,
  genderDepartment,
  identifiedBrand,
  brandIsExplicit,
  approximatedBrands,
  alternativeBrands,
  similarItems,
  complementaryItems,
  isSpecificItemsLoading,
}: AnalysisResultsProps) {
  const hasAnyDataToShow = imagePreview || 
                           (clothingItems && clothingItems.length > 0) || 
                           identifiedBrand || 
                           (approximatedBrands && approximatedBrands.length > 0) ||
                           genderDepartment || 
                           (alternativeBrands && alternativeBrands.length > 0);

  if (!hasAnyDataToShow) {
    if (!imagePreview) return null;
  }
  
  const hasPrimaryAnalysisDetails = (clothingItems && clothingItems.length > 0) || 
                                  !!identifiedBrand || 
                                  (approximatedBrands && approximatedBrands.length > 0) ||
                                  !!genderDepartment;

  const hasAlternativeBrandsToExplore = alternativeBrands && alternativeBrands.length > 0;

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
        {imagePreview && !hasPrimaryAnalysisDetails && !hasAlternativeBrandsToExplore && ( 
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

            {identifiedBrand && brandIsExplicit && (
              <Card className="shadow-lg rounded-xl transition-all hover:shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Ticket size={24} className="text-primary" /> Brand (Clearly Identified)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-md font-medium">{identifiedBrand}</p>
                </CardContent>
              </Card>
            )}
            
            {!brandIsExplicit && approximatedBrands && approximatedBrands.length > 0 && (
                 <Card className="shadow-lg rounded-xl transition-all hover:shadow-xl">
                 <CardHeader>
                   <CardTitle className="flex items-center gap-2 text-xl">
                     <SearchCheck size={24} className="text-primary" /> Brand Approximations (AI Suggestion)
                   </CardTitle>
                 </CardHeader>
                 <CardContent>
                   <div className="flex flex-wrap gap-2">
                     {approximatedBrands.map((brand, index) => (
                       <Badge key={index} variant="outline" className="text-sm px-3 py-1.5 shadow-sm">{brand}</Badge>
                     ))}
                   </div>
                 </CardContent>
               </Card>
            )}
          </>
        )}
        
        {hasAlternativeBrandsToExplore && (
            <Card className="shadow-lg rounded-xl transition-all hover:shadow-xl">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                <Sparkles size={24} className="text-primary" /> Alternative Brands (Similar Style)
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-wrap gap-2">
                {alternativeBrands?.map((altBrand, index) => (
                    <Badge key={index} variant="outline" className="text-sm px-3 py-1.5 shadow-sm">{altBrand}</Badge>
                ))}
                </div>
            </CardContent>
            </Card>
        )}

        {/* Similar Items Section - Dynamically updated */}
        <Card className="shadow-lg rounded-xl transition-all hover:shadow-xl lg:col-span-full">
            <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
                <ShoppingBag size={24} className="text-primary" /> Style Suggestions
            </CardTitle>
            </CardHeader>
            <CardContent>
                {isSpecificItemsLoading && (
                    <div className="flex items-center justify-center py-6">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="ml-3 text-muted-foreground">Loading suggestions...</p>
                    </div>
                )}
                {!isSpecificItemsLoading && similarItems && similarItems.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {similarItems.map((item, index) => (
                            <a href={item.vendorLink} key={index} target="_blank" rel="noopener noreferrer" className="block group">
                                <Card className="overflow-hidden">
                                    <div className="aspect-[4/5] relative w-full bg-muted/30">
                                        <NextImage
                                            src={item.imageURL}
                                            alt={item.itemTitle}
                                            fill
                                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                                        />
                                    </div>
                                </Card>
                            </a>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>

        {/* Complementary Items Section */}
        {complementaryItems && complementaryItems.length > 0 && (
          <Card className="shadow-lg rounded-xl transition-all hover:shadow-xl lg:col-span-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Puzzle size={24} className="text-primary" /> Complete the Look
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {complementaryItems.map((item, index) => (
                  <a href={item.vendorLink} key={index} target="_blank" rel="noopener noreferrer" className="block group">
                    <Card className="overflow-hidden">
                      <div className="aspect-[4/5] relative w-full bg-muted/30">
                        <NextImage
                          src={item.imageURL}
                          alt={item.itemTitle}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                      <div className='p-2 text-center'>
                        <p className="text-xs font-semibold truncate">{item.itemTitle}</p>
                        <Badge variant="secondary" className="mt-1 text-xs">{item.category}</Badge>
                      </div>
                    </Card>
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
