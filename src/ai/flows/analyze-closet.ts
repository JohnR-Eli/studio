'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { analyzeClothingImage, AnalyzeClothingImageInput, AnalyzeClothingImageOutput } from './analyze-clothing-image';

const AnalyzeClosetInputSchema = z.object({
  photoDataUris: z.array(z.string()).describe("An array of photos of clothing, as data URIs."),
  country: z.string().optional().describe("The user's country of residence."),
  genderDepartment: z.enum(["Male", "Female", "Unisex", "Auto"]).optional().describe("The user-specified gender department for the clothing items."),
});
export type AnalyzeClosetInput = z.infer<typeof AnalyzeClosetInputSchema>;

const ClosetAnalysisResultSchema = z.object({
    dominantClothingItems: z.array(z.object({ item: z.string(), count: z.number() })).describe("A list of the most common clothing items found in the user's closet."),
    dominantStyles: z.array(z.object({ style: z.string(), count: z.number() })).describe("A list of the most common clothing styles found in the user's closet."),
    recommendedBrands: z.array(z.string()).describe("A list of brands recommended based on the user's overall closet style."),
});
export type ClosetAnalysisResult = z.infer<typeof ClosetAnalysisResultSchema>;

export async function analyzeCloset(input: AnalyzeClosetInput): Promise<ClosetAnalysisResult | null> {
    try {
        const result = await analyzeClosetFlow(input);
        return result;
    } catch (e) {
        console.error("Error in analyzeCloset wrapper calling flow:", e);
        return null;
    }
}

const analyzeClosetFlow = ai.defineFlow(
    {
        name: 'analyzeClosetFlow',
        inputSchema: AnalyzeClosetInputSchema,
        outputSchema: ClosetAnalysisResultSchema,
    },
    async (input): Promise<ClosetAnalysisResult> => {
        try {
            const analysisPromises = input.photoDataUris.map(uri => {
                const singleImageInput: AnalyzeClothingImageInput = {
                    photoDataUri: uri,
                    genderDepartment: input.genderDepartment || 'Auto',
                    country: input.country,
                };
                return analyzeClothingImage(singleImageInput);
            });

            const analysisResults = (await Promise.all(analysisPromises)).filter((r): r is AnalyzeClothingImageOutput => r !== null);

            // Aggregation Logic
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

            // For now, we will just return the collected brands.
            // A more advanced implementation could re-rank them based on frequency.
            const recommendedBrands = Array.from(allRecommendedBrands);

            return {
                dominantClothingItems: sortedClothingItems.slice(0, 5),
                dominantStyles: sortedStyles.slice(0, 5), // This is a placeholder
                recommendedBrands: recommendedBrands.slice(0, 10),
            };

        } catch (e: any) {
            const errorMessage = `Error in analyzeClosetFlow: ${e.message || String(e)}`;
            console.error(errorMessage, e);
            throw new Error(errorMessage);
        }
    }
);
