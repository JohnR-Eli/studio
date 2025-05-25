
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
  clothingItem: z.string().describe('The type of clothing item (e.g., dress, shirt, pants).'),
  dominantColors: z.array(z.string()).describe('The dominant colors of the clothing item.'),
  style: z.string().describe('The style of the clothing item (e.g., casual, formal, vintage).'),
});
export type FindSimilarItemsInput = z.infer<typeof FindSimilarItemsInputSchema>;

const SimilarItemSchema = z.object({
  itemName: z.string().describe('The name or a brief description of the similar clothing item.'),
  vendorLink: z.string().describe('A link to an online vendor selling this or a similar item. This must be a valid URL.'),
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
  prompt: `You are a personal shopping assistant. Given the following clothing item description, find similar items from online vendors. For each item, provide its name or a brief description, and a link to an online vendor.

Clothing Item: {{{clothingItem}}}
Dominant Colors: {{#each dominantColors}}{{{this}}} {{/each}}
Style: {{{style}}}

Return a JSON object containing a list of 'similarItems', where each item has an 'itemName' (a descriptive name for the clothing item) and a 'vendorLink' (a URL to an online store). Ensure the vendorLink is a complete and valid URL.
`,
});

const findSimilarItemsFlow = ai.defineFlow(
  {
    name: 'findSimilarItemsFlow',
    inputSchema: FindSimilarItemsInputSchema,
    outputSchema: FindSimilarItemsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output || { similarItems: [] }; // Ensure an empty array if output is null
  }
);

