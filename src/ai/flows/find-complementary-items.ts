
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


const BaseComplementarySchema = z.object({
    gender: z.enum(["Male", "Female", "Unisex"]).describe("The gender department for the recommendations."),
    country: z.string().optional().describe('The country for sourcing items.'),
    numItemsPerCategory: z.number().optional().default(2).describe('Number of items to find for each complementary category.'),
    includeLingerie: z.boolean().optional().describe("Whether to include lingerie brands. Only considered when gender is 'Female'."),
    minPrice: z.number().optional().describe('The minimum price for the items.'),
    maxPrice: z.number().optional().describe('The maximum price for the items.'),
});

const ImageComplementarySchema = BaseComplementarySchema.extend({
    originalClothingCategories: z.array(z.string()).describe('The categories of the original clothing items (e.g., ["T-Shirt", "Outerwear"]).'),
});

const WardrobeComplementarySchema = BaseComplementarySchema.extend({
    category: z.string().describe('The primary category from the wardrobe recommendation.'),
});

const FindComplementaryItemsInputSchema = z.union([
    ImageComplementarySchema,
    WardrobeComplementarySchema,
]);
export type FindComplementaryItemsInput = z.infer<typeof FindComplementaryItemsInputSchema>;

const ComplementaryItemSchema = z.object({
  category: z.string().describe('The category of the complementary item (e.g., "Bottoms", "Shoes").'),
  productName: z.string().describe('A concise title for the item.'),
  vendorLink: z.string().url().describe('A direct URL to the product page.'),
  imageURL: z.string().url().describe('A URL for the item\'s image.'),
  merchantName: z.string().describe('The name of the merchant selling the item.'),
  itemPrice: z.string().describe('The price of the item.'),
});
export type ComplementaryItem = z.infer<typeof ComplementaryItemSchema>;

const FindComplementaryItemsOutputSchema = z.object({
  complementaryItems: z.array(ComplementaryItemSchema).describe('A list of complementary clothing items.'),
  logs: z.array(z.custom<Omit<LogEntry, 'id' | 'timestamp'>>()).optional(),
});
export type FindComplementaryItemsOutput = z.infer<typeof FindComplementaryItemsOutputSchema>;

const preferredBrandsForStyleApproximation = [
    "NIKE", "North Face UK", "Luxury Closet", "FootJoy",
    "Fabletics Europe", "Mytheresa", "Poshmark", "PUMA India", "Skechers",
    "Culture Kings US", "Kut from the Kloth", "UGG US",
    "Champion.com (Hanesbrands Inc.)", "Belstaff", "The Double F", "Belstaff UK",
    "Belstaff (Europe)", "Backcountry",
    "Taylor Stitch", "Fanatics", "NFL", "NHL", "NBA", "MLB", "MLS",
    "GOLF le Fleur", "PGA", "PUMA Thailand", "Flag & Anthem",
    "FEATURE", "Unique Vintage", "Kappa", "Allbirds",
    "onehanesplace.com (Hanesbrands Inc.)"
];

const accessoryOnlyBrands = ["JanSport", "D1 Milano", "Osprey"];

const lingerieBrands = [
    "Savage x Fenty", "The Tight Spot",
    "Maidenform", "Bali Bras"
];

const allClothingCategories = [
    "Tops", "Bottoms", "Footwear", "Accessories", "Activewear", "Outerwear", 
    "Sweaters", "T-Shirts", "Jeans", "Pants", "Shoes", "Hats"
];

const determineCategoriesPrompt = ai.definePrompt(
    {
      name: 'determineComplementaryCategories',
      input: { schema: z.object({ originalClothingCategories: z.array(z.string()), gender: z.enum(["Male", "Female", "Unisex"]) }) },
      output: { schema: z.object({ categoriesToFind: z.array(z.string()) }) },
      prompt: `Based on the original clothing categories {{json originalClothingCategories}} and gender '{{gender}}', decide which 1-3 categories from the following list would best complete the look: ${allClothingCategories.join(', ')}. Do not select categories that are too similar to the originals.`,
    },
);

const determineComplementaryCategorySingularPrompt = ai.definePrompt(
    {
        name: 'determineComplementaryCategorySingular',
        input: { schema: z.object({ category: z.string(), gender: z.enum(["Male", "Female", "Unisex"]) }) },
        output: { schema: z.object({ categoriesToFind: z.array(z.string()) }) },
        prompt: `Based on the original clothing category '{{category}}' and gender '{{gender}}', decide which 1-3 categories from the following list would best complete the look: ${allClothingCategories.join(', ')}. Do not select a category that is too similar to the original.`,
    },
);

export const findComplementaryItems = ai.defineFlow(
  {
    name: 'findComplementaryItems',
    inputSchema: FindComplementaryItemsInputSchema,
    outputSchema: FindComplementaryItemsOutputSchema,
  },
  async (input): Promise<FindComplementaryItemsOutput> => {
    const complementaryItems: ComplementaryItem[] = [];
    const logs: Omit<LogEntry, 'id' | 'timestamp'>[] = [];
    let categoriesToFind: string[] = [];

    const { gender, country = 'United States', numItemsPerCategory = 2, includeLingerie = false, minPrice, maxPrice } = input;

    if ('category' in input && input.category) {
        const categoryResponse = await determineComplementaryCategorySingularPrompt({ category: input.category, gender });
        categoriesToFind = categoryResponse.output?.categoriesToFind || [];
        // Exclude original category
        categoriesToFind = categoriesToFind.filter(cat => cat !== input.category);
    } else if ('originalClothingCategories' in input) {
        const categoryResponse = await determineCategoriesPrompt({ originalClothingCategories: input.originalClothingCategories, gender });
        categoriesToFind = categoryResponse.output?.categoriesToFind || [];
        // Exclude original categories
        if (input.originalClothingCategories && input.originalClothingCategories.length > 0) {
            categoriesToFind = categoriesToFind.filter(cat => !input.originalClothingCategories.includes(cat));
        }
    }

    const numToFetch = numItemsPerCategory || 2;
    
    let brandList = [...preferredBrandsForStyleApproximation, ...accessoryOnlyBrands];
    if (gender === 'Female' && includeLingerie) {
      brandList = [...brandList, ...lingerieBrands];
    }
    
    for (const category of categoriesToFind) {
      if (!category) continue;
      
      let brandToUse: string;
      if (category === 'Accessories') {
        // Prioritize accessory-only brands for the 'Accessories' category
        brandToUse = accessoryOnlyBrands[Math.floor(Math.random() * accessoryOnlyBrands.length)];
      } else {
        // Exclude accessory-only brands for non-accessory categories
        const nonAccessoryBrands = brandList.filter(b => !accessoryOnlyBrands.includes(b));
        brandToUse = nonAccessoryBrands[Math.floor(Math.random() * nonAccessoryBrands.length)];
      }

      try {
        const apiInput = {howMany: numToFetch, category, brand: brandToUse, gender, country, minPrice, maxPrice};
        logs.push({ event: 'invoke', flow: 'callExternalApi', data: apiInput });
        const apiResponse = await callExternalApi(apiInput.howMany, apiInput.category, apiInput.brand, apiInput.gender, apiInput.country, apiInput.minPrice, apiInput.maxPrice);
        logs.push({ event: 'response', flow: 'callExternalApi', data: apiResponse });
        
        const items = apiResponse.imageURLs.map((imageUrl, index) => ({
          category: category,
          productName: apiResponse.productNames?.[index] || `${brandToUse} ${category}`,
          vendorLink: apiResponse.URLs[index],
          imageURL: imageUrl,
          merchantName: apiResponse.merchantNames?.[index] || 'Unknown Merchant',
          itemPrice: apiResponse.itemPrices?.[index] || 'Price not available',
        }));

        complementaryItems.push(...items);
      } catch (error) {
        console.error(`Error fetching complementary items for category ${category} and brand ${brandToUse}:`, error);
        logs.push({ event: 'error', flow: 'callExternalApi', data: { category, brandToUse, error: error instanceof Error ? error.message : String(error) } });
      }
    }

    return { complementaryItems, logs };
  }
);
