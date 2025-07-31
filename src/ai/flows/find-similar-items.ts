
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

const FindSimilarItemsInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "The original image of the clothing item, as a data URI. It must include a MIME type (e.g., 'image/jpeg', 'image/png') and use Base64 encoding for the image data. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  clothingItem: z.string().describe('The type or category of clothing item (e.g., dress, shirt, pants, or a general placeholder like "clothing item from image").'),
  targetBrandName: z.string().describe('The specific brand name to primarily find similar items from. This brand is typically one of the alternative brands suggested by the image analysis step.'),
  country: z.string().optional().describe('The country of residence of the user, used to prioritize vendors from that country. If not provided, it will default to United States.'),
  numSimilarItems: z.number().optional().default(5).describe('The number of similar items to find. Defaults to 5.')
});
export type FindSimilarItemsInput = z.infer<typeof FindSimilarItemsInputSchema>;

const SimilarItemSchema = z.object({
  itemTitle: z.string().describe('A concise title for the similar clothing item, including its brand if identifiable (e.g., "Nike Sportswear Club Hoodie"). This will be the main display text for the item.'),
  itemDescription: z.string().describe('A detailed description (2-3 sentences) of the similar clothing item, highlighting key features, materials, or why it is a good match. This will be shown as a preview on hover.'),
  vendorLink: z.string().describe('A direct URL to the product page on an online vendor site if a specific match is found. If not, a URL to a search results page on the vendor\'s site for the item (e.g., "https://vendor.com/search?q=item+description") or a relevant category page. This must be a valid URL.'),
});
export type SimilarItem = z.infer<typeof SimilarItemSchema>;

const FindSimilarItemsOutputSchema = z.object({
  similarItems: z.array(SimilarItemSchema).describe('List of up to a specified number of similar clothing items with their details and vendor links, suitable for adults (early 20s and older). These should primarily be from the targetBrandName, supplemented by other preferred brands if needed.'),
});
export type FindSimilarItemsOutput = z.infer<typeof FindSimilarItemsOutputSchema>;

export async function findSimilarItems(input: FindSimilarItemsInput): Promise<FindSimilarItemsOutput> {
  return findSimilarItemsFlow(input);
}

const preferredBrandsList = ["Culture Kings", "Kut from the Kloth", "UGG", "JanSport", "onehanesplace", "Maidenform", "Bali Bras", "Belstaff", "The Double F", "Belstaff UK", "D1 Milano", "Street Machine Skate", "Bloomingdale", "Bloomingdale UK", "Bloomingdale Australia", "NIKE", "North Face", "LUISAVIAROMA", "Savage x Fenty", "Luxury Closet", "FootJoy", "SKECHERS", "PUMA India", "MYTHERESA", "Poshmark", "The Tight Spot", "Fabletics", "Dynamite Clothing", "Garage Clothing", "Unique Vintage", "PUMA", "Osprey", "NBA", "Kappa", "Fanatics", "Nisolo", "Backcountry", "Allbirds", "FEATURE", "MLB", "PGA", "NHL", "Flag & Anthem", "MLS", "NFL", "GOLF le Fleur", "Taylor Stitch"];
const preferredBrandsString = preferredBrandsList.map(b => `- ${b}`).join('');

const similarItemsTextPrompt = ai.definePrompt({
  name: 'similarItemsTextPrompt',
  input: {schema: FindSimilarItemsInputSchema},
  output: {schema: FindSimilarItemsOutputSchema },
  prompt: `You are a highly skilled personal shopping assistant.
The target audience for these recommendations is individuals in their early 20s or older. **Ensure all recommended items are suitable for adults and explicitly exclude any child-specific items or items primarily marketed towards children/teens.**

Analyze the provided reference image and the clothing description.
Reference Image: {{media url=photoDataUri}}
Clothing Item Category: {{{clothingItem}}}
Target Brand to Focus On: {{{targetBrandName}}}
User's Country of Residence: {{{country}}}

Your primary goal is to find up to {{{numSimilarItems}}} clothing items that are stylistically similar to the item in the reference image.

Search and Recommendation Strategy:

1.  **Prioritize Target Brand:** Your main task is to find items *from the targetBrandName* that are stylistically similar to the item shown in the reference image.
2.  **Prioritize Local Vendors:** When generating vendor links, prioritize vendors that ship to or are based in the specified "User's Country of Residence". If the country is not specified, default to "United States".
3.  **Supplement with Preferred Brands List (If Necessary):** If you cannot find up to {{{numSimilarItems}}} suitable items directly from the targetBrandName, you may supplement your recommendations with stylistically similar items from the following 'Preferred Brands List':
    ${preferredBrandsString}
    Only use this list to complete the set of up to {{{numSimilarItems}}} items if the targetBrandName itself doesn't yield enough relevant options.
4.  **Focus on Stylistic Similarity:** The items should match the style of the clothing in the reference image.
5.  **Item Availability:** Prioritize items that are likely to be currently in stock (e.g., from current collections).

For each similar item you suggest, provide:
1.  'itemTitle': A concise title for the clothing item. Include the brand of this *similar item*.
2.  'itemDescription': A detailed description (2-3 sentences) highlighting key features, materials, or why it's a strong stylistic match.
3.  'vendorLink': A direct URL to the product page or a relevant search/category page. Ensure this is a valid URL and, if possible, for a vendor in the user's country.

Return a JSON object containing a list of 'similarItems'. Provide up to {{{numSimilarItems}}} distinct similar items. If no items are found, return an empty list for 'similarItems'.`,
});

const findSimilarItemsFlow = ai.defineFlow(
  {
    name: 'findSimilarItemsFlow',
    inputSchema: FindSimilarItemsInputSchema,
    outputSchema: FindSimilarItemsOutputSchema,
  },
  async (input: FindSimilarItemsInput): Promise<FindSimilarItemsOutput> => {
    try {
	  const country = input.country || 'United States';
      const numSimilarItems = input.numSimilarItems || 5;
      const {output} = await similarItemsTextPrompt({...input, country, numSimilarItems});

      if (output && output.similarItems) {
        return output;
      }
      // If output or output.similarItems is null/undefined, return a valid empty state.
      return { similarItems: [] };
    } catch (e) {
      console.error(`Error in findSimilarItemsFlow for brand ${input.targetBrandName}:`, e);
      // In case of an error, also return a valid empty state.
      return { similarItems: [] };
    }
  }
);
