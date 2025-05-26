
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
  clothingItem: z.string().describe('The type of clothing item (e.g., dress, shirt, pants).'),
  brand: z.string().optional().describe('The brand of the original clothing item, if known.'),
  dominantColors: z.array(z.string()).describe('The dominant colors of the clothing item.'),
  style: z.string().describe('The style of the clothing item (e.g., casual, formal, vintage).'),
});
export type FindSimilarItemsInput = z.infer<typeof FindSimilarItemsInputSchema>;

const SimilarItemSchema = z.object({
  itemName: z.string().describe('The name or a brief description of the similar clothing item, including brand if available.'),
  vendorLink: z.string().describe('A link to an online vendor selling this or a similar item. This must be a valid URL.'), // Removed .url() to avoid Gemini format conflict
});

const FindSimilarItemsOutputSchema = z.object({
  similarItems: z.array(SimilarItemSchema).describe('List of similar clothing items with their details and vendor links.'),
});
export type FindSimilarItemsOutput = z.infer<typeof FindSimilarItemsOutputSchema>;

export async function findSimilarItems(input: FindSimilarItemsInput): Promise<FindSimilarItemsOutput> {
  return findSimilarItemsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'findSimilarItemsPrompt',
  input: {schema: FindSimilarItemsInputSchema},
  output: {schema: FindSimilarItemsOutputSchema},
  prompt: `You are a highly skilled personal shopping assistant specializing in finding clothing items that closely match a reference image.
Analyze the provided reference image and the clothing description. Your goal is to find 3-5 similar items from online vendors.
Prioritize items that are visually very similar to the one in the reference image.

Reference Image: {{media url=photoDataUri}}

Clothing Item Type: {{{clothingItem}}}
{{#if brand}}Original Brand (if known): {{{brand}}}{{/if}}
Dominant Colors: {{#each dominantColors}}{{{this}}} {{/each}}
Style: {{{style}}}

If a brand is provided or discernible from the image, try to find items from that same brand or brands of similar style and quality. If the brand is not clear, focus on visual similarity, color, and style.
For each similar item, provide its name or a brief description (including the brand of the similar item if you can determine it) and a link to an online vendor.

Return a JSON object containing a list of 'similarItems', where each item has an 'itemName' (a descriptive name for the clothing item, including its brand) and a 'vendorLink' (a URL to an online store). Ensure the vendorLink is a complete and valid URL.
If no close matches are found, you can broaden your search slightly but still aim for visual and stylistic similarity. If you truly cannot find any items, return an empty list for 'similarItems'.`,
});

const findSimilarItemsFlow = ai.defineFlow(
  {
    name: 'findSimilarItemsFlow',
    inputSchema: FindSimilarItemsInputSchema,
    outputSchema: FindSimilarItemsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output || { similarItems: [] }; // Ensure an empty array if output is null or undefined
  }
);
