import { marketMessageRequestSchema } from "@/contracts/api";
import { apiFailure, apiSuccess } from "@/lib/api/response";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { consumeMarketRateLimit } from "@/lib/market/safety";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return apiFailure("UNAVAILABLE", "Messaging is unavailable right now.", 503);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiFailure("UNAUTHORIZED", "Please log in to send a message.", 401);
  if (!await consumeMarketRateLimit(supabase, "message")) return apiFailure("RATE_LIMITED", "You are sending messages too quickly. Please try again in a minute.", 429);

  const parsed = marketMessageRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiFailure("BAD_REQUEST", "Messages must be between 1 and 2,000 characters.", 400);
  const { conversationId, body } = parsed.data;

  const { data: message, error } = await supabase
    .from("market_messages")
    // The database trigger verifies participation and derives the real recipient.
    // This avoids an extra conversation lookup on every message send.
    .insert({ conversation_id: conversationId, sender_id: user.id, recipient_id: user.id, body })
    .select("id,conversation_id,sender_id,recipient_id,body,created_at,read_at")
    .single();
  if (error || !message) {
    const status = error?.code === "42501" || error?.code === "P0001" ? 403 : 500;
    const errorMessage = status === 403 ? "You can only send messages in your own conversations." : "Unable to send your message. Please try again.";
    return apiFailure(status === 403 ? "FORBIDDEN" : "INTERNAL", errorMessage, status);
  }
  return apiSuccess({
    id: message.id,
    conversationId: message.conversation_id,
    senderId: message.sender_id,
    recipientId: message.recipient_id,
    body: message.body,
    createdAt: message.created_at,
    readAt: message.read_at,
  }, { status: 201 });
}
