import { z } from 'genkit';

export const SimilarItemSchema = z.object({
  productName: z.string(),
  merchantName: z.string(),
  itemPrice: z.string(),
  vendorLink: z.string().url(),
  imageURL: z.string().url(),
});
export type SimilarItem = z.infer<typeof SimilarItemSchema>;

export type LogEntry = {
  id: string;
  timestamp: string;
  event: 'invoke' | 'response' | 'error';
  flow: 'analyzeClothingImage' | 'findSimilarItems' | 'findComplementaryItems' | 'callExternalApi';
  data: any;
};

export type ClosetAnalysisResult = {
    dominantClothingItems: { item: string; count: number }[];
    dominantStyles: { style: string; count: number }[];
    recommendedBrands: string[];
};
