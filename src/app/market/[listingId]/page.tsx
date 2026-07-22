import { notFound } from "next/navigation";
import { ListingDetailClient, type ListingDetail } from "@/components/market/ListingDetailClient";
import { listings } from "@/data/listings";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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

function fallbackListing(id: string): ListingDetail | null {
  const listing = listings.find((candidate) => candidate.id === id);
  if (!listing) return null;

  return {
    id: listing.id,
    title: listing.title,
    price: listing.price,
    location: listing.location,
    description: `I am selling ${listing.title}. It is ready for its next owner and the listing photos show its current condition. Please send me a message if you would like to know anything else before arranging a viewing.`,
    condition: "Good",
    tradeMethod: "Pickup or delivery",
    meetingPlace: null,
    createdAt: "Listed recently",
    status: listing.status,
    images: [{ src: listing.image, alt: listing.imageAlt }],
    seller: { id: null, name: "Tada seller", avatarUrl: null, ratingAverage: 0, ratingCount: 0 },
  };
}

async function getListingDetail(id: string): Promise<ListingDetail | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return fallbackListing(id);

  const { data, error } = await supabase
    .from("market_listings")
    .select("id,owner_id,title,description,price_cents,region_city,region_suburb,item_condition,trade_method,meeting_place,status,created_at")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return fallbackListing(id);
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
  const [{ data: signedPhotos }, { data: signedAvatar }] = await Promise.all([
    paths.length
      ? supabase.storage.from("market-listing-images").createSignedUrls(paths, 3600)
      : Promise.resolve({ data: [] }),
    seller?.avatar_path
      ? supabase.storage.from("profile-avatars").createSignedUrl(seller.avatar_path, 3600)
      : Promise.resolve({ data: null }),
  ]);
  const signedByPath = new Map((signedPhotos ?? []).filter((photo) => photo.path && photo.signedUrl).map((photo) => [photo.path as string, photo.signedUrl as string]));
  const images = photos.map((photo) => ({ src: signedByPath.get(photo.storage_path as string), alt: photo.original_name || listing.title })).filter((photo): photo is { src: string; alt: string } => Boolean(photo.src));

  return {
    id: listing.id,
    title: listing.title,
    price: formatPrice(listing.price_cents),
    location: formatLocation(listing.region_city, listing.region_suburb),
    description: listing.description,
    condition: conditionLabels[listing.item_condition],
    tradeMethod: tradeMethodLabels[listing.trade_method],
    meetingPlace: listing.meeting_place,
    createdAt: formatDate(listing.created_at),
    status: listing.status === "sold" ? "sold" : listing.status === "pending" ? "pending" : "available",
    images: images.length ? images : [{ src: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80", alt: listing.title }],
    seller: {
      id: seller?.id ?? null,
      name: seller?.display_name || "Tada seller",
      avatarUrl: signedAvatar?.signedUrl || null,
      ratingAverage: Number(seller?.rating_average ?? 0),
      ratingCount: seller?.rating_count ?? 0,
    },
  };
}

export default async function ListingDetailPage({ params }: { params: Promise<{ listingId: string }> }) {
  const { listingId } = await params;
  const listing = await getListingDetail(listingId);
  if (!listing) notFound();
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const { data: savedListing } = supabase && user
    ? await supabase.from("market_wishlist").select("listing_id").eq("user_id", user.id).eq("listing_id", listing.id).maybeSingle()
    : { data: null };
  return <ListingDetailClient listing={listing} initialIsSaved={Boolean(savedListing)} />;
}
