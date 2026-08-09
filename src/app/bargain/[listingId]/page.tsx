import { notFound } from "next/navigation";
import { BargainSaleDetailClient, type BargainSaleDetail } from "@/components/bargain/BargainSaleDetailClient";
import { ListingDetailClient, type ListingDetail } from "@/components/market/ListingDetailClient";
import { bargainListingTypes, isMultiItemBargain, type BargainListingType } from "@/lib/bargain/listing-types";
import { formatMarketPrice } from "@/lib/market/format-price";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSignedStorageImage, getSignedStorageImages } from "@/lib/supabase/storage-image";

export const dynamic = "force-dynamic";

type BargainRow = {
  id: string; owner_id: string | null; title: string; description: string; bargain_type: BargainListingType; price_cents: number; category_slug: string | null; subcategory_slug: string | null;
  item_condition: "brand_new" | "like_new" | "excellent" | "good" | "fair"; trade_method: "pickup_delivery" | "pickup" | "delivery"; meeting_place: string | null; status: "published" | "pending" | "sold"; created_at: string;
  main_location: string | null; sub_location: string | null; region_city: string | null; region_suburb: string | null; event_start_date: string | null; event_end_date: string | null; event_start_time: string | null; event_end_time: string | null; event_address: string | null;
};
type PhotoRow = { id: string; storage_path: string | null; original_name: string | null; is_primary: boolean; display_order: number };
type ItemRow = { id: string; photo_id: string; title: string; category_slug: string | null; price_cents: number; description: string; display_order: number; status: "available" | "sold" };
type ReservationRow = { id: string; item_id: string; status: "pending" };
type SellerRow = { id: string; display_name: string; avatar_path: string | null };

const conditionLabels = { brand_new: "Brand new", like_new: "Like new", excellent: "Excellent", good: "Good", fair: "Fair" } as const;
const tradeMethodLabels = { pickup_delivery: "Pickup or delivery", pickup: "Pickup", delivery: "Delivery" } as const;

function locationLabel(row: BargainRow) {
  return [row.sub_location ?? row.region_suburb, row.main_location ?? row.region_city].filter(Boolean).join(", ") || "New Zealand";
}
function formatDateRange(start: string | null, end: string | null) {
  if (!start) return null;
  const format = (value: string) => new Intl.DateTimeFormat("en-NZ", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T12:00:00`));
  return end && end !== start ? `${format(start)} – ${format(end)}` : format(start);
}
function formatTimeRange(start: string | null, end: string | null) {
  if (!start) return null;
  const format = (value: string) => new Intl.DateTimeFormat("en-NZ", { hour: "numeric", minute: "2-digit" }).format(new Date(`1970-01-01T${value}`));
  return end ? `${format(start)} – ${format(end)}` : format(start);
}

function formatCreatedDate(value: string) {
  return new Intl.DateTimeFormat("en-NZ", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

function getBargainCategory(type: BargainListingType) {
  const bargainType = bargainListingTypes.find((option) => option.value === type);
  return bargainType ? {
    label: "Bargain",
    href: "/bargain",
    subcategory: { label: bargainType.label, href: `/bargain?bargain=${encodeURIComponent(type)}` },
  } : null;
}

export default async function BargainSaleDetailPage({ params }: { params: Promise<{ listingId: string }> }) {
  const { listingId } = await params;
  const supabase = await createServerSupabaseClient();
  if (!supabase) notFound();
  const { data } = await supabase.from("bargain_listings").select("id,owner_id,title,description,bargain_type,price_cents,category_slug,subcategory_slug,item_condition,trade_method,meeting_place,status,created_at,main_location,sub_location,region_city,region_suburb,event_start_date,event_end_date,event_start_time,event_end_time,event_address").eq("id", listingId).maybeSingle();
  if (!data) notFound();
  const sale = data as BargainRow;
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: photoData }, { data: itemData }, { data: sellerData }, { data: profileData }] = await Promise.all([
    supabase.from("bargain_listing_photos").select("id,storage_path,original_name,is_primary,display_order").eq("listing_id", sale.id).order("display_order"),
    supabase.from("bargain_listing_items").select("id,photo_id,title,category_slug,price_cents,description,display_order,status").eq("listing_id", sale.id).order("display_order"),
    sale.owner_id ? supabase.from("market_seller_profiles").select("id,display_name,avatar_path").eq("id", sale.owner_id).maybeSingle() : Promise.resolve({ data: null }),
    sale.owner_id ? supabase.from("profiles").select("id,display_name,avatar_path").eq("id", sale.owner_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const { data: reservationData } = user?.id === sale.owner_id
    ? await supabase.from("bargain_item_reservations").select("id,item_id,status").eq("listing_id", sale.id).eq("status", "pending")
    : { data: [] };
  const pendingReservationIdsByItem = new Map<string, string[]>();
  for (const reservation of (reservationData ?? []) as ReservationRow[]) pendingReservationIdsByItem.set(reservation.item_id, [...(pendingReservationIdsByItem.get(reservation.item_id) ?? []), reservation.id]);
  const photos = (photoData ?? []) as PhotoRow[];
  const signedImages = await getSignedStorageImages("bargain-listing-images", photos.flatMap((photo) => photo.storage_path ? [photo.storage_path] : []), "gallery");
  const photoById = new Map(photos.map((photo) => [photo.id, photo]));
  const cover = photos.find((photo) => photo.is_primary) ?? photos[0];
  const fallbackImage = "/images/logo.png";
  const seller = (sellerData ?? profileData) as SellerRow | null;
  const sellerAvatarUrl = seller?.avatar_path ? await getSignedStorageImage("profile-avatars", seller.avatar_path, "avatar") : null;
  if (!isMultiItemBargain(sale.bargain_type)) {
    const standardListing: ListingDetail = {
      id: sale.id,
      ownerId: sale.owner_id,
      title: sale.title,
      price: formatMarketPrice(sale.price_cents),
      priceCents: sale.price_cents,
      category: getBargainCategory(sale.bargain_type),
      subcategorySlug: sale.subcategory_slug,
      location: locationLabel(sale),
      description: sale.description,
      condition: conditionLabels[sale.item_condition],
      tradeMethod: tradeMethodLabels[sale.trade_method],
      meetingPlace: sale.meeting_place,
      createdAt: formatCreatedDate(sale.created_at),
      status: sale.status === "sold" ? "sold" : sale.status === "pending" ? "pending" : "available",
      viewCount: 0,
      images: photos.map((photo) => ({ src: photo.storage_path ? signedImages.get(photo.storage_path) ?? fallbackImage : fallbackImage, alt: photo.original_name ?? sale.title })),
      seller: { id: seller?.id ?? null, name: seller?.display_name ?? "Tada seller", avatarUrl: sellerAvatarUrl, ratingAverage: 0, ratingCount: 0 },
    };
    if (!standardListing.images.length) standardListing.images.push({ src: fallbackImage, alt: sale.title });
    return <ListingDetailClient listing={standardListing} isOwner={user?.id === sale.owner_id} space="bargain" />;
  }
  const detail: BargainSaleDetail = {
    id: sale.id, title: sale.title, description: sale.description, type: sale.bargain_type, location: locationLabel(sale), address: sale.event_address, dateLabel: formatDateRange(sale.event_start_date, sale.event_end_date), timeLabel: formatTimeRange(sale.event_start_time, sale.event_end_time),
    coverImage: { src: cover?.storage_path ? signedImages.get(cover.storage_path) ?? fallbackImage : fallbackImage, alt: cover?.original_name ?? sale.title },
    seller: { name: seller?.display_name ?? "Tada seller", avatarUrl: sellerAvatarUrl }, viewerIsOwner: user?.id === sale.owner_id,
    items: ((itemData ?? []) as ItemRow[]).flatMap((item) => { const photo = photoById.get(item.photo_id); if (!photo?.storage_path) return []; return [{ id: item.id, title: item.title, description: item.description, category: item.category_slug, priceCents: item.price_cents, image: { src: signedImages.get(photo.storage_path) ?? fallbackImage, alt: photo.original_name ?? item.title }, status: item.status, pendingReservationIds: pendingReservationIdsByItem.get(item.id) ?? [] }]; }),
  };
  return <BargainSaleDetailClient sale={detail} />;
}
