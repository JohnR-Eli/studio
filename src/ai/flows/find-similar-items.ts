
'use server';
/**
 * @fileOverview AI agent to find similar clothing items from online vendors.
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
  brand: z.string().optional().describe('The brand of the original clothing item, if known. This is highly useful for finding accurate matches or alternatives.'),
});
export type FindSimilarItemsInput = z.infer<typeof FindSimilarItemsInputSchema>;

const SimilarItemSchema = z.object({
  itemTitle: z.string().describe('A concise title for the similar clothing item, including its brand if identifiable (e.g., "Nike Sportswear Club Hoodie"). This will be the main display text for the item.'),
  itemDescription: z.string().describe('A detailed description (2-3 sentences) of the similar clothing item, highlighting key features, materials, or why it is a good match. This will be shown as a preview on hover.'),
  vendorLink: z.string().describe('A direct URL to the product page on an online vendor site if a specific match is found. If not, a URL to a search results page on the vendor\'s site for the item (e.g., "https://vendor.com/search?q=item+description") or a relevant category page. This must be a valid URL.'),
});
export type SimilarItem = z.infer<typeof SimilarItemSchema>;

const FindSimilarItemsOutputSchema = z.object({
  similarItems: z.array(SimilarItemSchema).describe('List of similar clothing items with their details and vendor links. Aim for at least 5 items suitable for adults (early 20s and older).'),
});
export type FindSimilarItemsOutput = z.infer<typeof FindSimilarItemsOutputSchema>;

export async function findSimilarItems(input: FindSimilarItemsInput): Promise<FindSimilarItemsOutput> {
  return findSimilarItemsFlow(input);
}

const preferredBrandsList = [
  "Unique Vintage", "PUMA", "Osprey", "NBA", "Kappa", "Fanatics", "Nisolo", 
  "Backcountry", "Allbirds", "FEATURE", "MLB", "PGA", "NHL", "Flag & Anthem", 
  "MLS", "NFL", "GOLF le Fleur", "Taylor Stitch", "The North Face", "NIKE", 
  "LUISAVIAROMA", "FootJoy", "The Luxury Closet", "Savage X Fenty", "Bali Bras", 
  "Belstaff", "Belstaff UK", "Culture Kings US", "D1 Milano", "Double F", 
  "onehanesplace.com", "Jansport", "Kut from the Kloth", "Maidenform", "UGG US"
];

const similarItemsTextPrompt = ai.definePrompt({
  name: 'similarItemsTextPrompt',
  input: {schema: FindSimilarItemsInputSchema},
  output: {schema: FindSimilarItemsOutputSchema },
  prompt: `You are a highly skilled personal shopping assistant specializing in finding clothing items that closely match a reference image and description.
The target audience for these recommendations is individuals in their early 20s or older. **Ensure all recommended items are suitable for adults and explicitly exclude any child-specific items or items primarily marketed towards children/teens.**
Analyze the provided reference image and the clothing description. Your goal is to find at least 5 similar items from online vendors.

Reference Image: {{media url=photoDataUri}}

Clothing Item Category: {{{clothingItem}}}
{{#if brand}}Original Brand (if known): {{{brand}}}{{/if}}

**Primary Brand Focus:**
Your search for similar items **MUST strongly prioritize** brands from the following exclusive list:
${preferredBrandsList.map(b => `- ${b}`).join('\n')}

**Search Strategy:**
1.  **Original Brand Check:** If the Original Brand is known (from the 'Original Brand (if known)' field above) AND it is part of the exclusive list, you should make every effort to find items from this specific original brand first, from the exclusive list.
2.  **Preferred List Search:** If the Original Brand is known but NOT part of the exclusive list above, OR if the Original Brand is NOT known, you MUST primarily search for matches within the exclusive list of brands provided above.
3.  **Resorting to Other Brands (Only if Necessary):** Only if you have exhausted all reasonable options and cannot find any suitable similar items from the exclusive list of brands, you may then (and only then) consider items from:
    a. The original brand (if it was known but not on the exclusive list).
    b. Other brands that are visually very similar and of comparable style/quality.

Prioritize items that are visually very similar to the one in the reference image. When selecting items, try to choose products that are likely to be currently in stock and available for purchase (e.g., prefer items from current collections, and be cautious with items that appear to be on clearance or from very old listings, as they are more likely to be out of stock).

For each similar item you suggest, provide:
1.  'itemTitle': A concise title for the clothing item. Crucially, if you can identify the brand of this *similar item*, include it in the title (e.g., "BrandName Casual Linen Shirt", "DesignerX Floral Maxi Dress").
2.  'itemDescription': A more detailed description (2-3 sentences) highlighting key features, materials, or why it's a strong match to the original.
3.  'vendorLink': A direct URL to the product page for an item you believe to be currently available on an online vendor site if a specific match is found. If an exact product page for an in-stock item isn't clear, provide a URL to a search results page on the vendor's site for the item (e.g., "https://vendor.com/search?q=BrandName+Red+Dress") or a relevant category page that is likely to contain similar, available items. Ensure this is a valid URL.

Return a JSON object containing a list of 'similarItems'. Ensure you provide at least 5 distinct similar items suitable for an adult audience if suitable matches can be found. If you truly cannot find at least this many, return as many as you can find. If no items are found, return an empty list for 'similarItems'.`,
});

const findSimilarItemsFlow = ai.defineFlow(
  {
    name: 'findSimilarItemsFlow',
    inputSchema: FindSimilarItemsInputSchema,
    outputSchema: FindSimilarItemsOutputSchema,
  },
  async (input: FindSimilarItemsInput): Promise<FindSimilarItemsOutput> => {
    const {output} = await similarItemsTextPrompt(input);

    if (!output || !output.similarItems || output.similarItems.length === 0) {
      return { similarItems: [] };
    }
    
    return output;
  }
);

