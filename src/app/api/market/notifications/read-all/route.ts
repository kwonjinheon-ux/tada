import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function PATCH() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Notifications are unavailable right now." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  const { error } = await supabase
    .from("market_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);
  if (error) return NextResponse.json({ error: "Unable to mark notifications as read." }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
