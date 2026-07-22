import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Messaging is unavailable right now." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in to send a message." }, { status: 401 });

  const payload = await request.json().catch(() => null) as { conversationId?: unknown; body?: unknown } | null;
  const conversationId = typeof payload?.conversationId === "string" ? payload.conversationId : "";
  const body = typeof payload?.body === "string" ? payload.body.trim() : "";
  if (!conversationId || !body || body.length > 2000) return NextResponse.json({ error: "Messages must be between 1 and 2,000 characters." }, { status: 400 });

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
    return NextResponse.json({ error: errorMessage }, { status });
  }
  return NextResponse.json({ message }, { status: 201 });
}
