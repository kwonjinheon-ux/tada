import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type KeywordRequest = { keyword?: unknown; categorySlug?: unknown; id?: unknown };

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function getContext() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: NextResponse.json({ error: "Keyword alerts are unavailable right now." }, { status: 503 }) };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Please log in to manage keyword alerts." }, { status: 401 }) };
  return { supabase, user };
}

export async function GET() {
  const context = await getContext();
  if ("error" in context) return context.error;
  const { data, error } = await context.supabase.from("market_keyword_alerts").select("id,keyword,category_slug,created_at").eq("user_id", context.user.id).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Unable to load keyword alerts." }, { status: 500 });
  return NextResponse.json({ alerts: data ?? [] });
}

export async function POST(request: Request) {
  const context = await getContext();
  if ("error" in context) return context.error;
  const body = await request.json().catch(() => null) as KeywordRequest | null;
  const keyword = typeof body?.keyword === "string" ? body.keyword.trim().replace(/\s+/g, " ") : "";
  const categorySlug = typeof body?.categorySlug === "string" && body.categorySlug ? body.categorySlug : null;
  if (keyword.length < 2 || keyword.length > 80) return NextResponse.json({ error: "Use a keyword between 2 and 80 characters." }, { status: 400 });
  if (categorySlug) {
    const { data: category } = await context.supabase.from("market_categories").select("slug").eq("slug", categorySlug).maybeSingle();
    if (!category) return NextResponse.json({ error: "Choose a valid category." }, { status: 400 });
  }
  const { data, error } = await context.supabase.from("market_keyword_alerts").insert({ user_id: context.user.id, keyword, category_slug: categorySlug }).select("id,keyword,category_slug,created_at").single();
  if (error?.code === "23505") return NextResponse.json({ error: "That keyword is already being tracked." }, { status: 409 });
  if (error?.code === "P0001") return NextResponse.json({ error: "You can save up to 20 keyword alerts." }, { status: 400 });
  if (error || !data) return NextResponse.json({ error: "Unable to add this keyword right now." }, { status: 500 });
  return NextResponse.json({ alert: data }, { status: 201 });
}

export async function DELETE(request: Request) {
  const context = await getContext();
  if ("error" in context) return context.error;
  const body = await request.json().catch(() => null) as KeywordRequest | null;
  if (typeof body?.id !== "string" || !isUuid(body.id)) return NextResponse.json({ error: "A valid keyword alert is required." }, { status: 400 });
  const { error } = await context.supabase.from("market_keyword_alerts").delete().eq("user_id", context.user.id).eq("id", body.id);
  if (error) return NextResponse.json({ error: "Unable to remove this keyword right now." }, { status: 500 });
  return NextResponse.json({ removed: true });
}
