
'use server';

/**
 * @fileOverview An AI agent to analyze clothing images for brand identification, approximations, and style alternatives.
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
  genderDepartment: z.enum(["Male", "Female", "Unisex", "Auto"]).optional().describe("The user-specified gender department for the clothing items. If 'Auto', the AI will determine the gender."),
  includeLingerie: z.boolean().optional().describe("Whether to include lingerie brands in the recommendations. This is only considered when genderDepartment is 'Female'."),
  country: z.string().optional().describe("The user's country of residence. Use this to select brands that are relevant to the user's region."),
});
export type AnalyzeClothingImageInput = z.infer<typeof AnalyzeClothingImageInputSchema>;

const preferredBrandsForStyleApproximation = [
    "Allbirds", "Allbirds AU", "Allbirds NZ", "Backcountry", "Belstaff", "Belstaff (Europe)", "Belstaff UK",
    "Bloomingdale", "Bloomingdale AU", "Bloomingdale UK", "Champion.com (Hanesbrands Inc.)", "Culture Kings",
    "Culture Kings US", "D1 Milano", "Dynamite Clothing", "Fanatics", "Fanatics UK", "Fabletics Europe",
    "Fabletics eur", "Fabletics uk", "FEATURE", "Flag & Anthem", "FootJoy", "GOLF le Fleur", "Garage Clothing",
    "JanSport", "Kappa", "Kut from the Kloth", "LUISAVIAROMA", "Luxury Closet", "Luxury Closet eur",
    "Luxury Closet uk", "MLB", "MLB AU", "MLB CA", "MLB UK", "MLS", "MLS CA", "MYTHERESA", "MYTHERESA au",
    "MYTHERESA ca", "MYTHERESA eur", "MYTHERESA uk", "Mytheresa", "NBA", "NBA AU", "NBA CA", "NBA UK",
    "NFL", "NFL CA", "NFL UK", "NHL", "NHL CA", "NHL UK", "NIKE", "Nisolo", "North Face UK", "North Face uk",
    "Osprey", "PGA", "PUMA", "PUMA India", "PUMA Thailand", "Poshmark", "SKECHERS eur", "Skechers",
    "Street Machine Skate", "Taylor Stitch", "The Double F", "UGG", "UGG US", "Unique Vintage", "WNBA"
];

const lingerieBrands = [
    "Savage x Fenty", "The Tight Spot", "The Tight Spot ca", "The Tight Spot eur", "The Tight Spot uk", "The Tight Spot au",
    "Maidenform", "Bali Bras", "onehanesplace"
];

const clothingCategories = [
    "Top", "Tops", "Clothing", "Bottom", "Bottoms", "Pants", "Footwear", "Shoes",
    "Activewear", "Outerwear", "Sweaters", "Accessory", "Accessories",
    "TShirts", "Jeans", "Hats", "Headware", "Sweatshirts"
];

const AnalyzeClothingImageOutputSchema = z.object({
  clothingItems: z.array(z.string()).describe('List of clothing items or categories detected in the image (e.g., "T-Shirt", "Jeans", "Sneakers").'),
  genderDepartment: z.enum(["Male", "Female", "Unisex"]).describe("The gender department the clothing items primarily belong to. This must be strictly one of: Male, Female, or Unisex."),
  identifiedBrand: z.string().optional().describe('The brand name if explicitly identified by a logo/tag. If not explicitly identified, this field should be null or undefined.'),
  brandIsExplicit: z.boolean().describe('True if `identifiedBrand` is populated due to an explicit logo/tag being visible on the item. False otherwise.'),
  approximatedBrands: z.array(z.string()).describe("If 'brandIsExplicit' is false, this list will contain up to 5 brands from the preferred list that are stylistic approximations to the item(s) in the image. If 'brandIsExplicit' is true, this list must be empty."),
  alternativeBrands: z.array(z.string()).describe('A list of up to 5 brands from the preferred list that offer clothing items stylistically similar to the one(s) in the image. This should always be populated with relevant suggestions. These brands should be distinct from `identifiedBrand` if it is present and explicit.'),
});
export type AnalyzeClothingImageOutput = z.infer<typeof AnalyzeClothingImageOutputSchema>;

export async function analyzeClothingImage(input: AnalyzeClothingImageInput): Promise<AnalyzeClothingImageOutput | null> {
  try {
    const result = await analyzeClothingImageFlow(input);
    return result;
  } catch (e) {
    console.error("Error in analyzeClothingImage wrapper calling flow:", e);
    return null;
  }
}

const analyzeClothingImageFlow = ai.defineFlow(
  {
    name: 'analyzeClothingImageFlow',
    inputSchema: AnalyzeClothingImageInputSchema,
    outputSchema: AnalyzeClothingImageOutputSchema,
  },
  async (input): Promise<AnalyzeClothingImageOutput> => {
    try {
      const userProvidedGender = (input.genderDepartment && input.genderDepartment !== 'Auto') 
        ? input.genderDepartment 
        : null;

      const brandList = (input.genderDepartment === 'Female' && input.includeLingerie) 
        ? [...preferredBrandsForStyleApproximation, ...lingerieBrands]
        : preferredBrandsForStyleApproximation;

      const promptInput = { ...input };
      let analysisPrompt: any;

      if (userProvidedGender) {
        // If the user provided a gender, we use a prompt that doesn't ask the AI for it.
        const { genderDepartment, ...outputFieldsWithoutGender } = AnalyzeClothingImageOutputSchema.shape;
        analysisPrompt = ai.definePrompt({
          name: 'analyzeClothingImagePrompt_NoGender',
          input: { schema: AnalyzeClothingImageInputSchema },
          output: { schema: z.object(outputFieldsWithoutGender) },
          prompt: `You are an AI fashion assistant. Analyze the clothing in the image. You have been given the gender department by the user, so you do not need to determine it.
          The user's country is {{country}}. When suggesting brands, prioritize those that are most relevant to this country (e.g., brands with a 'UK' suffix for 'United Kingdom', or brands known to be popular in that region).
          - 'clothingItems': List the clothing items from this list: ${clothingCategories.join(', ')}.
          - Brand Identification: Identify the brand if a logo is visible.
          - Brand Approximations: If no brand is clear, suggest up to 5 stylistic matches from the Preferred Brand List.
          - Alternative Brands: Suggest up to 5 similar style brands from the Preferred Brand List.
          Preferred Brand List: ${brandList.join(', ')}
          Image: {{media url=photoDataUri}}`,
        });
      } else {
        // If gender is 'Auto', use the original prompt to let the AI decide.
        analysisPrompt = ai.definePrompt({
          name: 'analyzeClothingImagePrompt_WithGender',
          input: { schema: AnalyzeClothingImageInputSchema },
          output: { schema: AnalyzeClothingImageOutputSchema },
          prompt: `You are an AI fashion assistant. Analyze the clothing in the image.
          The user's country is {{country}}. When suggesting brands, prioritize those that are most relevant to this country (e.g., brands with a 'UK' suffix for 'United Kingdom', or brands known to be popular in that region).
          - 'clothingItems': List the clothing items from this list: ${clothingCategories.join(', ')}.
          - 'genderDepartment': Determine if the item is Male, Female, or Unisex. Prefer 'Male' or 'Female' over 'Unisex'.
          - Brand Identification: Identify the brand if a logo is visible.
          - Brand Approximations: If no brand is clear, suggest up to 5 stylistic matches from the Preferred Brand List.
          - Alternative Brands: Suggest up to 5 similar style brands from the Preferred Brand List.
          Preferred Brand List: ${brandList.join(', ')}
          Image: {{media url=photoDataUri}}`,
        });
      }

      const result = await analysisPrompt(promptInput);

      if (!result.output) {
        throw new Error("The AI model did not return a valid analysis.");
      }

      // Combine the results and enforce the user's gender choice.
      const finalOutput: AnalyzeClothingImageOutput = {
        ...result.output,
        genderDepartment: userProvidedGender || result.output.genderDepartment,
      };

      // Final data cleanup.
      if (finalOutput.brandIsExplicit && finalOutput.identifiedBrand) {
        finalOutput.approximatedBrands = [];
      }
      if (!finalOutput.brandIsExplicit) {
        finalOutput.identifiedBrand = undefined;
      }

      return finalOutput;

    } catch (e: any) {
      const errorMessage = `Error in analyzeClothingImageFlow: ${e.message || String(e)}`;
      console.error(errorMessage, e);
      throw new Error(errorMessage);
    }
  }
);
