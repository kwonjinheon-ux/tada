import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";
import { bargainFeedQuerySchema } from "@/contracts/api";
import type { Listing } from "@/data/listings";
import { formatMarketPrice } from "@/lib/market/format-price";
import { getSignedStorageImages } from "@/lib/supabase/storage-image";

type BargainQuery = z.infer<typeof bargainFeedQuerySchema>;
type BargainRow = { id: string; title: string; price_cents: number; main_location: string | null; sub_location: string | null; region_city: string | null; region_suburb: string | null; category_slug: string | null; subcategory_slug: string | null; status: "published" | "pending" | "sold"; created_at: string };
type Photo = { listing_id: string; storage_path: string | null; original_name: string | null; is_primary: boolean; display_order: number };

function formatLocation(mainLocation: string | null, subLocation: string | null, regionCity: string | null, regionSuburb: string | null) {
  return [subLocation ?? regionSuburb, mainLocation ?? regionCity].filter(Boolean).join(", ") || "New Zealand";
}

export async function getBargainFeed(supabase: SupabaseClient, rawQuery: BargainQuery): Promise<{ listings: Listing[] }> {
  const query = bargainFeedQuerySchema.parse(rawQuery);
  let request = supabase
    .from("bargain_listings")
    .select("id,title,price_cents,main_location,sub_location,region_city,region_suburb,category_slug,subcategory_slug,status,created_at")
    .in("status", ["published", "pending", "sold"]);

  if (query.mainLocation) request = request.eq("main_location", query.mainLocation);
  if (query.subLocation) request = request.eq("sub_location", query.subLocation);
  if (query.q) request = request.ilike("title", `%${query.q.replace(/[,%()]/g, " ").trim()}%`);
  request = request.order(query.sort === "priceAsc" || query.sort === "priceDesc" ? "price_cents" : "created_at", { ascending: query.sort === "priceAsc" }).order("id", { ascending: true });

  const { data } = await request.limit(60);
  const rows = (data ?? []) as BargainRow[];
  const ids = rows.map((row) => row.id);
  const { data: photoRows } = ids.length
    ? await supabase.from("bargain_listing_photos").select("listing_id,storage_path,original_name,is_primary,display_order").in("listing_id", ids).order("display_order")
    : { data: [] };
  const primaryPhotos = new Map<string, Photo>();
  for (const photo of (photoRows ?? []) as Photo[]) {
    const current = primaryPhotos.get(photo.listing_id);
    if (!current || photo.is_primary || (!current.is_primary && photo.display_order < current.display_order)) primaryPhotos.set(photo.listing_id, photo);
  }
  const paths = [...primaryPhotos.values()].map((photo) => photo.storage_path).filter((path): path is string => Boolean(path));
  const signedImages = await getSignedStorageImages("bargain-listing-images", paths, "thumbnail");
  const fallbackImage = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=700&q=80";

  return {
    listings: rows.map((row) => {
      const photo = primaryPhotos.get(row.id);
      return {
        id: row.id,
        title: row.title,
        price: formatMarketPrice(row.price_cents),
        location: formatLocation(row.main_location, row.sub_location, row.region_city, row.region_suburb),
        image: photo?.storage_path ? signedImages.get(photo.storage_path) ?? fallbackImage : fallbackImage,
        imageAlt: photo?.original_name ?? row.title,
        categorySlug: row.category_slug,
        subcategorySlug: row.subcategory_slug,
        badge: row.status === "published" ? "Newly Listed" : undefined,
        status: row.status === "sold" ? "sold" : row.status === "pending" ? "pending" : "available",
      } satisfies Listing;
    }),
  };
}
