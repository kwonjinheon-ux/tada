import type { Listing } from "@/data/listings";
import { formatMarketPrice } from "@/lib/market/format-price";
import { MARKET_LISTING_PLACEHOLDER_IMAGE } from "@/lib/market/listing-image";
import type { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSignedStorageImages } from "@/lib/supabase/storage-image";

type ServerSupabase = NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>;

export type ListingCardRow = {
  id: string;
  title: string;
  price_cents: number;
  region_city: string | null;
  region_suburb: string | null;
  status: "published" | "pending" | "sold";
};

type CardPhotoRow = { listing_id: string; storage_path: string | null; original_name: string | null; is_primary: boolean; display_order: number };

export const LISTING_CARD_COLUMNS = "id,title,price_cents,region_city,region_suburb,status";

function formatLocation(city: string | null, suburb: string | null) {
  return [suburb, city].filter(Boolean).join(", ") || "New Zealand";
}

/** Turns listing rows into cards: the primary photo of each, signed, plus the
 *  display price and place. Shared by "more in this category" and a seller's
 *  other listings, so a card reads the same wherever it is listed. */
export async function listingCardsFromRows(supabase: ServerSupabase, rows: ListingCardRow[]): Promise<Listing[]> {
  if (!rows.length) return [];

  const ids = rows.map(({ id }) => id);
  const { data: photoRows } = await supabase
    .from("market_listing_photos")
    .select("listing_id,storage_path,original_name,is_primary,display_order")
    .in("listing_id", ids)
    .order("display_order", { ascending: true });
  const primaryPhotos = new Map<string, CardPhotoRow>();
  for (const photo of (photoRows ?? []) as CardPhotoRow[]) {
    if (!photo.storage_path) continue;
    const current = primaryPhotos.get(photo.listing_id);
    if (!current || photo.is_primary || (!current.is_primary && photo.display_order < current.display_order)) primaryPhotos.set(photo.listing_id, photo);
  }
  const signedImages = await getSignedStorageImages("market-listing-images", [...primaryPhotos.values()].map((photo) => photo.storage_path as string), "thumbnail");
  return rows.map((row) => {
    const photo = primaryPhotos.get(row.id);
    return {
      id: row.id,
      title: row.title,
      price: formatMarketPrice(row.price_cents),
      location: formatLocation(row.region_city, row.region_suburb),
      image: photo?.storage_path ? signedImages.get(photo.storage_path) ?? MARKET_LISTING_PLACEHOLDER_IMAGE : MARKET_LISTING_PLACEHOLDER_IMAGE,
      imageAlt: photo?.original_name ?? row.title,
      status: row.status === "sold" ? "sold" : row.status === "pending" ? "pending" : "available",
    } satisfies Listing;
  });
}

/** Everything a member currently has on sale, newest first. */
export async function loadSellerListings(supabase: ServerSupabase, sellerId: string, limit = 60): Promise<Listing[]> {
  const { data } = await supabase
    .from("market_listings")
    .select(LISTING_CARD_COLUMNS)
    .eq("owner_id", sellerId)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(limit);
  return listingCardsFromRows(supabase, (data ?? []) as ListingCardRow[]);
}
