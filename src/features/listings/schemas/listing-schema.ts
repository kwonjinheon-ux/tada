import { z } from "zod";

export const listingSchema = z.object({
  title: z.string().trim().min(4, "Use at least 4 characters.").max(120),
  mainCategory: z.string().min(1, "Select a main category."),
  subCategory: z.string().min(1, "Select a sub category."),
  tradeMethod: z.enum(["pickup_delivery", "pickup", "delivery"]),
  condition: z.enum(["brand_new", "like_new", "good", "fair"]),
  priceCents: z.coerce.number().int().positive("Enter a valid price."),
  region: z.string().min(1, "Select a region."),
  area: z.string().min(1, "Select an area."),
  meetingPlace: z.string().min(1, "Select a meeting place."),
  description: z.string().trim().min(20, "Tell buyers a little more.").max(5000),
});

export type ListingDraft = z.infer<typeof listingSchema>;
