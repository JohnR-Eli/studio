
'use server';

/**
 * @fileOverview An AI agent to analyze clothing images.
 *
 * - analyzeClothingImage - A function that handles the clothing image analysis process.
 * - AnalyzeClothingImageInput - The input type for the analyzeClothingImage function.
 * - AnalyzeClothingImageOutput - The return type for the analyzeClothingImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeClothingImageInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of clothing, as a data URI. It must include a MIME type (e.g., 'image/jpeg', 'image/png') and use Base64 encoding for the image data. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzeClothingImageInput = z.infer<typeof AnalyzeClothingImageInputSchema>;

const AnalyzeClothingImageOutputSchema = z.object({
  clothingItems: z.array(z.string()).describe('List of clothing items or categories detected in the image (e.g., "T-Shirt", "Jeans", "Sneakers").'),
  genderDepartment: z.string().describe("The gender department the clothing items primarily belong to. This must be strictly one of: \"Men's\", \"Women's\", or \"Unisex\"."),
  brand: z.string().describe('The brand of the clothing. Make your best effort to identify the brand from visual cues (logos, tags), distinctive design elements, or the overall style characteristic of a known brand. If after careful analysis no brand is clearly identifiable, you MUST choose one brand from the provided list where the item would fit best. You must always return a brand name; do not return a null or empty response for the brand.'),
  brandIsExplicit: z.boolean().describe('True if the brand was explicitly identified from clear visual cues (e.g., a visible logo or tag), false if the brand was an approximation or chosen from the fallback list.'),
});
export type AnalyzeClothingImageOutput = z.infer<typeof AnalyzeClothingImageOutputSchema>;

export async function analyzeClothingImage(input: AnalyzeClothingImageInput): Promise<AnalyzeClothingImageOutput | null> {
  try {
    return await analyzeClothingImageFlow(input);
  } catch (e) {
    console.error("Error in analyzeClothingImage wrapper calling flow:", e);
    return null;
  }
}

const prompt = ai.definePrompt({
  name: 'analyzeClothingImagePrompt',
  input: {schema: AnalyzeClothingImageInputSchema},
  output: {schema: AnalyzeClothingImageOutputSchema},
  prompt: `You are an AI fashion assistant. Analyze the clothing in the image and provide the following information:

- A list of the clothing items or categories present in the image (e.g., "T-Shirt", "Dress", "Hoodie").
- The gender department the clothing items primarily belong to. This must be strictly one of: "Men's", "Women's", or "Unisex".
- The brand of the clothing. Make your best effort to identify the brand from visual cues (logos, tags), distinctive design elements, or the overall style characteristic of a known brand. If after careful analysis no brand is clearly identifiable, you MUST choose one brand from the following list where the item would fit best: Unique Vintage, PUMA, Osprey, NBA, Kappa, Fanatics, Nisolo, Backcountry, Allbirds, FEATURE, MLB, PGA, NHL, Flag & Anthem, MLS, NFL, GOLF le Fleur, Taylor Stitch, The North Face, NIKE, LUISAVIAROMA, FootJoy, The Luxury Closet, Savage X Fenty, Bali Bras, Belstaff, Belstaff UK, Culture Kings US, D1 Milano, Double F, onehanesplace.com, Jansport, Kut from the Kloth, Maidenform, UGG US. You must always return a brand name; do not return a null or empty response for the brand.
- 'brandIsExplicit': Set this to true if the brand was identified from a clear, visible logo or tag on the item itself. Set it to false if the brand identification is an approximation based on style, if it was chosen from the fallback list because no brand was clear, or if you are otherwise not highly confident it's the exact brand shown.

Image: {{media url=photoDataUri}}`,
});

const analyzeClothingImageFlow = ai.defineFlow(
  {
    name: 'analyzeClothingImageFlow',
    inputSchema: AnalyzeClothingImageInputSchema,
    outputSchema: AnalyzeClothingImageOutputSchema,
  },
  async (input): Promise<AnalyzeClothingImageOutput> => {
    try {
      const result = await prompt(input);
      if (result.output) {
        return result.output;
      }
      const errorMessage = "analyzeClothingImageFlow: Prompt did not return a valid output.";
      console.error(errorMessage, result);
      throw new Error(errorMessage);
    } catch (e: any) {
      const errorMessage = `Error in analyzeClothingImageFlow: ${e.message || String(e)}`;
      console.error(errorMessage, e);
      throw new Error(errorMessage);
    }
  }
);

