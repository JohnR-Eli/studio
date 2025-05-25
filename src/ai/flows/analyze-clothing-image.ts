// 'use server';

/**
 * @fileOverview An AI agent to analyze clothing images.
 *
 * - analyzeClothingImage - A function that handles the clothing image analysis process.
 * - AnalyzeClothingImageInput - The input type for the analyzeClothingImage function.
 * - AnalyzeClothingImageOutput - The return type for the analyzeClothingImage function.
 */

'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeClothingImageInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      'A photo of clothing, as a data URI that must include a MIME type and use Base64 encoding. Expected format: data:<mimetype>;base64,<encoded_data>.'
    ),
});
export type AnalyzeClothingImageInput = z.infer<typeof AnalyzeClothingImageInputSchema>;

const AnalyzeClothingImageOutputSchema = z.object({
  clothingItems: z.array(z.string()).describe('List of clothing items detected in the image.'),
  dominantColors: z.array(z.string()).describe('List of dominant colors detected in the clothing.'),
  style: z.string().describe('The overall style of the clothing (e.g., casual, formal, vintage).'),
});
export type AnalyzeClothingImageOutput = z.infer<typeof AnalyzeClothingImageOutputSchema>;

export async function analyzeClothingImage(input: AnalyzeClothingImageInput): Promise<AnalyzeClothingImageOutput> {
  return analyzeClothingImageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeClothingImagePrompt',
  input: {schema: AnalyzeClothingImageInputSchema},
  output: {schema: AnalyzeClothingImageOutputSchema},
  prompt: `You are an AI fashion assistant. Analyze the clothing in the image and provide the following information:

- A list of the clothing items present in the image.
- A list of the dominant colors in the clothing.
- The overall style of the clothing (e.g., casual, formal, vintage).

Image: {{media url=photoDataUri}}`,
});

const analyzeClothingImageFlow = ai.defineFlow(
  {
    name: 'analyzeClothingImageFlow',
    inputSchema: AnalyzeClothingImageInputSchema,
    outputSchema: AnalyzeClothingImageOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
