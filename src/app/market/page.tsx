import { MarketPageClient } from "@/components/market/MarketPageClient";
import type { Listing } from "@/data/listings";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = { title: "Market" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

type MarketListingPhotoRow = {
  listing_id: string;
  storage_path: string | null;
  thumbnail_path: string | null;
  listing_path: string | null;
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
  const primaryPhotosByListingId = new Map<string, MarketListingPhotoRow>();

  if (listingIds.length) {
    const { data: photoRows } = await supabase
      .from("market_listing_photos")
      .select("listing_id,storage_path,thumbnail_path,listing_path,original_name,is_primary,display_order")
      .in("listing_id", listingIds)
      .order("display_order", { ascending: true });

    for (const photo of (photoRows as MarketListingPhotoRow[] | null ?? [])) {
      const currentPhoto = primaryPhotosByListingId.get(photo.listing_id);
      if (!currentPhoto || photo.is_primary || (!currentPhoto.is_primary && photo.display_order < currentPhoto.display_order)) {
        primaryPhotosByListingId.set(photo.listing_id, photo);
      }
    }
  }

  const storagePaths = [...new Set([...primaryPhotosByListingId.values()]
    .map((photo) => photo.thumbnail_path ?? photo.listing_path ?? photo.storage_path)
    .filter((path): path is string => Boolean(path)))];
  const { data: signedPhotos } = storagePaths.length
    ? await supabase.storage.from("market-listing-images").createSignedUrls(storagePaths, 3600)
    : { data: [] };
  const signedImageByPath = new Map(
    (signedPhotos ?? [])
      .filter((photo) => photo.path && photo.signedUrl)
      .map((photo) => [photo.path as string, photo.signedUrl as string]),
  );

  const listings = await Promise.all(
    marketListings.map(async (marketListing) => {
      const photo = primaryPhotosByListingId.get(marketListing.id);

      let image = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=700&q=80";
      const imagePath = photo?.thumbnail_path ?? photo?.listing_path ?? photo?.storage_path;
      if (imagePath) {
        image = signedImageByPath.get(imagePath) ?? image;
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

async function getSavedListingIds() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase.from("market_wishlist").select("listing_id").eq("user_id", user.id);
  return (data ?? []).map((row) => row.listing_id as string);
}

export default async function MarketRoute() {
  const [postedListings, savedListingIds] = await Promise.all([getPostedListings(), getSavedListingIds()]);
  return <MarketPageClient postedListings={postedListings} savedListingIds={savedListingIds} />;
}
