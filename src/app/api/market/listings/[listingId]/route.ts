import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function DELETE(_request: Request, { params }: { params: Promise<{ listingId: string }> }) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Listing management is unavailable right now." }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in to delete a listing." }, { status: 401 });

  const { listingId } = await params;
  const { data: listing } = await supabase.from("market_listings").select("id,owner_id,status,sold_at").eq("id", listingId).maybeSingle();
  if (!listing) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  if (listing.owner_id !== user.id) return NextResponse.json({ error: "You can only delete your own listings." }, { status: 403 });
  if (listing.status === "sold") {
    const soldAt = listing.sold_at ? new Date(listing.sold_at).getTime() : NaN;
    const canDeleteAt = Number.isFinite(soldAt) ? soldAt + 30 * 24 * 60 * 60 * 1000 : Infinity;
    if (Date.now() < canDeleteAt) {
      return NextResponse.json({ error: "Sold listings can be deleted 30 days after completion." }, { status: 403 });
    }
  }

  const { data: photos } = await supabase.from("market_listing_photos").select("storage_path").eq("listing_id", listingId);
  const paths = (photos ?? []).map((photo) => photo.storage_path).filter((path): path is string => Boolean(path));
  const { error: deleteError } = await supabase.from("market_listings").delete().eq("id", listingId).eq("owner_id", user.id);
  if (deleteError) return NextResponse.json({ error: "Unable to delete this listing right now." }, { status: 500 });

  if (paths.length) await supabase.storage.from("market-listing-images").remove(paths);
  return NextResponse.json({ deleted: true });
}

export async function POST(_request: Request, { params }: { params: Promise<{ listingId: string }> }) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Listing management is unavailable right now." }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in to relist a listing." }, { status: 401 });

  const { listingId } = await params;
  const { data: listing } = await supabase
    .from("market_listings")
    .select("id,status")
    .eq("id", listingId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!listing) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  if (listing.status !== "published") return NextResponse.json({ error: "Only active listings can be relisted." }, { status: 403 });

  const { data: relistedListing, error } = await supabase
    .from("market_listings")
    .update({ created_at: new Date().toISOString() })
    .eq("id", listingId)
    .eq("owner_id", user.id)
    .select("id,created_at")
    .maybeSingle();
  if (error || !relistedListing) return NextResponse.json({ error: "Unable to relist this item right now." }, { status: 500 });

  return NextResponse.json({ listingId: relistedListing.id, relistedAt: relistedListing.created_at });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ listingId: string }> }) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Listing management is unavailable right now." }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in to edit a listing." }, { status: 401 });

  const payload = await request.json().catch(() => null) as Record<string, unknown> | null;
  const title = typeof payload?.title === "string" ? payload.title.trim() : "";
  const description = typeof payload?.description === "string" ? payload.description.trim() : "";
  const priceCents = typeof payload?.priceCents === "number" ? payload.priceCents : NaN;
  const itemCondition = payload?.itemCondition;
  const tradeMethod = payload?.tradeMethod;
  const categorySlug = typeof payload?.categorySlug === "string" ? payload.categorySlug.trim() || null : null;
  const subcategorySlug = typeof payload?.subcategorySlug === "string" ? payload.subcategorySlug.trim() || null : null;
  const regionCity = typeof payload?.regionCity === "string" ? payload.regionCity.trim() || null : null;
  const regionSuburb = typeof payload?.regionSuburb === "string" ? payload.regionSuburb.trim() || null : null;
  const mainLocation = typeof payload?.mainLocation === "string" ? payload.mainLocation.trim() || null : regionCity;
  const subLocation = typeof payload?.subLocation === "string" ? payload.subLocation.trim() || null : regionSuburb;
  const locality = typeof payload?.locality === "string" ? payload.locality.trim() || null : null;
  const rawSuburb = typeof payload?.rawSuburb === "string" ? payload.rawSuburb.trim() || null : null;
  const region = typeof payload?.region === "string" ? payload.region.trim() || null : null;
  const latitude = typeof payload?.latitude === "number" && Number.isFinite(payload.latitude) ? payload.latitude : null;
  const longitude = typeof payload?.longitude === "number" && Number.isFinite(payload.longitude) ? payload.longitude : null;
  const meetingPlace = typeof payload?.meetingPlace === "string" ? payload.meetingPlace.trim() || null : null;
  const validConditions = new Set(["brand_new", "like_new", "excellent", "good", "fair"]);
  const validTradeMethods = new Set(["pickup_delivery", "pickup", "delivery"]);
  if (title.length < 2 || title.length > 120) return NextResponse.json({ error: "Title must be between 2 and 120 characters." }, { status: 400 });
  if (description.length < 20 || description.length > 5000) return NextResponse.json({ error: "Description must be between 20 and 5,000 characters." }, { status: 400 });
  if (!Number.isInteger(priceCents) || priceCents < 0 || priceCents > 100_000_000) return NextResponse.json({ error: "Enter a valid price." }, { status: 400 });
  if (!validConditions.has(String(itemCondition)) || !validTradeMethods.has(String(tradeMethod))) return NextResponse.json({ error: "Choose valid listing details." }, { status: 400 });
  if ([mainLocation, subLocation, locality, rawSuburb, region].some((value) => value !== null && value.length > 120)) return NextResponse.json({ error: "Location details must be 120 characters or fewer." }, { status: 400 });
  if ((latitude !== null && (latitude < -90 || latitude > 90)) || (longitude !== null && (longitude < -180 || longitude > 180))) return NextResponse.json({ error: "Enter valid location coordinates." }, { status: 400 });

  const { listingId } = await params;
  const { data: currentListing } = await supabase
    .from("market_listings")
    .select("id,status")
    .eq("id", listingId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!currentListing) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  if (currentListing.status === "sold") return NextResponse.json({ error: "Sold listings cannot be edited." }, { status: 403 });

  const { data: listing, error } = await supabase
    .from("market_listings")
    .update({
      title,
      description,
      price_cents: priceCents,
      item_condition: itemCondition,
      trade_method: tradeMethod,
      category_slug: categorySlug,
      subcategory_slug: subcategorySlug,
      region_city: regionCity,
      region_suburb: regionSuburb,
      main_location: mainLocation,
      sub_location: subLocation,
      locality,
      raw_suburb: rawSuburb,
      region,
      latitude,
      longitude,
      meeting_place: meetingPlace,
    })
    .eq("id", listingId)
    .eq("owner_id", user.id)
    .select("id")
    .maybeSingle();
  if (error || !listing) return NextResponse.json({ error: "Unable to update this listing right now." }, { status: 403 });
  return NextResponse.json({ listingId: listing.id });
}
