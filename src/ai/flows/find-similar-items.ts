
'use server';
/**
 * @fileOverview AI agent to find similar clothing items from online vendors,
 * including generating representative images for each item.
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
  itemTitle: z.string().describe('A concise title for the similar clothing item, including its brand if identifiable. This will be the main display text for the item.'),
  itemDescription: z.string().describe('A detailed description (2-3 sentences) of the similar clothing item, highlighting key features, materials, or why it is a good match. This will be shown as a preview on hover.'),
  vendorLink: z.string().describe('A link to an online vendor selling this or a similar item. This must be a valid URL.'),
  itemImageDataUri: z.string().optional().describe("A data URI of a newly generated image visually representing this similar item. Expected format: 'data:image/png;base64,<encoded_data>'. This field may be omitted if image generation fails or is not possible."),
});
export type SimilarItem = z.infer<typeof SimilarItemSchema>;

const FindSimilarItemsOutputSchema = z.object({
  similarItems: z.array(SimilarItemSchema).describe('List of similar clothing items with their details, vendor links, and generated image data URIs. Aim for 3-5 items.'),
});
export type FindSimilarItemsOutput = z.infer<typeof FindSimilarItemsOutputSchema>;

export async function findSimilarItems(input: FindSimilarItemsInput): Promise<FindSimilarItemsOutput> {
  return findSimilarItemsFlow(input);
}

const similarItemsTextPrompt = ai.definePrompt({
  name: 'similarItemsTextPrompt',
  input: {schema: FindSimilarItemsInputSchema},
  // Output schema for this prompt does not include itemImageDataUri, as that's handled separately
  output: {schema: z.object({
    similarItems: z.array(z.object({
        itemTitle: SimilarItemSchema.shape.itemTitle,
        itemDescription: SimilarItemSchema.shape.itemDescription,
        vendorLink: SimilarItemSchema.shape.vendorLink,
    })).describe('List of similar clothing items with their details and vendor links. Aim for 3-5 items.'),
  })},
  prompt: `You are a highly skilled personal shopping assistant specializing in finding clothing items that closely match a reference image.
Analyze the provided reference image and the clothing description. Your goal is to find similar items from online vendors.
Prioritize items that are visually very similar to the one in the reference image.

Reference Image: {{media url=photoDataUri}}

Clothing Item Type: {{{clothingItem}}}
{{#if brand}}Original Brand (if known): {{{brand}}}{{/if}}
Dominant Colors: {{#each dominantColors}}{{{this}}} {{/each}}
Style: {{{style}}}

If a brand is provided or discernible from the image, try to find items from that same brand or brands of similar style and quality. If the brand is not clear, focus on visual similarity, color, and style.

For each similar item, provide:
1.  'itemTitle': A concise title for the clothing item, including its brand if identifiable. This will be displayed as the main link text.
2.  'itemDescription': A more detailed description (2-3 sentences) highlighting key features, materials, or why it's a strong match to the original. This will be shown as a preview on hover.
3.  'vendorLink': A valid URL to an online vendor selling this or a similar item.

Return a JSON object containing a list of 'similarItems'. Ensure you provide at least 3, and up to 5, distinct similar items if suitable matches can be found. If you truly cannot find at least 3 items, return as many as you can find. If no items are found, return an empty list for 'similarItems'. Ensure the vendorLink is a complete and valid URL.`,
});

const findSimilarItemsFlow = ai.defineFlow(
  {
    name: 'findSimilarItemsFlow',
    inputSchema: FindSimilarItemsInputSchema,
    outputSchema: FindSimilarItemsOutputSchema,
  },
  async (input: FindSimilarItemsInput): Promise<FindSimilarItemsOutput> => {
    // Step 1: Get textual descriptions of similar items
    const {output: textOutput} = await similarItemsTextPrompt(input);

    if (!textOutput || !textOutput.similarItems || textOutput.similarItems.length === 0) {
      return { similarItems: [] };
    }

    // Step 2: For each item, generate an image
    const enrichedItems: SimilarItem[] = [];
    for (const item of textOutput.similarItems) {
      let itemImageDataUri: string | undefined = undefined;
      try {
        const imageGenPrompt = `Generate a clear, well-lit studio photograph of a single clothing item that matches this description: "${item.itemTitle} - ${item.itemDescription}". The image should focus solely on the item itself against a neutral background. Do not include any text, logos, or people in the image.`;
        
        const { media } = await ai.generate({
          model: 'googleai/gemini-2.0-flash-exp', // Explicitly use the image generation model
          prompt: imageGenPrompt,
          config: {
            responseModalities: ['TEXT', 'IMAGE'], // Must provide both
          },
        });
        
        if (media && media.url) {
          itemImageDataUri = media.url;
        }
      } catch (e) {
        console.error(`Failed to generate image for item "${item.itemTitle}":`, e);
        // Image generation failed, itemImageDataUri will remain undefined
      }
      
      enrichedItems.push({
        ...item,
        itemImageDataUri,
      });
    }

    return { similarItems: enrichedItems };
  }
);
