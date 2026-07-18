import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function PATCH(_: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Messaging is unavailable right now." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  const { conversationId } = await params;
  const { error } = await supabase
    .from("market_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("recipient_id", user.id)
    .is("read_at", null);
  if (error) return NextResponse.json({ error: "Unable to mark messages as read." }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
