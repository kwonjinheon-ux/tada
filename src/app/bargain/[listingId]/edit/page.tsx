import { notFound, redirect } from "next/navigation";
import { PostAdPageClient } from "@/components/post-ad/PostAdPageClient";
import { isMultiItemBargain, type BargainListingType } from "@/lib/bargain/listing-types";
import { getSignedStorageImages } from "@/lib/supabase/storage-image";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function EditBargainListingPage({ params }: { params: Promise<{ listingId: string }> }) {
  const { listingId } = await params;
  const supabase = await createServerSupabaseClient();
  if (!supabase) notFound();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirectTo=${encodeURIComponent(`/bargain/${listingId}/edit`)}`);
  const { data: listing } = await supabase.from("bargain_listings").select("id,title,description,price_cents,bargain_type,category_slug,subcategory_slug,item_condition,trade_method,region_city,region_suburb,main_location,sub_location,locality,raw_suburb,region,latitude,longitude,meeting_place,status").eq("id", listingId).eq("owner_id", user.id).maybeSingle();
  if (!listing || isMultiItemBargain(listing.bargain_type as BargainListingType) || listing.status === "sold") redirect(`/bargain/${listingId}`);
  const { data: photoRows } = await supabase.from("bargain_listing_photos").select("id,storage_path,original_name,is_primary,display_order").eq("listing_id", listingId).order("display_order");
  const paths = (photoRows ?? []).flatMap((photo) => photo.storage_path ? [photo.storage_path] : []);
  const signedByPath = await getSignedStorageImages("bargain-listing-images", paths, "gallery");
  const photos = (photoRows ?? []).flatMap((photo) => {
    const url = signedByPath.get(photo.storage_path);
    return url ? [{ id: photo.id, url, name: photo.original_name ?? "Listing photo", isPrimary: photo.is_primary }] : [];
  });
  return <PostAdPageClient listingSpace="bargain" initialListing={{
    id: listing.id, title: listing.title, description: listing.description, priceCents: listing.price_cents,
    bargainType: listing.bargain_type as BargainListingType, mainCategory: listing.category_slug ?? "", subCategory: listing.subcategory_slug ?? "",
    itemCondition: listing.item_condition, tradeMethod: listing.trade_method,
    region: listing.main_location ?? listing.region_city ?? "", area: listing.sub_location ?? listing.region_suburb ?? "",
    locality: listing.locality, rawSuburb: listing.raw_suburb, locationRegion: listing.region,
    latitude: listing.latitude ? Number(listing.latitude) : null, longitude: listing.longitude ? Number(listing.longitude) : null,
    meetingPlace: listing.meeting_place ?? "", photos,
  }} />;
}
