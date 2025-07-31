
'use server';

import { z } from 'zod';

const ApiResponseSchema = z.object({
  imageURLs: z.array(z.string()),
  URLs: z.array(z.string()),
});

export type ApiResponse = z.infer<typeof ApiResponseSchema>;

export async function callExternalApi(
  howMany: number,
  category: string,
  brand: string,
  gender: string,
  country: string
): Promise<ApiResponse> {
  const endpoint = 'https://idx-fitted-affiliategit-93924427-92591340310.us-east1.run.app/process';
  const queryParams = new URLSearchParams({
    howMany: howMany.toString(),
    category,
    brand,
    gender,
    country,
  });

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
