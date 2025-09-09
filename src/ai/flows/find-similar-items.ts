
'use server';
/**
 * @fileOverview AI agent to find similar clothing items from online vendors, focusing on a target brand.
 *
 * - findSimilarItems - A function that handles the process of finding similar items.
 * - FindSimilarItemsInput - The input type for the findSimilarItems function.
 * - FindSimilarItemsOutput - The return type for the findSimilarItems function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { callExternalApi } from './call-external-api';
import { LogEntry } from '@/app/page';

const clothingCategories = [
    "Tops", "Bottoms", "Footwear", "Accessories", "Activewear", "Outerwear", 
    "Sweaters", "T-Shirts", "Jeans", "Pants", "Shoes", "Hats"
];

const FindSimilarItemsInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "The original image of the clothing item, as a data URI. It must include a MIME type (e.g., 'image/jpeg', 'image/png') and use Base64 encoding for the image data. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  clothingItem: z.string().describe('The type or category of clothing item (e.g., dress, shirt, pants, or a general placeholder like "clothing item from image").'),
  targetBrandNames: z.array(z.string()).describe('The specific brand names to primarily find similar items from. These brands are typically ones suggested by the image analysis step.'),
  country: z.string().optional().describe('The country of residence of the user, used to prioritize vendors from that country. If not provided, it will default to United States.'),
  numSimilarItems: z.number().optional().default(5).describe('The number of similar items to find. Defaults to 5.'),
  minPrice: z.number().optional().describe('The minimum price for the items to find.'),
  maxPrice: z.number().optional().describe('The maximum price for the items to find.'),
  gender: z.enum(["Male", "Female", "Unisex"]).optional().describe('The gender department for the clothing items.'),
  userProvidedCategory: z.string().optional().describe('A clothing category explicitly provided by the user, which should override AI detection.'),
});
export type FindSimilarItemsInput = z.infer<typeof FindSimilarItemsInputSchema>;

const SimilarItemSchema = z.object({
  itemTitle: z.string().describe('A concise title for the similar clothing item, including its brand if identifiable (e.g., "Nike Sportswear Club Hoodie"). This will be the main display text for the item.'),
  itemDescription: z.string().describe('A detailed description (2-3 sentences) of the similar clothing item, highlighting key features, materials, or why it is a good match. This will be shown as a preview on hover.'),
  vendorLink: z.string().describe('A direct URL to the product page on an online vendor site if a specific match is found. If not, a URL to a search results page on the vendor\'s site for the item (e.g., "https://vendor.com/search?q=item+description") or a relevant category page. This must be a valid URL.'),
  imageURL: z.string().url().describe("A URL for the item's image.")
});
export type SimilarItem = z.infer<typeof SimilarItemSchema>;

const FindSimilarItemsOutputSchema = z.object({
  similarItems: z.array(SimilarItemSchema).describe('List of up to a specified number of similar clothing items with their details and vendor links, suitable for adults (early 20s and older). These should primarily be from the targetBrandName, supplemented by other preferred brands if needed.'),
  logs: z.array(z.custom<Omit<LogEntry, 'id' | 'timestamp'>>()).optional(),
});
export type FindSimilarItemsOutput = z.infer<typeof FindSimilarItemsOutputSchema>;

export async function findSimilarItems(input: FindSimilarItemsInput): Promise<FindSimilarItemsOutput> {
  return findSimilarItemsFlow(input);
}

const findSimilarItemsFlow = ai.defineFlow(
  {
    name: 'findSimilarItemsFlow',
    inputSchema: FindSimilarItemsInputSchema,
    outputSchema: FindSimilarItemsOutputSchema,
  },
  async (input: FindSimilarItemsInput): Promise<FindSimilarItemsOutput> => {
    const logs: Omit<LogEntry, 'id' | 'timestamp'>[] = [];
    const allSimilarItems: SimilarItem[] = [];

    const country = input.country || 'United States';
    const gender = input.gender || 'Unisex';

    for (const brand of input.targetBrandNames) {
        let currentCategory = input.userProvidedCategory || input.clothingItem;
        let attempts = 0;
        const maxAttempts = 2; // Try the initial category, then one fallback.
        let foundItemForBrand = false;

        while (attempts < maxAttempts && !foundItemForBrand) {
            try {
                const apiInput = {
                    howMany: 1, // We just want one item per brand.
                    category: currentCategory,
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
                    const similarItem: SimilarItem = {
                        itemTitle: `${brand} ${currentCategory}`,
                        itemDescription: `A ${currentCategory} from ${brand} that matches the style. Found in ${country}.`,
                        vendorLink: apiResponse.URLs[0],
                        imageURL: apiResponse.imageURLs[0],
                    };
                    allSimilarItems.push(similarItem);
                    foundItemForBrand = true; // Stop trying for this brand
                } else {
                    logs.push({ event: 'error', flow: 'callExternalApi', data: `Empty response for brand ${brand}, category: ${currentCategory}`});
                    if (input.userProvidedCategory) {
                        // If the user provided the category and it failed, don't try others.
                        break;
                    }
                    // Try a different category for the same brand on the next attempt
                    const otherCategories = clothingCategories.filter(c => c !== currentCategory && c !== input.clothingItem);
                    if (otherCategories.length > 0) {
                       currentCategory = otherCategories[Math.floor(Math.random() * otherCategories.length)];
                    } else {
                        break; // No other categories to try
                    }
                }
            } catch (e) {
                console.error(`Error in findSimilarItemsFlow for brand ${brand}:`, e);
                logs.push({ event: 'error', flow: 'callExternalApi', data: { brand, error: e instanceof Error ? e.message : String(e) } });
                break; // Stop trying for this brand if there's a hard error
            }
            attempts++;
        }
    }
    
    return { similarItems: allSimilarItems, logs };
  }
);
