import { notFound, redirect } from "next/navigation";
import { PostAdPageClient } from "@/components/post-ad/PostAdPageClient";
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
  if (!listing) notFound();
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
