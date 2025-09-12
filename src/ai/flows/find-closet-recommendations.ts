'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { callExternalApi } from './call-external-api';
import { LogEntry } from '@/app/page';
import { SimilarItem, SimilarItemSchema } from './find-similar-items';

const FindClosetRecommendationsInputSchema = z.object({
  dominantClothingItems: z.array(z.string()).describe("A list of the user's dominant clothing items."),
  targetBrandNames: z.array(z.string()).describe('The specific brand names to find items from.'),
  country: z.string().optional().describe('The country of residence of the user.'),
  minPrice: z.number().optional().describe('The minimum price for the items to find.'),
  maxPrice: z.number().optional().describe('The maximum price for the items to find.'),
  gender: z.enum(["Male", "Female", "Unisex", "Auto"]).optional().describe('The gender department for the clothing items.'),
});
export type FindClosetRecommendationsInput = z.infer<typeof FindClosetRecommendationsInputSchema>;

const FindClosetRecommendationsOutputSchema = z.object({
  recommendedItems: z.array(SimilarItemSchema).describe('List of recommended clothing items.'),
  logs: z.array(z.custom<Omit<LogEntry, 'id' | 'timestamp'>>()).optional(),
});
export type FindClosetRecommendationsOutput = z.infer<typeof FindClosetRecommendationsOutputSchema>;


export async function findClosetRecommendations(input: FindClosetRecommendationsInput): Promise<FindClosetRecommendationsOutput> {
  return findClosetRecommendationsFlow(input);
}

const findClosetRecommendationsFlow = ai.defineFlow(
  {
    name: 'findClosetRecommendationsFlow',
    inputSchema: FindClosetRecommendationsInputSchema,
    outputSchema: FindClosetRecommendationsOutputSchema,
  },
  async (input: FindClosetRecommendationsInput): Promise<FindClosetRecommendationsOutput> => {
    const logs: Omit<LogEntry, 'id' | 'timestamp'>[] = [];
    const allRecommendedItems: SimilarItem[] = [];

    const country = input.country || 'United States';
    const gender = (input.gender && input.gender !== 'Auto') ? input.gender : 'Unisex';
    const category = input.dominantClothingItems[0] || 'clothing'; // Use the most dominant item as the category

    for (const brand of input.targetBrandNames) {
        try {
            const apiInput = {
                howMany: 2, // As requested by the user
                category,
                brand,
                gender,
                country,
                minPrice: input.minPrice,
                maxPrice: input.maxPrice,
            };
            logs.push({ event: 'invoke', flow: 'callExternalApi', data: apiInput });

            const apiResponse = await callExternalApi(
                apiInput.howMany,
                apiInput.category,
                apiInput.brand,
                apiInput.gender,
                apiInput.country,
                apiInput.minPrice,
                apiInput.maxPrice
            );
            logs.push({ event: 'response', flow: 'callExternalApi', data: apiResponse });

            if (apiResponse.imageURLs && apiResponse.imageURLs.length > 0) {
                for (let i = 0; i < apiResponse.imageURLs.length; i++) {
                    const recommendedItem: SimilarItem = {
                        productName: apiResponse.productNames?.[i] || 'TBD',
                        merchantName: apiResponse.merchantNames?.[i] || 'TBD',
                        itemPrice: apiResponse.itemPrices?.[i] || 'TBD',
                        vendorLink: apiResponse.URLs[i],
                        imageURL: apiResponse.imageURLs[i],
                    };
                    allRecommendedItems.push(recommendedItem);
                }
            } else {
                logs.push({ event: 'error', flow: 'callExternalApi', data: `Empty response for brand ${brand}, category: ${category}`});
            }
        } catch (e) {
            console.error(`Error in findClosetRecommendationsFlow for brand ${brand}:`, e);
            logs.push({ event: 'error', flow: 'callExternalApi', data: { brand, error: e instanceof Error ? e.message : String(e) } });
        }
    }

    return { recommendedItems: allRecommendedItems, logs };
  }
);
