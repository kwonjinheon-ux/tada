import { notFound, redirect } from "next/navigation";
import { BargainSaleItemEditClient } from "@/components/bargain/BargainSaleItemEditClient";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSignedStorageImage } from "@/lib/supabase/storage-image";

export const dynamic = "force-dynamic";

export default async function EditBargainSaleItemPage({ params }: { params: Promise<{ listingId: string; itemId: string }> }) {
  const { listingId, itemId } = await params;
  const supabase = await createServerSupabaseClient();
  if (!supabase) notFound();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirectTo=${encodeURIComponent(`/bargain/${listingId}/items/${itemId}/edit`)}`);
  const { data: item } = await supabase.from("bargain_listing_items").select("id,title,description,price_cents,photo_id").eq("id", itemId).eq("listing_id", listingId).eq("owner_id", user.id).maybeSingle();
  if (!item) notFound();
  const { data: photo } = await supabase.from("bargain_listing_photos").select("id,storage_path").eq("id", item.photo_id).eq("listing_id", listingId).eq("owner_id", user.id).maybeSingle();
  const imageUrl = photo?.storage_path ? await getSignedStorageImage("bargain-listing-images", photo.storage_path, "gallery") : null;
  if (!imageUrl) notFound();
  const { data: reservations } = await supabase.from("bargain_item_reservations").select("id,amount_cents").eq("listing_id", listingId).eq("item_id", itemId).eq("seller_id", user.id).eq("status", "pending");
  return <BargainSaleItemEditClient listingId={listingId} item={{ id: item.id, title: item.title, description: item.description, priceCents: item.price_cents, imageUrl, storagePath: photo?.storage_path ?? null }} offers={(reservations ?? []).map((reservation) => ({ id: reservation.id, amountCents: reservation.amount_cents }))} />;
}
