import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { MarketMessagesClient, type ConversationSummary, type MarketMessage } from "@/components/messages/MarketMessagesClient";
import { getServerUser } from "@/lib/auth-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Messages" };

type ConversationRow = { id: string; listing_id: string; buyer_id: string; seller_id: string; last_message_preview: string | null; last_message_at: string | null };
type ListingRow = { id: string; title: string; price_cents: number };
type PhotoRow = { listing_id: string; storage_path: string | null; display_order: number };
type ProfileRow = { id: string; display_name: string | null; avatar_path: string | null };
type MessageRow = { id: string; conversation_id: string; sender_id: string; recipient_id: string; body: string; created_at: string; read_at: string | null };

function formatPrice(priceCents: number) {
  return new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: priceCents % 100 === 0 ? 0 : 2 }).format(priceCents / 100);
}

export default async function MarketMessagesPage({ searchParams }: { searchParams: Promise<{ conversation?: string }> }) {
  const { conversation: requestedConversationId } = await searchParams;
  const user = await getServerUser();
  if (!user) {
    const redirectTo = `/market/dashboard/messages${requestedConversationId ? `?conversation=${encodeURIComponent(requestedConversationId)}` : ""}`;
    redirect(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return <main className="messages-unavailable">Messaging is unavailable right now.</main>;

  const { data: rawConversations } = await supabase
    .from("market_conversations")
    .select("id,listing_id,buyer_id,seller_id,last_message_preview,last_message_at")
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .order("last_message_at", { ascending: false, nullsFirst: false });
  const conversationRows = (rawConversations ?? []) as ConversationRow[];
  const selectedConversationId = requestedConversationId && conversationRows.some((conversation) => conversation.id === requestedConversationId)
    ? requestedConversationId
    : null;
  const listingIds = [...new Set(conversationRows.map((conversation) => conversation.listing_id))];
  const participantIds = [...new Set(conversationRows.flatMap((conversation) => [conversation.buyer_id, conversation.seller_id]))];
  const [{ data: rawListings }, { data: rawPhotos }, { data: rawProfiles }, { data: unreadRows }, { data: rawMessages }] = await Promise.all([
    listingIds.length ? supabase.from("market_listings").select("id,title,price_cents").in("id", listingIds) : Promise.resolve({ data: [] }),
    listingIds.length ? supabase.from("market_listing_photos").select("listing_id,storage_path,display_order").in("listing_id", listingIds).order("display_order") : Promise.resolve({ data: [] }),
    participantIds.length ? supabase.from("market_seller_profiles").select("id,display_name,avatar_path").in("id", participantIds) : Promise.resolve({ data: [] }),
    conversationRows.length ? supabase.from("market_messages").select("conversation_id").eq("recipient_id", user.id).is("read_at", null) : Promise.resolve({ data: [] }),
    selectedConversationId ? supabase.from("market_messages").select("id,conversation_id,sender_id,recipient_id,body,created_at,read_at").eq("conversation_id", selectedConversationId).order("created_at") : Promise.resolve({ data: [] }),
  ]);
  const listings = new Map(((rawListings ?? []) as ListingRow[]).map((listing) => [listing.id, listing]));
  const primaryPhotos = new Map<string, string>();
  for (const photo of (rawPhotos ?? []) as PhotoRow[]) if (photo.storage_path && !primaryPhotos.has(photo.listing_id)) primaryPhotos.set(photo.listing_id, photo.storage_path);
  const photoPaths = [...primaryPhotos.values()];
  const profiles = new Map(((rawProfiles ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]));
  const avatarPaths = [...new Set([...profiles.values()].map((profile) => profile.avatar_path).filter((path): path is string => Boolean(path)))];
  const [{ data: signedPhotos }, { data: signedAvatars }] = await Promise.all([
    photoPaths.length ? supabase.storage.from("market-listing-images").createSignedUrls(photoPaths, 3600) : Promise.resolve({ data: [] }),
    avatarPaths.length ? supabase.storage.from("profile-avatars").createSignedUrls(avatarPaths, 3600) : Promise.resolve({ data: [] }),
  ]);
  const signedPhotoUrls = new Map((signedPhotos ?? []).filter((photo) => photo.path && photo.signedUrl).map((photo) => [photo.path as string, photo.signedUrl as string]));
  const avatarUrls = new Map((signedAvatars ?? []).filter((avatar) => avatar.path && avatar.signedUrl).map((avatar) => [avatar.path as string, avatar.signedUrl as string]));
  const unreadCounts = new Map<string, number>();
  for (const unread of (unreadRows ?? []) as Array<{ conversation_id: string }>) unreadCounts.set(unread.conversation_id, (unreadCounts.get(unread.conversation_id) ?? 0) + 1);
  const conversations: ConversationSummary[] = conversationRows.map((conversation) => {
    const counterpartId = conversation.buyer_id === user.id ? conversation.seller_id : conversation.buyer_id;
    const counterpart = profiles.get(counterpartId);
    const listing = listings.get(conversation.listing_id);
    const photoPath = primaryPhotos.get(conversation.listing_id);
    return {
      id: conversation.id,
      listing: { id: conversation.listing_id, title: listing?.title ?? "Marketplace listing", price: listing ? formatPrice(listing.price_cents) : "", imageUrl: photoPath ? signedPhotoUrls.get(photoPath) ?? null : null },
      counterpart: { id: counterpartId, name: counterpart?.display_name || "Tada member", avatarUrl: counterpart?.avatar_path ? avatarUrls.get(counterpart.avatar_path) ?? null : null },
      lastMessagePreview: conversation.last_message_preview,
      lastMessageAt: conversation.last_message_at,
      unreadCount: unreadCounts.get(conversation.id) ?? 0,
      role: conversation.buyer_id === user.id ? "buying" : "selling",
    };
  });
  const initialMessages: MarketMessage[] = ((rawMessages ?? []) as MessageRow[]).map((message) => ({ id: message.id, conversationId: message.conversation_id, senderId: message.sender_id, recipientId: message.recipient_id, body: message.body, createdAt: message.created_at, readAt: message.read_at }));

  return <main className="marketplace-page dashboard-page messages-dashboard-page"><DashboardSidebar context="market" active="Messages" /><MarketMessagesClient conversations={conversations} selectedConversationId={selectedConversationId} initialMessages={initialMessages} currentUserId={user.id} /></main>;
}
