import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function PATCH() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Messaging is unavailable right now." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  const readAt = new Date().toISOString();
  const [{ error: messageError }, { error: notificationError }] = await Promise.all([
    supabase
      .from("market_messages")
      .update({ read_at: readAt })
      .eq("recipient_id", user.id)
      .is("read_at", null),
    // Only conversation-bound notifications: clearing the inbox should not silence offer or listing alerts.
    supabase
      .from("market_notifications")
      .update({ read_at: readAt })
      .eq("user_id", user.id)
      .not("conversation_id", "is", null)
      .is("read_at", null),
  ]);
  if (messageError || notificationError) return NextResponse.json({ error: "Unable to mark messages as read." }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
