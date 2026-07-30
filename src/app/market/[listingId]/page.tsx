import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListingDetailClient, type ListingDetail } from "@/components/market/ListingDetailClient";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSignedStorageImage, getSignedStorageImages } from "@/lib/supabase/storage-image";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type MarketListingRow = {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  price_cents: number;
  region_city: string | null;
  region_suburb: string | null;
  item_condition: "brand_new" | "like_new" | "good" | "fair";
  trade_method: "pickup_delivery" | "pickup" | "delivery";
  meeting_place: string | null;
  status: "published" | "pending" | "sold";
  view_count: number | null;
  created_at: string;
};

type PhotoRow = { storage_path: string | null; original_name: string | null; display_order: number };
type SellerRow = { id: string; display_name: string | null; avatar_path: string | null; rating_average?: number | string; rating_count?: number };

const conditionLabels = { brand_new: "Brand new", like_new: "Like new", good: "Good", fair: "Fair" } as const;
const tradeMethodLabels = { pickup_delivery: "Pickup or delivery", pickup: "Pickup", delivery: "Delivery" } as const;

function formatPrice(priceCents: number) {
  return new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: priceCents % 100 === 0 ? 0 : 2 }).format(priceCents / 100);
}

function formatLocation(city: string | null, suburb: string | null) {
  return [suburb, city].filter(Boolean).join(", ") || "New Zealand";
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-NZ", { day: "numeric", month: "short", year: "numeric" }).format(new Date(date));
}

async function getListingDetail(
  id: string,
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>,
): Promise<ListingDetail | null> {
  const { data, error } = await supabase
    .from("market_listings")
    .select("id,owner_id,title,description,price_cents,region_city,region_suburb,item_condition,trade_method,meeting_place,status,created_at,view_count")
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
    price: formatPrice(listing.price_cents),
    priceCents: listing.price_cents,
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
  const { data: savedListing } = user
    ? await supabase.from("market_wishlist").select("listing_id").eq("user_id", user.id).eq("listing_id", listing.id).maybeSingle()
    : { data: null };
  return <ListingDetailClient listing={listing} initialIsSaved={Boolean(savedListing)} isOwner={Boolean(user && user.id === listing.ownerId)} />;
}
