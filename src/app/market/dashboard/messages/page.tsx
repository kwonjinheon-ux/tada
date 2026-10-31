import { redirect } from "next/navigation";
import { MarketMessagesClient } from "@/components/messages/MarketMessagesClient";
import { getServerUserId } from "@/lib/auth-server";
import { loadInbox, loadThread } from "@/lib/market/messaging";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Messages" };

export default async function MarketMessagesPage({ searchParams }: { searchParams: Promise<{ conversation?: string }> }) {
  const { conversation: requestedConversationId } = await searchParams;
  const userId = await getServerUserId();
  if (!userId) {
    const redirectTo = `/market/dashboard/messages${requestedConversationId ? `?conversation=${encodeURIComponent(requestedConversationId)}` : ""}`;
    redirect(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return <div className="dashboard-content messages-unavailable">Messaging is unavailable right now.</div>;

  // The requested thread is read alongside the inbox; row-level security returns
  // nothing for a conversation the user is not part of, and the client only opens
  // a thread that appears in their inbox.
  const [conversations, initialThread] = await Promise.all([
    loadInbox(supabase, userId),
    requestedConversationId ? loadThread(supabase, userId, requestedConversationId) : Promise.resolve(null),
  ]);
  const selectedConversationId = requestedConversationId && conversations.some((conversation) => conversation.id === requestedConversationId) ? requestedConversationId : null;

  return <MarketMessagesClient conversations={conversations} selectedConversationId={selectedConversationId} initialThread={selectedConversationId ? initialThread : null} currentUserId={userId} />;
}
