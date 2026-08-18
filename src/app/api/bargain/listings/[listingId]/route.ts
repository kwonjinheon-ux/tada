import { NextResponse } from "next/server";
import { isMultiItemBargain, type BargainListingType } from "@/lib/bargain/listing-types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { prohibitedMarketplaceItemsMessage, violatesMarketplaceProhibitedItemsPolicy } from "@/lib/market/prohibited-items";

const validConditions = new Set(["brand_new", "like_new", "excellent", "good", "fair"]);
const validTradeMethods = new Set(["pickup_delivery", "pickup", "delivery"]);
const standardBargainTypes = new Set<BargainListingType>(["2-dollar-deals", "5-dollar-deals", "10-dollar-deals"]);

async function getOwnedStandardListing(listingId: string, ownerId: string) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { supabase: null, listing: null };
  const { data: listing } = await supabase
    .from("bargain_listings")
    .select("id,owner_id,status,bargain_type")
    .eq("id", listingId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  const typedListing = listing as { id: string; owner_id: string; status: string; bargain_type: BargainListingType } | null;
  return { supabase, listing: typedListing && standardBargainTypes.has(typedListing.bargain_type) && !isMultiItemBargain(typedListing.bargain_type) ? typedListing : null };
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ listingId: string }> }) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Listing management is unavailable right now." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in to delete a listing." }, { status: 401 });
  const { listingId } = await params;
  const { data: listing } = await supabase.from("bargain_listings").select("id,owner_id,bargain_type").eq("id", listingId).eq("owner_id", user.id).maybeSingle();
  const typedListing = listing as { id: string; bargain_type: BargainListingType } | null;
  if (!typedListing || !standardBargainTypes.has(typedListing.bargain_type)) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  const { data: photos } = await supabase.from("bargain_listing_photos").select("storage_path").eq("listing_id", listingId);
  const { error } = await supabase.from("bargain_listings").delete().eq("id", listingId).eq("owner_id", user.id);
  if (error) return NextResponse.json({ error: "Unable to delete this listing right now." }, { status: 500 });
  const paths = (photos ?? []).flatMap((photo) => photo.storage_path ? [photo.storage_path] : []);
  if (paths.length) await supabase.storage.from("bargain-listing-images").remove(paths);
  return NextResponse.json({ deleted: true });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ listingId: string }> }) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Listing management is unavailable right now." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in to edit a listing." }, { status: 401 });
  const { listingId } = await params;
  const payload = await request.json().catch(() => null) as Record<string, unknown> | null;
  const owned = await getOwnedStandardListing(listingId, user.id);
  if (!owned.supabase) return NextResponse.json({ error: "Listing management is unavailable right now." }, { status: 503 });
  if (!owned.listing) return NextResponse.json({ error: "Listing not found." }, { status: 404 });

  if (payload?.action === "mark_sold") {
    if (owned.listing.status === "sold") return NextResponse.json({ error: "This listing is already sold." }, { status: 409 });
    const { data, error } = await owned.supabase.from("bargain_listings").update({ status: "sold" }).eq("id", listingId).eq("owner_id", user.id).select("id").maybeSingle();
    if (error || !data) return NextResponse.json({ error: "Unable to mark this listing as sold right now." }, { status: 500 });
    return NextResponse.json({ listingId: data.id, status: "sold" });
  }

  if (owned.listing.status === "sold") return NextResponse.json({ error: "Sold listings cannot be edited." }, { status: 403 });
  const title = typeof payload?.title === "string" ? payload.title.trim() : "";
  const description = typeof payload?.description === "string" ? payload.description.trim() : "";
  const priceCents = typeof payload?.priceCents === "number" ? payload.priceCents : NaN;
  const itemCondition = String(payload?.itemCondition ?? "");
  const tradeMethod = String(payload?.tradeMethod ?? "");
  if (title.length < 2 || title.length > 120) return NextResponse.json({ error: "Title must be between 2 and 120 characters." }, { status: 400 });
  if (violatesMarketplaceProhibitedItemsPolicy(title, description, payload?.categorySlug as string | null | undefined, payload?.subcategorySlug as string | null | undefined)) return NextResponse.json({ error: prohibitedMarketplaceItemsMessage }, { status: 400 });
  if (description.length < 20 || description.length > 5000) return NextResponse.json({ error: "Description must be between 20 and 5,000 characters." }, { status: 400 });
  if (!Number.isInteger(priceCents) || priceCents < 0) return NextResponse.json({ error: "Enter a valid price." }, { status: 400 });
  if (!validConditions.has(itemCondition) || !validTradeMethods.has(tradeMethod)) return NextResponse.json({ error: "Choose valid listing details." }, { status: 400 });

  const update = {
    title, description, price_cents: priceCents, item_condition: itemCondition, trade_method: tradeMethod,
    category_slug: typeof payload?.categorySlug === "string" ? payload.categorySlug || null : null,
    subcategory_slug: typeof payload?.subcategorySlug === "string" ? payload.subcategorySlug || null : null,
    region_city: typeof payload?.regionCity === "string" ? payload.regionCity || null : null,
    region_suburb: typeof payload?.regionSuburb === "string" ? payload.regionSuburb || null : null,
    main_location: typeof payload?.mainLocation === "string" ? payload.mainLocation || null : null,
    sub_location: typeof payload?.subLocation === "string" ? payload.subLocation || null : null,
    locality: typeof payload?.locality === "string" ? payload.locality || null : null,
    raw_suburb: typeof payload?.rawSuburb === "string" ? payload.rawSuburb || null : null,
    region: typeof payload?.region === "string" ? payload.region || null : null,
    latitude: typeof payload?.latitude === "number" ? payload.latitude : null,
    longitude: typeof payload?.longitude === "number" ? payload.longitude : null,
    meeting_place: typeof payload?.meetingPlace === "string" ? payload.meetingPlace || null : null,
  };
  const { data, error } = await owned.supabase.from("bargain_listings").update(update).eq("id", listingId).eq("owner_id", user.id).select("id").maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Unable to update this listing right now." }, { status: 500 });
  return NextResponse.json({ listingId: data.id });
}
