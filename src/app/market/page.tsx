import { MarketPageClient } from "@/components/market/MarketPageClient";
import type { Listing } from "@/data/listings";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = { title: "Market" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

type MarketListingPhotoRow = {
  listing_id: string;
  storage_path: string | null;
  original_name: string | null;
  is_primary: boolean;
  display_order: number;
};

type MarketListingRow = {
  id: string;
  title: string;
  price_cents: number;
  region_city: string | null;
  region_suburb: string | null;
  created_at: string;
};

function formatPrice(priceCents: number | null | undefined) {
  const parsed = typeof priceCents === "number" ? priceCents / 100 : 0;
  if (!Number.isFinite(parsed) || parsed <= 0) return "$0";
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD",
    maximumFractionDigits: parsed % 1 === 0 ? 0 : 2,
  }).format(parsed);
}

function formatLocation(city: string | null, suburb: string | null) {
  const parts = [suburb, city].filter(Boolean);
  return parts.length ? parts.join(", ") : "New Zealand";
}

async function getPostedListings(): Promise<Listing[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("market_listings")
    .select("id,title,price_cents,region_city,region_suburb,created_at")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(48);

  if (error || !data) return [];
  const marketListings = data as MarketListingRow[];
  const listingIds = marketListings.map((listing) => listing.id);
  let photosByListingId = new Map<string, MarketListingPhotoRow[]>();

  if (listingIds.length) {
    const { data: photoRows } = await supabase
      .from("market_listing_photos")
      .select("listing_id,storage_path,original_name,is_primary,display_order")
      .in("listing_id", listingIds)
      .order("display_order", { ascending: true });

    photosByListingId = (photoRows as MarketListingPhotoRow[] | null ?? []).reduce((map, photo) => {
      const currentPhotos = map.get(photo.listing_id) ?? [];
      currentPhotos.push(photo);
      map.set(photo.listing_id, currentPhotos);
      return map;
    }, new Map<string, MarketListingPhotoRow[]>());
  }

  const listings = await Promise.all(
    marketListings.map(async (marketListing) => {
      const photo = [...(photosByListingId.get(marketListing.id) ?? [])].sort((a, b) => {
        if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
        return a.display_order - b.display_order;
      })[0];

      let image = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=700&q=80";
      if (photo?.storage_path) {
        const { data: signed } = await supabase.storage.from("market-listing-images").createSignedUrl(photo.storage_path, 3600);
        image = signed?.signedUrl ?? image;
      }

      return {
        id: marketListing.id,
        title: marketListing.title,
        price: formatPrice(marketListing.price_cents),
        location: formatLocation(marketListing.region_city, marketListing.region_suburb),
        image,
        imageAlt: photo?.original_name ?? marketListing.title,
        badge: "Newly Listed",
        status: "available",
      } satisfies Listing;
    }),
  );

  return listings;
}

export default async function MarketRoute() {
  const postedListings = await getPostedListings();
  return <MarketPageClient postedListings={postedListings} />;
}
