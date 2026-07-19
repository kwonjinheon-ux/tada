import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type ConversationRow = { buyer_id: string; seller_id: string };

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Messaging is unavailable right now." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in to send a message." }, { status: 401 });

  const payload = await request.json().catch(() => null) as { conversationId?: unknown; body?: unknown } | null;
  const conversationId = typeof payload?.conversationId === "string" ? payload.conversationId : "";
  const body = typeof payload?.body === "string" ? payload.body.trim() : "";
  if (!conversationId || !body || body.length > 2000) return NextResponse.json({ error: "Messages must be between 1 and 2,000 characters." }, { status: 400 });

  const { data: conversation, error: conversationError } = await supabase
    .from("market_conversations")
    .select("buyer_id,seller_id")
    .eq("id", conversationId)
    .maybeSingle();
  const participant = conversation as ConversationRow | null;
  if (conversationError || !participant || (participant.buyer_id !== user.id && participant.seller_id !== user.id)) {
    return NextResponse.json({ error: "This conversation is unavailable." }, { status: 404 });
  }
  const recipientId = participant.buyer_id === user.id ? participant.seller_id : participant.buyer_id;

  const { data: message, error } = await supabase
    .from("market_messages")
    .insert({ conversation_id: conversationId, sender_id: user.id, recipient_id: recipientId, body })
    .select("id,conversation_id,sender_id,recipient_id,body,created_at,read_at")
    .single();
  if (error || !message) return NextResponse.json({ error: "Unable to send your message." }, { status: 500 });
  return NextResponse.json({ message }, { status: 201 });
}
