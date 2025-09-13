'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { preferredBrands, lingerieBrands } from '@/lib/constants';

const RecommendBrandsFromTagsInputSchema = z.object({
  tags: z.array(z.string()).describe("A list of clothing items and styles."),
  includeLingerie: z.boolean().optional().describe("Whether to include lingerie brands in the recommendations."),
});
export type RecommendBrandsFromTagsInput = z.infer<typeof RecommendBrandsFromTagsInputSchema>;

const RecommendBrandsFromTagsOutputSchema = z.object({
  recommendedBrands: z.array(z.string()).describe("A list of up to 10 recommended brand names based on the provided tags."),
});
export type RecommendBrandsFromTagsOutput = z.infer<typeof RecommendBrandsFromTagsOutputSchema>;

export async function recommendBrandsFromTags(input: RecommendBrandsFromTagsInput): Promise<RecommendBrandsFromTagsOutput | null> {
  try {
    return await recommendBrandsFromTagsFlow(input);
  } catch (e) {
    console.error("Error in recommendBrandsFromTags:", e);
    return null;
  }
}

const recommendBrandsFromTagsFlow = ai.defineFlow(
  {
    name: 'recommendBrandsFromTagsFlow',
    inputSchema: RecommendBrandsFromTagsInputSchema,
    outputSchema: RecommendBrandsFromTagsOutputSchema,
  },
  async (input) => {
    const brandList = input.includeLingerie
      ? [...preferredBrands, ...lingerieBrands]
      : preferredBrands;

    const prompt = `You are an AI fashion assistant. Based on the following fashion tags, recommend up to 10 suitable clothing brands.
    The user is interested in: ${input.tags.join(', ')}.

    Choose from the following list of preferred brands: ${brandList.join(', ')}.

    Return only the list of brand names in the 'recommendedBrands' field.`;

    const llmResponse = await ai.generate({
      prompt,
      model: 'googleai/gemini-1.5-flash',
      output: {
        schema: RecommendBrandsFromTagsOutputSchema,
      },
    });

    return llmResponse.output || { recommendedBrands: [] };
  }
);
