import { NextResponse } from "next/server";
import { getServerUserId } from "@/lib/auth-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function PATCH(_: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Messaging is unavailable right now." }, { status: 503 });
  const userId = await getServerUserId();
  if (!userId) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  const { conversationId } = await params;
  const readAt = new Date().toISOString();
  const [{ error: messageError }, { error: notificationError }] = await Promise.all([
    supabase
      .from("market_messages")
      .update({ read_at: readAt })
      .eq("conversation_id", conversationId)
      .eq("recipient_id", userId)
      .is("read_at", null),
    supabase
      .from("market_notifications")
      .update({ read_at: readAt })
      .eq("conversation_id", conversationId)
      .eq("user_id", userId)
      .is("read_at", null),
  ]);
  if (messageError || notificationError) return NextResponse.json({ error: "Unable to mark messages as read." }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
