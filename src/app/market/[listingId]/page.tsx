import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListingDetailClient, type ListingDetail } from "@/components/market/ListingDetailClient";
import { RelatedListings } from "@/components/market/RelatedListings";
import type { Listing } from "@/data/listings";
import { marketplaceCategories } from "@/data/marketplace-categories";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSignedStorageImage, getSignedStorageImages } from "@/lib/supabase/storage-image";
import { formatMarketPrice } from "@/lib/market/format-price";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type MarketListingRow = {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  price_cents: number;
  category_slug: string | null;
  subcategory_slug: string | null;
  region_city: string | null;
  region_suburb: string | null;
  item_condition: "brand_new" | "like_new" | "excellent" | "good" | "fair";
  trade_method: "pickup_delivery" | "pickup" | "delivery";
  meeting_place: string | null;
  status: "published" | "pending" | "sold";
  view_count: number | null;
  created_at: string;
};

type PhotoRow = { storage_path: string | null; original_name: string | null; display_order: number };
type RelatedListingRow = Pick<MarketListingRow, "id" | "title" | "price_cents" | "region_city" | "region_suburb" | "status">;
type RelatedPhotoRow = { listing_id: string; storage_path: string | null; original_name: string | null; is_primary: boolean; display_order: number };
type SellerRow = { id: string; display_name: string | null; avatar_path: string | null; rating_average?: number | string; rating_count?: number };

const conditionLabels = { brand_new: "Brand new", like_new: "Like new", excellent: "Excellent", good: "Good", fair: "Fair" } as const;
const tradeMethodLabels = { pickup_delivery: "Pickup or delivery", pickup: "Pickup", delivery: "Delivery" } as const;

function formatLocation(city: string | null, suburb: string | null) {
  return [suburb, city].filter(Boolean).join(", ") || "New Zealand";
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-NZ", { day: "numeric", month: "short", year: "numeric" }).format(new Date(date));
}

function getCategoryPath(categorySlug: string | null, subcategorySlug: string | null) {
  const category = marketplaceCategories.find(({ value }) => value === categorySlug);
  const subcategory = category?.subcategories.find(({ value }) => value === subcategorySlug);
  if (!category) return null;
  return {
    label: category.label,
    href: `/market?category=${encodeURIComponent(category.value)}`,
    subcategory: subcategory ? {
      label: subcategory.label,
      href: `/market?category=${encodeURIComponent(category.value)}&subcategory=${encodeURIComponent(subcategory.value)}`,
    } : null,
  };
}

async function getListingDetail(
  id: string,
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>,
): Promise<ListingDetail | null> {
  const { data, error } = await supabase
    .from("market_listings")
    .select("id,owner_id,title,description,price_cents,category_slug,subcategory_slug,region_city,region_suburb,item_condition,trade_method,meeting_place,status,created_at,view_count")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  const listing = data as MarketListingRow;
  const [{ data: photoRows }, { data: sellerData }, { data: profileData }] = await Promise.all([
    supabase
      .from("market_listing_photos")
      .select("storage_path,original_name,display_order")
      .eq("listing_id", listing.id)
      .order("display_order", { ascending: true }),
    supabase
      .from("market_seller_profiles")
      .select("id,display_name,avatar_path,rating_average,rating_count")
      .eq("id", listing.owner_id)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("id,display_name,avatar_path")
      .eq("id", listing.owner_id)
      .maybeSingle(),
  ]);
  const photos = (photoRows as PhotoRow[] | null ?? []).filter((photo) => photo.storage_path);
  const paths = photos.map((photo) => photo.storage_path as string);
  const seller = (sellerData ?? profileData) as SellerRow | null;
  const [signedByPath, signedAvatar] = await Promise.all([
    getSignedStorageImages("market-listing-images", paths, "gallery"),
    seller?.avatar_path
      ? getSignedStorageImage("profile-avatars", seller.avatar_path, "avatar")
      : Promise.resolve(null),
  ]);
  const images = photos.map((photo) => ({ src: signedByPath.get(photo.storage_path as string), alt: photo.original_name || listing.title })).filter((photo): photo is { src: string; alt: string } => Boolean(photo.src));

  return {
    id: listing.id,
    ownerId: listing.owner_id,
    title: listing.title,
    price: formatMarketPrice(listing.price_cents),
    priceCents: listing.price_cents,
    category: getCategoryPath(listing.category_slug, listing.subcategory_slug),
    subcategorySlug: listing.subcategory_slug,
    location: formatLocation(listing.region_city, listing.region_suburb),
    description: listing.description,
    condition: conditionLabels[listing.item_condition],
    tradeMethod: tradeMethodLabels[listing.trade_method],
    meetingPlace: listing.meeting_place,
    createdAt: formatDate(listing.created_at),
    status: listing.status === "sold" ? "sold" : listing.status === "pending" ? "pending" : "available",
    viewCount: Number(listing.view_count ?? 0),
    images: images.length ? images : [{ src: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80", alt: listing.title }],
    seller: {
      id: seller?.id ?? null,
      name: seller?.display_name || "Tada seller",
      avatarUrl: signedAvatar,
      ratingAverage: Number(seller?.rating_average ?? 0),
      ratingCount: seller?.rating_count ?? 0,
    },
  };
}

export async function generateMetadata({ params }: { params: Promise<{ listingId: string }> }): Promise<Metadata> {
  const { listingId } = await params;
  const supabase = await createServerSupabaseClient();
  if (!supabase) return {};
  const listing = await getListingDetail(listingId, supabase);
  if (!listing) return {};

  const description = `${listing.price} · ${listing.location}`;
  const primaryImage = listing.images[0];
  return {
    title: listing.title,
    description,
    openGraph: {
      title: listing.title,
      description,
      images: primaryImage ? [{ url: primaryImage.src, alt: primaryImage.alt }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: listing.title,
      description,
      images: primaryImage ? [primaryImage.src] : [],
    },
  };
}

async function getRelatedListings(listing: ListingDetail, supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>): Promise<Listing[]> {
  if (!listing.subcategorySlug) return [];
  const { data } = await supabase
    .from("market_listings")
    .select("id,title,price_cents,region_city,region_suburb,status")
    .eq("subcategory_slug", listing.subcategorySlug)
    .eq("status", "published")
    .neq("id", listing.id)
    .order("created_at", { ascending: false })
    .limit(8);
  const rows = (data ?? []) as RelatedListingRow[];
  if (!rows.length) return [];

  const ids = rows.map(({ id }) => id);
  const { data: photoRows } = await supabase
    .from("market_listing_photos")
    .select("listing_id,storage_path,original_name,is_primary,display_order")
    .in("listing_id", ids)
    .order("display_order", { ascending: true });
  const primaryPhotos = new Map<string, RelatedPhotoRow>();
  for (const photo of (photoRows ?? []) as RelatedPhotoRow[]) {
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
      image: photo?.storage_path ? signedImages.get(photo.storage_path) ?? "/images/logo.png" : "/images/logo.png",
      imageAlt: photo?.original_name ?? row.title,
      status: row.status === "sold" ? "sold" : row.status === "pending" ? "pending" : "available",
    } satisfies Listing;
  });
}

export default async function ListingDetailPage({ params }: { params: Promise<{ listingId: string }> }) {
  const { listingId } = await params;
  const supabase = await createServerSupabaseClient();
  if (!supabase) notFound();
  const [listing, userResult] = await Promise.all([
    getListingDetail(listingId, supabase),
    supabase.auth.getUser(),
  ]);
  if (!listing) notFound();
  const user = userResult.data.user;
  const relatedListings = await getRelatedListings(listing, supabase);
  const { data: savedListing } = user
    ? await supabase.from("market_wishlist").select("listing_id").eq("user_id", user.id).eq("listing_id", listing.id).maybeSingle()
    : { data: null };
  const { data: savedRelatedListings } = user && relatedListings.length
    ? await supabase.from("market_wishlist").select("listing_id").eq("user_id", user.id).in("listing_id", relatedListings.map(({ id }) => id))
    : { data: [] };
  return <><ListingDetailClient listing={listing} initialIsSaved={Boolean(savedListing)} isOwner={Boolean(user && user.id === listing.ownerId)} /><RelatedListings listings={relatedListings} savedListingIds={(savedRelatedListings ?? []).map(({ listing_id }) => listing_id)} /></>;
}
