import { z } from 'genkit';

export const SimilarItemSchema = z.object({
  productName: z.string(),
  merchantName: z.string(),
  itemPrice: z.string(),
  vendorLink: z.string().url(),
  imageURL: z.string().url(),
});
export type SimilarItem = z.infer<typeof SimilarItemSchema>;
