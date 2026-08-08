import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Listing } from "@/data/listings";
import { formatMarketPrice } from "@/lib/market/format-price";
import { getSignedStorageImages } from "@/lib/supabase/storage-image";

const RAIL_SIZE = 4;
const FETCH_SIZE = 16;

type ListingRow = {
  id: string;
  title: string;
  price_cents: number;
  region_city: string | null;
  region_suburb: string | null;
  category_slug: string | null;
  subcategory_slug: string | null;
  created_at: string;
};

type PhotoRow = {
  listing_id: string;
  storage_path: string | null;
  original_name: string | null;
  is_primary: boolean;
  display_order: number;
};

type HomeListingRails = {
  nearbyListings: Listing[];
  justListedListings: Listing[];
  savedListingIds: string[];
};

function formatLocation(city: string | null, suburb: string | null) {
  return [suburb, city].filter(Boolean).join(", ") || "New Zealand";
}

function uniqueRows(rows: ListingRow[]) {
  return [...new Map(rows.map((row) => [row.id, row])).values()];
}

async function getPublishedRows(supabase: SupabaseClient, limit: number) {
  const { data } = await supabase
    .from("market_listings")
    .select("id,title,price_cents,region_city,region_suburb,category_slug,subcategory_slug,created_at")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as ListingRow[];
}

async function getNearbyRows(
  supabase: SupabaseClient,
  city: string | null,
  suburb: string | null,
) {
  if (!city && !suburb) return [];

  const bySuburb = suburb
    ? (await supabase
      .from("market_listings")
      .select("id,title,price_cents,region_city,region_suburb,category_slug,subcategory_slug,created_at")
      .eq("status", "published")
      .eq("region_suburb", suburb)
      .order("created_at", { ascending: false })
      .limit(FETCH_SIZE)).data ?? []
    : [];

  if (!city || bySuburb.length >= FETCH_SIZE) return bySuburb as ListingRow[];

  const { data: byCity } = await supabase
    .from("market_listings")
    .select("id,title,price_cents,region_city,region_suburb,category_slug,subcategory_slug,created_at")
    .eq("status", "published")
    .eq("region_city", city)
    .order("created_at", { ascending: false })
    .limit(FETCH_SIZE);

  return uniqueRows([...(bySuburb as ListingRow[]), ...((byCity ?? []) as ListingRow[])]);
}

async function toListings(supabase: SupabaseClient, rows: ListingRow[]) {
  const ids = rows.map((row) => row.id);
  if (!ids.length) return [];

  const { data: photoRows } = await supabase
    .from("market_listing_photos")
    .select("listing_id,storage_path,original_name,is_primary,display_order")
    .in("listing_id", ids)
    .order("display_order");

  const primaryPhotos = new Map<string, PhotoRow>();
  for (const photo of (photoRows ?? []) as PhotoRow[]) {
    const current = primaryPhotos.get(photo.listing_id);
    if (!current || photo.is_primary || (!current.is_primary && photo.display_order < current.display_order)) {
      primaryPhotos.set(photo.listing_id, photo);
    }
  }

  const imagePaths = [...primaryPhotos.values()]
    .map((photo) => photo.storage_path)
    .filter((path): path is string => Boolean(path));
  const signedImages = await getSignedStorageImages("market-listing-images", imagePaths, "thumbnail");

  return rows.flatMap((row) => {
    const photo = primaryPhotos.get(row.id);
    const image = photo?.storage_path ? signedImages.get(photo.storage_path) : null;
    if (!image) return [];

    return [{
      id: row.id,
      title: row.title,
      price: formatMarketPrice(row.price_cents),
      location: formatLocation(row.region_city, row.region_suburb),
      image,
      imageAlt: photo?.original_name ?? row.title,
      categorySlug: row.category_slug,
      subcategorySlug: row.subcategory_slug,
      status: "available",
    } satisfies Listing];
  });
}

export async function getHomeListingRails(
  supabase: SupabaseClient,
  { city, suburb, userId }: { city?: string | null; suburb?: string | null; userId?: string },
): Promise<HomeListingRails> {
  const [nearbyRows, latestRows] = await Promise.all([
    getNearbyRows(supabase, city?.trim() || null, suburb?.trim() || null),
    getPublishedRows(supabase, FETCH_SIZE),
  ]);
  const [nearbyListings, latestListings] = await Promise.all([
    toListings(supabase, nearbyRows),
    toListings(supabase, latestRows),
  ]);

  const nearby = nearbyListings.slice(0, RAIL_SIZE);
  const nearbyIds = new Set(nearby.map((listing) => listing.id));
  const justListed = latestListings.filter((listing) => !nearbyIds.has(listing.id)).slice(0, RAIL_SIZE);
  const shownListingIds = [...nearby, ...justListed].map((listing) => listing.id);
  const savedListingIds = userId && shownListingIds.length
    ? ((await supabase
      .from("market_wishlist")
      .select("listing_id")
      .eq("user_id", userId)
      .in("listing_id", shownListingIds)).data ?? []).map((row) => row.listing_id as string)
    : [];

  return {
    nearbyListings: nearby,
    justListedListings: justListed,
    savedListingIds,
  };
}
