import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActiveJourneyItem } from "@/components/dashboard/ActiveJourneyCarousel";
import { formatMarketPrice } from "@/lib/market/format-price";
import { getSignedStorageImages } from "@/lib/supabase/storage-image";

type OfferRow = { id: string; conversation_id: string; listing_id: string; amount_cents: number; status: "pending" | "accepted"; updated_at: string };
type ListingRow = { id: string; title: string; view_count: number | null };
type PhotoRow = { listing_id: string; storage_path: string | null; is_primary: boolean; display_order: number };

const MAX_BUYING = 6;
const MAX_SELLING = 6;

/**
 * A "journey" is a trade in flight, on either side. Buying reuses the offer's own
 * status as the stepper stage (pending -> "offer", accepted -> "accepted", which
 * the stepper already renders with "meet" as the highlighted next step — there is
 * no separate "meeting scheduled" state in the schema, so no meeting time is shown
 * here; adding one is a real feature, not something to invent as a side effect of
 * wiring this up). Selling groups a seller's still-open (pending) offers by
 * listing, since several buyers can be bidding on the same item at once.
 */
export async function getActiveJourneys(supabase: SupabaseClient, userId: string): Promise<ActiveJourneyItem[]> {
  const [{ data: buyingRows }, { data: sellingRows }] = await Promise.all([
    supabase
      .from("market_trade_offers")
      .select("id,conversation_id,listing_id,amount_cents,status,updated_at")
      .eq("buyer_id", userId)
      .in("status", ["pending", "accepted"])
      .order("updated_at", { ascending: false })
      .limit(MAX_BUYING),
    supabase
      .from("market_trade_offers")
      .select("id,conversation_id,listing_id,amount_cents,status,updated_at")
      .eq("seller_id", userId)
      .eq("status", "pending")
      .order("amount_cents", { ascending: false }),
  ]);
  const buyingOffers = (buyingRows ?? []) as OfferRow[];
  const pendingSaleOffers = (sellingRows ?? []) as OfferRow[];

  const sellingByListing = new Map<string, { count: number; bestAmountCents: number; conversationId: string }>();
  for (const offer of pendingSaleOffers) {
    const current = sellingByListing.get(offer.listing_id);
    if (!current) sellingByListing.set(offer.listing_id, { count: 1, bestAmountCents: offer.amount_cents, conversationId: offer.conversation_id });
    else {
      current.count += 1;
      if (offer.amount_cents > current.bestAmountCents) { current.bestAmountCents = offer.amount_cents; current.conversationId = offer.conversation_id; }
    }
  }
  const sellingListingIds = [...sellingByListing.keys()].slice(0, MAX_SELLING);

  const listingIds = [...new Set([...buyingOffers.map((offer) => offer.listing_id), ...sellingListingIds])];
  if (!listingIds.length) return [];

  const [{ data: listingRows }, { data: photoRows }] = await Promise.all([
    supabase.from("market_listings").select("id,title,view_count").in("id", listingIds),
    supabase.from("market_listing_photos").select("listing_id,storage_path,is_primary,display_order").in("listing_id", listingIds).order("display_order", { ascending: true }),
  ]);
  const listings = new Map(((listingRows ?? []) as ListingRow[]).map((listing) => [listing.id, listing]));
  const primaryPhotoByListing = new Map<string, string>();
  for (const photo of (photoRows ?? []) as PhotoRow[]) {
    if (!photo.storage_path) continue;
    if (!primaryPhotoByListing.has(photo.listing_id) || photo.is_primary) primaryPhotoByListing.set(photo.listing_id, photo.storage_path);
  }
  const signedImages = await getSignedStorageImages("market-listing-images", [...new Set(primaryPhotoByListing.values())], "thumbnail");
  const imageFor = (listingId: string) => {
    const path = primaryPhotoByListing.get(listingId);
    return path ? signedImages.get(path) ?? null : null;
  };

  const buyingItems: ActiveJourneyItem[] = buyingOffers
    .filter((offer) => listings.has(offer.listing_id))
    .map((offer) => ({
      id: offer.id,
      role: "buying",
      title: listings.get(offer.listing_id)?.title ?? "Marketplace listing",
      imageUrl: imageFor(offer.listing_id),
      stage: offer.status === "accepted" ? "accepted" : "offer",
      statusLabel: offer.status === "accepted" ? "Offer accepted" : "Offer sent",
      meetingLabel: null,
      conversationHref: `/market/dashboard/messages?conversation=${offer.conversation_id}`,
    }));

  const sellingItems: ActiveJourneyItem[] = sellingListingIds
    .filter((listingId) => listings.has(listingId))
    .map((listingId) => {
      const listing = listings.get(listingId)!;
      const aggregate = sellingByListing.get(listingId)!;
      return {
        id: listingId,
        role: "selling",
        title: listing.title,
        imageUrl: imageFor(listingId),
        newOfferCount: aggregate.count,
        bestOfferLabel: formatMarketPrice(aggregate.bestAmountCents),
        totalViews: listing.view_count ?? 0,
        reviewHref: `/market/dashboard/messages?conversation=${aggregate.conversationId}`,
      };
    });

  return [...buyingItems, ...sellingItems];
}
