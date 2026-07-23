import { notFound, redirect } from "next/navigation";
import { PostAdPageClient } from "@/components/post-ad/PostAdPageClient";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function EditListingPage({ params }: { params: Promise<{ listingId: string }> }) {
  const supabase = await createServerSupabaseClient();
  const { listingId } = await params;
  if (!supabase) notFound();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirectTo=${encodeURIComponent(`/market/${listingId}/edit`)}`);
  const { data: listing } = await supabase
    .from("market_listings")
    .select("id,title,description,price_cents,category_slug,subcategory_slug,item_condition,trade_method,region_city,region_suburb,meeting_place")
    .eq("id", listingId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!listing) notFound();
  const { data: photoRows } = await supabase
    .from("market_listing_photos")
    .select("id,storage_path,original_name,is_primary,display_order")
    .eq("listing_id", listing.id)
    .order("display_order", { ascending: true });

  const photos = (photoRows ?? []).map((photo) => ({
    id: photo.id,
    url: supabase.storage.from("market-listing-images").getPublicUrl(photo.storage_path).data.publicUrl,
    name: photo.original_name ?? "Listing photo",
    isPrimary: photo.is_primary,
  }));

  return <PostAdPageClient initialListing={{
    id: listing.id,
    title: listing.title,
    description: listing.description,
    priceCents: listing.price_cents,
    mainCategory: listing.category_slug ?? "",
    subCategory: listing.subcategory_slug ?? "",
    itemCondition: listing.item_condition,
    tradeMethod: listing.trade_method,
    region: listing.region_city ?? "",
    area: listing.region_suburb ?? "",
    meetingPlace: listing.meeting_place ?? "",
    photos,
  }} />;
}
