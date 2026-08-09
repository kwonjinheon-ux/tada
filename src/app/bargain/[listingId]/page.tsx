import { notFound } from "next/navigation";
import { BargainSaleDetailClient, type BargainSaleDetail } from "@/components/bargain/BargainSaleDetailClient";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSignedStorageImages } from "@/lib/supabase/storage-image";

export const dynamic = "force-dynamic";

type BargainRow = {
  id: string; title: string; description: string; bargain_type: "moving-sale" | "garage-sale"; main_location: string | null; sub_location: string | null;
  region_city: string | null; region_suburb: string | null; event_start_date: string | null; event_end_date: string | null; event_start_time: string | null; event_end_time: string | null; event_address: string | null;
};
type PhotoRow = { id: string; storage_path: string | null; original_name: string | null; is_primary: boolean; display_order: number };
type ItemRow = { id: string; photo_id: string; title: string; category_slug: string | null; price_cents: number; description: string; display_order: number };

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

export default async function BargainSaleDetailPage({ params }: { params: Promise<{ listingId: string }> }) {
  const { listingId } = await params;
  const supabase = await createServerSupabaseClient();
  if (!supabase) notFound();
  const { data } = await supabase.from("bargain_listings").select("id,title,description,bargain_type,main_location,sub_location,region_city,region_suburb,event_start_date,event_end_date,event_start_time,event_end_time,event_address").eq("id", listingId).in("bargain_type", ["moving-sale", "garage-sale"]).maybeSingle();
  if (!data) notFound();
  const sale = data as BargainRow;
  const [{ data: photoData }, { data: itemData }] = await Promise.all([
    supabase.from("bargain_listing_photos").select("id,storage_path,original_name,is_primary,display_order").eq("listing_id", sale.id).order("display_order"),
    supabase.from("bargain_listing_items").select("id,photo_id,title,category_slug,price_cents,description,display_order").eq("listing_id", sale.id).order("display_order"),
  ]);
  const photos = (photoData ?? []) as PhotoRow[];
  const signedImages = await getSignedStorageImages("bargain-listing-images", photos.flatMap((photo) => photo.storage_path ? [photo.storage_path] : []), "gallery");
  const photoById = new Map(photos.map((photo) => [photo.id, photo]));
  const cover = photos.find((photo) => photo.is_primary) ?? photos[0];
  const fallbackImage = "/images/logo.png";
  const detail: BargainSaleDetail = {
    id: sale.id, title: sale.title, description: sale.description, type: sale.bargain_type, location: locationLabel(sale), address: sale.event_address, dateLabel: formatDateRange(sale.event_start_date, sale.event_end_date), timeLabel: formatTimeRange(sale.event_start_time, sale.event_end_time),
    coverImage: { src: cover?.storage_path ? signedImages.get(cover.storage_path) ?? fallbackImage : fallbackImage, alt: cover?.original_name ?? sale.title },
    items: ((itemData ?? []) as ItemRow[]).flatMap((item) => { const photo = photoById.get(item.photo_id); if (!photo?.storage_path) return []; return [{ id: item.id, title: item.title, description: item.description, category: item.category_slug, priceCents: item.price_cents, image: { src: signedImages.get(photo.storage_path) ?? fallbackImage, alt: photo.original_name ?? item.title }, status: "available" as const }]; }),
  };
  return <BargainSaleDetailClient sale={detail} />;
}
