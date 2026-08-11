import { notFound, redirect } from "next/navigation";
import { PostAdPageClient } from "@/components/post-ad/PostAdPageClient";
import { isMultiItemBargain, type BargainListingType } from "@/lib/bargain/listing-types";
import { getSignedStorageImages } from "@/lib/supabase/storage-image";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function EditListingPage({ params }: { params: Promise<{ listingId: string }> }) {
  const supabase = await createServerSupabaseClient();
  const { listingId } = await params;
  if (!supabase) notFound();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirectTo=${encodeURIComponent(`/market/${listingId}/edit`)}`);
  const listingResult = await supabase
    .from("market_listings")
    .select("id,title,description,price_cents,category_slug,subcategory_slug,item_condition,trade_method,region_city,region_suburb,main_location,sub_location,locality,raw_suburb,region,latitude,longitude,meeting_place,status")
    .eq("id", listingId)
    .eq("owner_id", user.id)
    .maybeSingle();
  const { data: listing } = listingResult.error
    ? await supabase.from("market_listings").select("id,title,description,price_cents,category_slug,subcategory_slug,item_condition,trade_method,region_city,region_suburb,meeting_place,status").eq("id", listingId).eq("owner_id", user.id).maybeSingle()
    : listingResult;

  if (!listing) return <EditBargainListingFallback listingId={listingId} userId={user.id} supabase={supabase} />;
  if (listing.status === "sold") redirect(`/market/${listingId}`);
  const { data: photoRows } = await supabase
    .from("market_listing_photos")
    .select("id,storage_path,original_name,is_primary,display_order")
    .eq("listing_id", listing.id)
    .order("display_order", { ascending: true });

  const paths = (photoRows ?? []).map((photo) => photo.storage_path).filter((path): path is string => Boolean(path));
  const signedByPath = await getSignedStorageImages("market-listing-images", paths, "gallery");
  const photos = (photoRows ?? []).flatMap((photo) => {
    const url = signedByPath.get(photo.storage_path);
    return url ? [{
    id: photo.id,
    url,
    name: photo.original_name ?? "Listing photo",
    isPrimary: photo.is_primary,
    }] : [];
  });

  return <PostAdPageClient initialListing={{
    id: listing.id,
    title: listing.title,
    description: listing.description,
    priceCents: listing.price_cents,
    mainCategory: listing.category_slug ?? "",
    subCategory: listing.subcategory_slug ?? "",
    itemCondition: listing.item_condition,
    tradeMethod: listing.trade_method,
    region: ("main_location" in listing ? listing.main_location : null) ?? listing.region_city ?? "",
    area: ("sub_location" in listing ? listing.sub_location : null) ?? listing.region_suburb ?? "",
    locality: "locality" in listing && typeof listing.locality === "string" ? listing.locality : null,
    rawSuburb: "raw_suburb" in listing && typeof listing.raw_suburb === "string" ? listing.raw_suburb : null,
    locationRegion: "region" in listing && typeof listing.region === "string" ? listing.region : null,
    latitude: "latitude" in listing && listing.latitude ? Number(listing.latitude) : null,
    longitude: "longitude" in listing && listing.longitude ? Number(listing.longitude) : null,
    meetingPlace: listing.meeting_place ?? "",
    photos,
  }} />;
}

// A garage/moving sale can't be edited this way (its items are edited individually),
// and a listing not in market_listings at all is either a single-item bargain deal
// (handled below) or genuinely doesn't exist.
async function EditBargainListingFallback({ listingId, userId, supabase }: { listingId: string; userId: string; supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>> }) {
  const { data: listing } = await supabase.from("bargain_listings").select("id,title,description,price_cents,bargain_type,category_slug,subcategory_slug,item_condition,trade_method,region_city,region_suburb,main_location,sub_location,locality,raw_suburb,region,latitude,longitude,meeting_place,status").eq("id", listingId).eq("owner_id", userId).maybeSingle();
  if (!listing || isMultiItemBargain(listing.bargain_type as BargainListingType) || listing.status === "sold") redirect(`/market/${listingId}`);
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
