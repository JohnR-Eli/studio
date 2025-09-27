
'use server';

/**
 * @fileOverview An AI agent to analyze clothing images for brand identification, approximations, and style alternatives.
 *
 * - analyzeClothingImage - A function that handles the clothing image analysis process.
 * - AnalyzeClothingImageInput - The input type for the analyzeClothingImage function.
 * - AnalyzeClothingImageOutput - The return type for the analyzeClothingImage function.
 */

import { z } from 'zod';

const AnalyzeClothingImageInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of clothing, as a data URI. It must include a MIME type (e.g., 'image/jpeg', 'image/png') and use Base64 encoding for the image data. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  genderDepartment: z.enum(["Male", "Female", "Unisex", "Auto"]).optional().describe("The user-specified gender department for the clothing items. If 'Auto', the AI will determine the gender."),
  includeLingerie: z.boolean().optional().describe("Whether to include lingerie brands in the recommendations. This is only considered when genderDepartment is 'Female'."),
  country: z.string().optional().describe("The user's country of residence. Use this to select brands that are relevant to the user's region."),
  selectedModel: z.string().describe("The OpenRouter model to use for the analysis."),
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
  usage: z.object({
    total_tokens: z.number(),
    cost: z.number(),
  }).describe("Token and cost usage for the API call."),
});
export type AnalyzeClothingImageOutput = z.infer<typeof AnalyzeClothingImageOutputSchema>;

export async function analyzeClothingImage(input: AnalyzeClothingImageInput): Promise<AnalyzeClothingImageOutput | null> {
  try {
    const userProvidedGender = (input.genderDepartment && input.genderDepartment !== 'Auto')
      ? input.genderDepartment
      : null;

    const brandList = (input.genderDepartment === 'Female' && input.includeLingerie)
      ? [...preferredBrandsForStyleApproximation, ...lingerieBrands]
      : preferredBrandsForStyleApproximation;

    const promptFields = {
        clothingItems: 'List the clothing items from this list: ' + clothingCategories.join(', '),
        ...(userProvidedGender ? {} : { genderDepartment: "Determine if the item is Male, Female, or Unisex. Prefer 'Male' or 'Female' over 'Unisex'." }),
        brandIsExplicit: 'True if a brand logo is clearly visible, false otherwise.',
        identifiedBrand: 'The brand name if a logo is visible.',
        approximatedBrands: 'If no brand is clear, suggest up to 5 stylistic matches from the Preferred Brand List.',
        alternativeBrands: 'Suggest up to 5 similar style brands from the Preferred Brand List.',
    };

    const promptText = `You are an AI fashion assistant. Analyze the clothing in the image and provide the output in JSON format.
The user's country is ${input.country}. When suggesting brands, prioritize those that are most relevant to this country (e.g., brands with a 'UK' suffix for 'United Kingdom', or brands known to be popular in that region).
Respond with a valid JSON object containing the following fields:
${JSON.stringify(promptFields, null, 2)}

Preferred Brand List: ${brandList.join(', ')}`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: input.selectedModel,
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: promptText },
                        { type: 'image_url', image_url: { url: input.photoDataUri } },
                    ],
                },
            ],
            usage: { include: true },
        }),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    const result = await response.json();
    const analysisText = result.choices[0]?.message?.content;
    if (!analysisText) {
        throw new Error("No analysis content returned from OpenRouter.");
    }

    let analysisResult;
    try {
      // The response is a JSON string that needs to be parsed
      analysisResult = JSON.parse(analysisText);
    } catch (e) {
      console.error("Failed to parse JSON response from LLM:", analysisText);
      throw new Error("Received invalid JSON from the analysis model.");
    }


    const finalOutput: AnalyzeClothingImageOutput = {
      ...analysisResult,
      genderDepartment: userProvidedGender || analysisResult.genderDepartment,
      usage: {
        total_tokens: result.usage.total_tokens,
        cost: result.usage.cost,
      }
    };

    if (finalOutput.brandIsExplicit && finalOutput.identifiedBrand) {
      finalOutput.approximatedBrands = [];
    }
    if (!finalOutput.brandIsExplicit) {
      finalOutput.identifiedBrand = undefined;
    }

    return finalOutput;

  } catch (e: any) {
    const errorMessage = `Error in analyzeClothingImage: ${e.message || String(e)}`;
    console.error(errorMessage, e);
    // Returning null to allow the frontend to handle the error state
    return null;
  }
}
