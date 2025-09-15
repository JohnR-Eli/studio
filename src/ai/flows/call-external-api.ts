
'use server';

import { z } from 'zod';

const ApiResponseSchema = z.object({
  imageURLs: z.array(z.string()),
  URLs: z.array(z.string()),
  productNames: z.array(z.string()).optional(),
  merchantNames: z.array(z.string()).optional(),
  itemPrices: z.array(z.string()).optional(),
});

export type ApiResponse = z.infer<typeof ApiResponseSchema>;

export type WardrobeItem = {
    category: string;
    brand: string;
};

export async function callWardrobeApi(
  howMany: number,
  gender: string,
  country: string,
  wardrobe: WardrobeItem[],
  minPrice?: number,
  maxPrice?: number
): Promise<ApiResponse> {
  const endpoint = 'https://idx-fitted-affiliategit-93924427-92591340310.us-east1.run.app/process/wardrobe';
  const queryParams = new URLSearchParams({
    HowMany: howMany.toString(),
    gender,
    country,
  });

  if (minPrice !== undefined) {
    queryParams.append('minPrice', minPrice.toFixed(2));
  }
  if (maxPrice !== undefined) {
    queryParams.append('maxPrice', maxPrice.toFixed(2));
  }

  const url = `${endpoint}?${queryParams}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(wardrobe),
    });

    if (!response.ok) {
      throw new Error(`API call failed with status: ${response.status}`);
    }
    const data = await response.json();
    return ApiResponseSchema.parse(data);
  } catch (error) {
    console.error('Error calling wardrobe API:', error);
    throw new Error('Failed to fetch data from the wardrobe API.');
  }
}

export async function callExternalApi(
  howMany: number,
  category: string,
  brand: string,
  gender: string,
  country: string,
  minPrice?: number,
  maxPrice?: number
): Promise<ApiResponse> {
  const endpoint = 'https://idx-fitted-affiliategit-93924427-92591340310.us-east1.run.app/process';
  const queryParams = new URLSearchParams({
    howMany: howMany.toString(),
    category,
    brand,
    gender,
    country,
  });

  if (minPrice !== undefined) {
    queryParams.append('minPrice', minPrice.toString());
  }
  if (maxPrice !== undefined) {
    queryParams.append('maxPrice', maxPrice.toString());
  }

  const url = `${endpoint}?${queryParams}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API call failed with status: ${response.status}`);
    }
    const data = await response.json();
    return ApiResponseSchema.parse(data);
  } catch (error) {
    console.error('Error calling external API:', error);
    throw new Error('Failed to fetch data from the external API.');
  }
}
