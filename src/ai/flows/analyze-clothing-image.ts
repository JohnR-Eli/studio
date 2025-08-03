
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
});
export type AnalyzeClothingImageInput = z.infer<typeof AnalyzeClothingImageInputSchema>;

const preferredBrandsForStyleApproximation = [
  "Unique Vintage", "PUMA", "Osprey", "NBA", "Kappa", "Fanatics", "Nisolo", 
  "Backcountry", "Allbirds", "FEATURE", "MLB", "PGA", "NHL", "Flag & Anthem", 
  "MLS", "NFL", "GOLF le Fleur", "Taylor Stitch", "The North Face", "NIKE", 
  "LUISAVIAROMA", "FootJoy", "The Luxury Closet", "Savage X Fenty", "Bali Bras", 
  "Belstaff", "Belstaff UK", "Culture Kings US", "D1 Milano", "Double F", 
  "onehanesplace.com", "Jansport", "Kut from the Kloth", "Maidenform", "UGG US"
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

const prompt = ai.definePrompt({
  name: 'analyzeClothingImagePrompt',
  input: {schema: AnalyzeClothingImageInputSchema},
  output: {schema: AnalyzeClothingImageOutputSchema},
  prompt: `You are an AI fashion assistant with an expert eye for detail. Analyze the clothing in the image and provide the following information:

- 'clothingItems': A list of the clothing items or categories present in the image. This must be strictly one of the following: ${clothingCategories.join(', ')}.
- 'genderDepartment': Determine the primary gender department for the clothing. Critically evaluate the item's cut, style, and form.
    - If the item's design strongly suggests a specific gender (e.g., a dress, a tailored suit), you must classify it as "Male" or "Female".
    - Reserve the "Unisex" classification for items that are genuinely and commonly marketed to both genders without significant stylistic changes (e.g., basic crewneck T-shirts, many sneakers, beanies).
    - If an item has a style that leans towards one gender, even if it could be worn by anyone, choose the gender it is primarily marketed towards. For example, a floral blouse should be "Female" even if a male could wear it. A boxy, oversized hoodie might be "Unisex". Do not default to "Unisex" out of caution; make a specific choice based on the evidence in the image.

Brand Identification:
- Carefully examine the image for any explicit brand indicators like logos, tags, or highly distinctive, brand-specific design elements.
- If a brand is clearly and explicitly identifiable from such indicators:
    - Set 'identifiedBrand' to the name of this brand.
    - Set 'brandIsExplicit' to true.
    - Set 'approximatedBrands' to an empty list.
- If no brand is explicitly identifiable from clear indicators:
    - Set 'identifiedBrand' to null or ensure it is not populated.
    - Set 'brandIsExplicit' to false.
    - From the 'Preferred Brand List' below, identify up to 5 brands that are the closest stylistic approximations to the item(s) shown. Populate 'approximatedBrands' with these brand names. If fewer than 5 strong approximations are found, list as many as are appropriate. An empty list is acceptable if no reasonable approximations can be made from the list.

Alternative Stylistic Brands:
- Regardless of whether a brand was explicitly identified or if approximations were made, you MUST provide a list for 'alternativeBrands'.
- Populate 'alternativeBrands' with up to 5 brands from the *same 'Preferred Brand List'* below. These brands should be known for a style that is similar to the item(s) in the image.
- If 'identifiedBrand' was populated (meaning brandIsExplicit is true), the brands in 'alternativeBrands' should ideally be different from 'identifiedBrand' to offer true alternatives. If this is not possible while maintaining stylistic relevance from the preferred list, some overlap is acceptable but prioritize diversity first.
- Ensure 'alternativeBrands' always contains up to 5 relevant suggestions from the preferred list if stylistically appropriate matches can be found. If fewer than 5 are truly relevant, provide as many as are. If no relevant alternative brands can be found from the list, it's acceptable for 'alternativeBrands' to be an empty list.

Preferred Brand List (use this for 'approximatedBrands' and 'alternativeBrands'):
${preferredBrandsForStyleApproximation.join(', ')}

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
        // Ensure approximatedBrands is empty if brandIsExplicit is true and identifiedBrand is set
        if (result.output.brandIsExplicit && result.output.identifiedBrand) {
          result.output.approximatedBrands = [];
        }
        // Ensure identifiedBrand is null/undefined if brandIsExplicit is false
        if (!result.output.brandIsExplicit) {
            result.output.identifiedBrand = undefined;
        }
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
