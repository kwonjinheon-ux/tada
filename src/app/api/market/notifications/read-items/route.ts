import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(request: Request) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Notifications are unavailable right now." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });

  const body = await request.json().catch(() => null) as { ids?: unknown } | null;
  const ids = body?.ids;
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 500 || !ids.every((id) => typeof id === "string" && uuidPattern.test(id))) {
    return NextResponse.json({ error: "Choose valid notifications." }, { status: 400 });
  }
  const { error } = await supabase.from("market_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .in("id", ids)
    .is("read_at", null);
  if (error) return NextResponse.json({ error: "Unable to mark notifications as read." }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
