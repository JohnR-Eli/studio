
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
import { callExternalApi, callWardrobeApi, WardrobeItem } from './call-external-api';
import { LogEntry } from '@/app/page';

const clothingCategories = [
    "Tops", "Bottoms", "Footwear", "Accessories", "Activewear", "Outerwear", 
    "Sweaters", "T-Shirts", "Jeans", "Pants", "Shoes", "Hats"
];

const WardrobeItemSchema = z.object({
    category: z.string(),
    brand: z.string(),
});

const BaseSchema = z.object({
    country: z.string().optional().describe('The country of residence of the user, used to prioritize vendors from that country. If not provided, it will default to United States.'),
    numSimilarItems: z.number().optional().default(5).describe('The number of similar items to find. Defaults to 5.'),
    minPrice: z.number().optional().describe('The minimum price for the items to find.'),
    maxPrice: z.number().optional().describe('The maximum price for the items to find.'),
    gender: z.enum(["Male", "Female", "Unisex"]).optional().describe('The gender department for the clothing items.'),
});

const ImageFlowSchema = BaseSchema.extend({
    isWardrobeFlow: z.literal(false).optional(),
    photoDataUri: z.string().describe("The original image of the clothing item, as a data URI."),
    clothingItem: z.string().describe('The type or category of clothing item.'),
    targetBrandNames: z.array(z.string()).describe('The specific brand names to primarily find similar items from.'),
    userProvidedCategory: z.string().optional().describe('A clothing category explicitly provided by the user, which should override AI detection.'),
});

const WardrobeFlowSchema = BaseSchema.extend({
    isWardrobeFlow: z.literal(true),
    wardrobe: z.array(WardrobeItemSchema).describe("An array of wardrobe items, each with a category and brand."),
});

const FindSimilarItemsInputSchema = z.discriminatedUnion("isWardrobeFlow", [
  ImageFlowSchema,
  WardrobeFlowSchema,
]);

export type FindSimilarItemsInput = z.infer<typeof FindSimilarItemsInputSchema>;

const SimilarItemSchema = z.object({
  productName: z.string(),
  merchantName: z.string(),
  itemPrice: z.string(),
  vendorLink: z.string().url(),
  imageURL: z.string().url(),
  // Add category to the similar item schema to extract it later
  category: z.string().optional(),
});
export type SimilarItem = z.infer<typeof SimilarItemSchema>;

const FindSimilarItemsOutputSchema = z.object({
  similarItems: z.array(SimilarItemSchema).describe('List of up to a specified number of similar clothing items with their details and vendor links.'),
  logs: z.array(z.custom<Omit<LogEntry, 'id' | 'timestamp'>>()).optional(),
  category: z.string().optional().describe('The primary category identified from the wardrobe recommendation.'),
  clothingItems: z.array(z.string()).optional().describe('A list of clothing items identified.'),
});
export type FindSimilarItemsOutput = z.infer<typeof FindSimilarItemsOutputSchema>;

export const findSimilarItems = ai.defineFlow(
  {
    name: 'findSimilarItems',
    inputSchema: FindSimilarItemsInputSchema,
    outputSchema: FindSimilarItemsOutputSchema,
  },
  async (input: FindSimilarItemsInput): Promise<FindSimilarItemsOutput> => {
    const logs: Omit<LogEntry, 'id' | 'timestamp'>[] = [];
    const allSimilarItems: SimilarItem[] = [];

    const country = input.country || 'United States';
    const gender = input.gender || 'Unisex';

    if (input.isWardrobeFlow) {
        const apiInput = {
            howMany: input.numSimilarItems || 5,
            gender,
            country,
            wardrobe: input.wardrobe,
            minPrice: input.minPrice,
            maxPrice: input.maxPrice,
        };
        logs.push({ event: 'invoke', flow: 'callExternalApi', data: { ...apiInput, name: 'callWardrobeApi' } });

        try {
            const apiResponse = await callWardrobeApi(
                apiInput.howMany,
                apiInput.gender,
                apiInput.country,
                apiInput.wardrobe,
                apiInput.minPrice,
                apiInput.maxPrice
            );
            logs.push({ event: 'response', flow: 'callExternalApi', data: apiResponse });

            if (apiResponse.imageURLs && apiResponse.imageURLs.length > 0) {
                for (let i = 0; i < apiResponse.imageURLs.length; i++) {
                    const similarItem: SimilarItem = {
                        productName: apiResponse.productNames?.[i] || 'TBD',
                        merchantName: apiResponse.merchantNames?.[i] || 'TBD',
                        itemPrice: apiResponse.itemPrices?.[i] || 'TBD',
                        vendorLink: apiResponse.URLs[i],
                        imageURL: apiResponse.imageURLs[i],
                    };
                    allSimilarItems.push(similarItem);
                }
            }
            // Extract the category from the first item for the complementary flow
            const primaryCategory = input.wardrobe[0]?.category;
            const clothingItems = [...new Set(input.wardrobe.map(i => i.category))];

            return { similarItems: allSimilarItems, logs, category: primaryCategory, clothingItems };

        } catch (e) {
            console.error(`Error in findSimilarItemsFlow for wardrobe:`, e);
            logs.push({ event: 'error', flow: 'callExternalApi', data: { error: e instanceof Error ? e.message : String(e) } });
            return { similarItems: [], logs };
        }

    } else {
        // This is the original image-based flow
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
                        for (let i = 0; i < apiResponse.imageURLs.length; i++) {
                            const similarItem: SimilarItem = {
                                productName: apiResponse.productNames?.[i] || 'TBD',
                                merchantName: apiResponse.merchantNames?.[i] || 'TBD',
                                itemPrice: apiResponse.itemPrices?.[i] || 'TBD',
                                vendorLink: apiResponse.URLs[i],
                                imageURL: apiResponse.imageURLs[i],
                            };
                            allSimilarItems.push(similarItem);
                        }
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
  }
);
