import { redirect } from "next/navigation";
import { MarketMessagesClient, type ConversationSummary, type MarketMessage, type TradeOffer } from "@/components/messages/MarketMessagesClient";
import { getServerUser } from "@/lib/auth-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSignedStorageImages } from "@/lib/supabase/storage-image";
import { formatMarketPrice } from "@/lib/market/format-price";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Messages" };

type ConversationRow = { id: string; listing_id: string; buyer_id: string; seller_id: string; last_message_preview: string | null; last_message_at: string | null };
type StateRow = { conversation_id: string; archived_at: string | null; deleted_at: string | null };
type ListingRow = { id: string; title: string; price_cents: number };
type PhotoRow = { listing_id: string; storage_path: string | null; display_order: number };
type ProfileRow = { id: string; display_name: string | null; avatar_path: string | null };
type MessageRow = { id: string; conversation_id: string; sender_id: string; recipient_id: string; body: string; created_at: string; read_at: string | null };
type OfferRow = { id: string; conversation_id: string; listing_id: string; buyer_id: string; seller_id: string; amount_cents: number; note: string | null; status: TradeOffer["status"]; created_at: string; responded_at: string | null; completed_at: string | null };
type ReviewRow = { offer_id: string; created_at: string };

export default async function MarketMessagesPage({ searchParams }: { searchParams: Promise<{ conversation?: string }> }) {
  const { conversation: requestedConversationId } = await searchParams;
  const user = await getServerUser();
  if (!user) {
    const redirectTo = `/market/dashboard/messages${requestedConversationId ? `?conversation=${encodeURIComponent(requestedConversationId)}` : ""}`;
    redirect(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return <div className="dashboard-content messages-unavailable">Messaging is unavailable right now.</div>;

  const [{ data: rawConversations }, { data: rawStates }] = await Promise.all([
    supabase
      .from("market_conversations")
      .select("id,listing_id,buyer_id,seller_id,last_message_preview,last_message_at")
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order("last_message_at", { ascending: false, nullsFirst: false }),
    supabase.from("market_conversation_states").select("conversation_id,archived_at,deleted_at").eq("user_id", user.id),
  ]);
  // Archive and delete are per-participant, so the inbox is the intersection of
  // the conversations the user is in and the state rows they own.
  const states = new Map(((rawStates ?? []) as StateRow[]).map((state) => [state.conversation_id, state]));
  const conversationRows = ((rawConversations ?? []) as ConversationRow[]).filter((conversation) => !states.get(conversation.id)?.deleted_at);
  const selectedConversationId = requestedConversationId && conversationRows.some((conversation) => conversation.id === requestedConversationId)
    ? requestedConversationId
    : null;
  const listingIds = [...new Set(conversationRows.map((conversation) => conversation.listing_id))];
  const participantIds = [...new Set(conversationRows.flatMap((conversation) => [conversation.buyer_id, conversation.seller_id]))];
  const [{ data: rawListings }, { data: rawPhotos }, { data: rawProfiles }, { data: unreadRows }, { data: rawMessages }, { data: rawOffers }] = await Promise.all([
    listingIds.length ? supabase.from("market_listings").select("id,title,price_cents").in("id", listingIds) : Promise.resolve({ data: [] }),
    listingIds.length ? supabase.from("market_listing_photos").select("listing_id,storage_path,display_order").in("listing_id", listingIds).order("display_order") : Promise.resolve({ data: [] }),
    participantIds.length ? supabase.from("market_message_profiles").select("id,display_name,avatar_path").in("id", participantIds) : Promise.resolve({ data: [] }),
    conversationRows.length ? supabase.from("market_messages").select("conversation_id").eq("recipient_id", user.id).is("read_at", null) : Promise.resolve({ data: [] }),
    selectedConversationId ? supabase.from("market_messages").select("id,conversation_id,sender_id,recipient_id,body,created_at,read_at").eq("conversation_id", selectedConversationId).order("created_at") : Promise.resolve({ data: [] }),
    selectedConversationId ? supabase.from("market_trade_offers").select("id,conversation_id,listing_id,buyer_id,seller_id,amount_cents,note,status,created_at,responded_at,completed_at").eq("conversation_id", selectedConversationId).order("created_at", { ascending: true }) : Promise.resolve({ data: [] }),
  ]);
  const offerIds = ((rawOffers ?? []) as OfferRow[]).map((offer) => offer.id);
  const { data: rawReviews } = offerIds.length
    ? await supabase.from("market_seller_ratings").select("offer_id,created_at").in("offer_id", offerIds).eq("rater_id", user.id)
    : { data: [] };
  const listings = new Map(((rawListings ?? []) as ListingRow[]).map((listing) => [listing.id, listing]));
  const primaryPhotos = new Map<string, string>();
  for (const photo of (rawPhotos ?? []) as PhotoRow[]) if (photo.storage_path && !primaryPhotos.has(photo.listing_id)) primaryPhotos.set(photo.listing_id, photo.storage_path);
  const photoPaths = [...primaryPhotos.values()];
  const profiles = new Map(((rawProfiles ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]));
  const avatarPaths = [...new Set([...profiles.values()].map((profile) => profile.avatar_path).filter((path): path is string => Boolean(path)))];
  const [signedPhotoUrls, signedAvatarEntries] = await Promise.all([
    getSignedStorageImages("market-listing-images", photoPaths, "thumbnail"),
    Promise.all(avatarPaths.map(async (path) => {
      const { data, error } = await supabase.storage
        .from("profile-avatars")
        .createSignedUrl(path, 3600, { transform: { width: 256, height: 256, quality: 76, resize: "cover" } });
      return !error && data?.signedUrl ? [path, data.signedUrl] as const : null;
    })),
  ]);
  const avatarUrls = new Map(
    signedAvatarEntries.filter((entry): entry is readonly [string, string] => Boolean(entry)),
  );
  const unreadCounts = new Map<string, number>();
  for (const unread of (unreadRows ?? []) as Array<{ conversation_id: string }>) unreadCounts.set(unread.conversation_id, (unreadCounts.get(unread.conversation_id) ?? 0) + 1);
  const conversations: ConversationSummary[] = conversationRows.map((conversation) => {
    const counterpartId = conversation.buyer_id === user.id ? conversation.seller_id : conversation.buyer_id;
    const counterpart = profiles.get(counterpartId);
    const listing = listings.get(conversation.listing_id);
    const photoPath = primaryPhotos.get(conversation.listing_id);
    return {
      id: conversation.id,
      listing: { id: conversation.listing_id, title: listing?.title ?? "Marketplace listing", price: listing ? formatMarketPrice(listing.price_cents) : "", imageUrl: photoPath ? signedPhotoUrls.get(photoPath) ?? null : null },
      counterpart: { id: counterpartId, name: counterpart?.display_name || "Tada member", avatarUrl: counterpart?.avatar_path ? avatarUrls.get(counterpart.avatar_path) ?? null : null },
      lastMessagePreview: conversation.last_message_preview,
      lastMessageAt: conversation.last_message_at,
      unreadCount: unreadCounts.get(conversation.id) ?? 0,
      role: conversation.buyer_id === user.id ? "buying" : "selling",
      archivedAt: states.get(conversation.id)?.archived_at ?? null,
    };
  });
  const initialMessages: MarketMessage[] = ((rawMessages ?? []) as MessageRow[]).map((message) => ({ id: message.id, conversationId: message.conversation_id, senderId: message.sender_id, recipientId: message.recipient_id, body: message.body, createdAt: message.created_at, readAt: message.read_at }));
  const reviewedAtByOfferId = new Map(((rawReviews ?? []) as ReviewRow[]).map((review) => [review.offer_id, review.created_at]));
  const initialOffers: TradeOffer[] = ((rawOffers ?? []) as OfferRow[]).map((offer) => ({ id: offer.id, conversationId: offer.conversation_id, listingId: offer.listing_id, buyerId: offer.buyer_id, sellerId: offer.seller_id, amountCents: offer.amount_cents, note: offer.note, status: offer.status, createdAt: offer.created_at, respondedAt: offer.responded_at, completedAt: offer.completed_at, reviewedAt: reviewedAtByOfferId.get(offer.id) ?? null }));

  return <MarketMessagesClient conversations={conversations} selectedConversationId={selectedConversationId} initialMessages={initialMessages} initialOffers={initialOffers} currentUserId={user.id} />;
}
