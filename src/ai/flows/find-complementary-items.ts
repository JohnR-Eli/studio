
'use server';
/**
 * @fileOverview AI agent to find complementary clothing items to create a full outfit.
 *
 * - findComplementaryItems - A function that handles finding complementary items.
 * - FindComplementaryItemsInput - The input type for the findComplementaryItems function.
 * - FindComplementaryItemsOutput - The return type for the findComplementaryItems function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { callExternalApi } from './call-external-api';
import { LogEntry } from '@/app/page';


const FindComplementaryItemsInputSchema = z.object({
  originalClothingCategories: z.array(z.string()).describe('The categories of the original clothing items (e.g., ["T-Shirt", "Outerwear"]).'),
  gender: z.enum(["Male", "Female", "Unisex"]).describe("The gender department for the recommendations."),
  country: z.string().optional().describe('The country for sourcing items.'),
  numItemsPerCategory: z.number().optional().default(2).describe('Number of items to find for each complementary category.'),
});
export type FindComplementaryItemsInput = z.infer<typeof FindComplementaryItemsInputSchema>;

const ComplementaryItemSchema = z.object({
  category: z.string().describe('The category of the complementary item (e.g., "Pants", "Shoes").'),
  itemTitle: z.string().describe('A concise title for the item.'),
  vendorLink: z.string().url().describe('A direct URL to the product page.'),
  imageURL: z.string().url().describe('A URL for the item\'s image.'),
});
export type ComplementaryItem = z.infer<typeof ComplementaryItemSchema>;

const FindComplementaryItemsOutputSchema = z.object({
  complementaryItems: z.array(ComplementaryItemSchema).describe('A list of complementary clothing items.'),
  logs: z.array(z.custom<Omit<LogEntry, 'id' | 'timestamp'>>()).optional(),
});
export type FindComplementaryItemsOutput = z.infer<typeof FindComplementaryItemsOutputSchema>;

const preferredBrandsForStyleApproximation = [
    "Unique Vintage", "PUMA", "Osprey", "NBA", "Kappa", "Fanatics", "Nisolo", 
    "Backcountry", "Allbirds", "FEATURE", "MLB", "PGA", "NHL", "Flag & Anthem", 
    "MLS", "NFL", "GOLF le Fleur", "Taylor Stitch", "The North Face", "NIKE", 
    "LUISAVIAROMA", "FootJoy", "The Luxury Closet", "Savage X Fenty", "Bali Bras", 
    "Belstaff", "Belstaff UK", "Culture Kings US", "D1 Milano", "Double F", 
    "onehanesplace.com", "Jansport", "Kut from the Kloth", "Maidenform", "UGG US"
];

const complementaryCategoriesMap: Record<string, string[]> = {
    "Top": ["Pants", "Shoes"],
    "Tops": ["Pants", "Shoes"],
    "TShirts": ["Pants", "Shoes"],
    "Sweatshirts": ["Pants", "Shoes"],
    "Outerwear": ["Pants", "Tops"],
    "Sweaters": ["Pants", "Shoes"],
    "Bottom": ["Tops", "Shoes"],
    "Bottoms": ["Tops", "Shoes"],
    "Pants": ["Tops", "Shoes"],
    "Jeans": ["Tops", "Shoes"],
    "Footwear": ["Tops", "Pants"],
    "Shoes": ["Tops", "Pants"],
    "Accessory": ["Tops", "Pants"],
    "Accessories": ["Tops", "Pants"],
    "Hats": ["Tops", "Pants"],
    "Headware": ["Tops", "Pants"],
    "Activewear": ["Shoes", "Accessories"],
    "Clothing": ["Shoes", "Accessories"],
};

export async function findComplementaryItems(input: FindComplementaryItemsInput): Promise<FindComplementaryItemsOutput> {
  return findComplementaryItemsFlow(input);
}

const findComplementaryItemsFlow = ai.defineFlow(
  {
    name: 'findComplementaryItemsFlow',
    inputSchema: FindComplementaryItemsInputSchema,
    outputSchema: FindComplementaryItemsOutputSchema,
  },
  async ({ originalClothingCategories, gender, country = 'United States', numItemsPerCategory = 2 }): Promise<FindComplementaryItemsOutput> => {
    const complementaryItems: ComplementaryItem[] = [];
    const logs: Omit<LogEntry, 'id' | 'timestamp'>[] = [];
    
    // Get all potential complementary categories from the map for each original category.
    const potentialCategories = originalClothingCategories.flatMap(originalCategory => complementaryCategoriesMap[originalCategory] || []);
    
    // Filter out duplicates and categories that were in the original list.
    const categoriesToFind = [...new Set(potentialCategories)]
        .filter(category => !originalClothingCategories.includes(category));
    
    // If no categories are left after filtering, fall back to some defaults.
    if (categoriesToFind.length === 0) {
        categoriesToFind.push("Shoes", "Accessories");
    }

    const numToFetch = numItemsPerCategory || 2;

    for (const category of categoriesToFind) {
      const randomBrand = preferredBrandsForStyleApproximation[Math.floor(Math.random() * preferredBrandsForStyleApproximation.length)];
      try {
        const apiInput = {howMany: numToFetch, category, brand: randomBrand, gender, country};
        logs.push({ event: 'invoke', flow: 'callExternalApi', data: apiInput });
        const apiResponse = await callExternalApi(apiInput.howMany, apiInput.category, apiInput.brand, apiInput.gender, apiInput.country);
        logs.push({ event: 'response', flow: 'callExternalApi', data: apiResponse });
        
        const items = apiResponse.imageURLs.map((imageUrl, index) => ({
          category: category,
          itemTitle: `${randomBrand} ${category}`,
          vendorLink: apiResponse.URLs[index],
          imageURL: imageUrl,
        }));

        complementaryItems.push(...items);
      } catch (error) {
        console.error(`Error fetching complementary items for category ${category} and brand ${randomBrand}:`, error);
        logs.push({ event: 'error', flow: 'callExternalApi', data: { category, randomBrand, error: error instanceof Error ? error.message : String(error) } });
      }
    }

    return { complementaryItems, logs };
  }
);
