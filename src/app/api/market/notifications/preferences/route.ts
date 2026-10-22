import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const preferenceKeys = ["keyword_enabled", "wishlist_enabled", "community_enabled", "service_reviews_enabled"] as const;
type PreferenceKey = (typeof preferenceKeys)[number];

export async function PATCH(request: Request) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Notifications are unavailable right now." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });

  const body = await request.json().catch(() => null) as { key?: unknown; enabled?: unknown } | null;
  if (!body || !preferenceKeys.includes(body.key as PreferenceKey) || typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "Choose a valid notification setting." }, { status: 400 });
  }
  const key = body.key as PreferenceKey;

  // Create the default row once, then update only the chosen column. This
  // avoids concurrent toggle requests replacing each other's values.
  const { error: createError } = await supabase.from("notification_preferences")
    .upsert({ user_id: user.id }, { onConflict: "user_id", ignoreDuplicates: true });
  if (createError) return NextResponse.json({ error: "Unable to save notification settings." }, { status: 500 });

  const { error: updateError } = await supabase.from("notification_preferences")
    .update({ [key]: body.enabled, updated_at: new Date().toISOString() })
    .eq("user_id", user.id);
  if (updateError) return NextResponse.json({ error: "Unable to save notification settings." }, { status: 500 });
  return NextResponse.json({ key, enabled: body.enabled });
}
