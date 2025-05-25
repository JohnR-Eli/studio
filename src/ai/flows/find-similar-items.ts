// Implemented Genkit flow for finding similar clothing items from online vendors based on image analysis.
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

const FindSimilarItemsOutputSchema = z.object({
  vendorLinks: z.array(z.string()).describe('Links to online vendors selling similar items.'),
});
export type FindSimilarItemsOutput = z.infer<typeof FindSimilarItemsOutputSchema>;

export async function findSimilarItems(input: FindSimilarItemsInput): Promise<FindSimilarItemsOutput> {
  return findSimilarItemsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'findSimilarItemsPrompt',
  input: {schema: FindSimilarItemsInputSchema},
  output: {schema: FindSimilarItemsOutputSchema},
  prompt: `You are a personal shopping assistant. Given the following clothing item description, find links to online vendors that sell similar items.

Clothing Item: {{{clothingItem}}}
Dominant Colors: {{#each dominantColors}}{{{this}}} {{/each}}
Style: {{{style}}}

Return a JSON array of links to online vendors.
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
    return output!;
  }
);
