import { createClient } from "@supabase/supabase-js";
import { marketSearchTermRequestSchema } from "@/contracts/api";
import { apiSuccess } from "@/lib/api/response";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { containsProhibitedMarketplaceContent } from "@/lib/market/prohibited-items";

function createSearchAdminClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secretKey) return null;

  return createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return apiSuccess({ terms: [] });

  const { data } = await supabase
    .from("market_search_terms")
    .select("term")
    .order("search_count", { ascending: false })
    .order("last_searched_at", { ascending: false })
    .limit(3);

  return apiSuccess({ terms: (data ?? []).map(({ term }) => term) });
}

export async function POST(request: Request) {
  const parsed = marketSearchTermRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiSuccess({ recorded: false });

  const admin = createSearchAdminClient();
  if (!admin) return apiSuccess({ recorded: false });

  const term = parsed.data.term.toLocaleLowerCase("en-NZ").replace(/\s+/g, " ");
  if (containsProhibitedMarketplaceContent(term)) return apiSuccess({ recorded: false });
  const { data: existing } = await admin
    .from("market_search_terms")
    .select("search_count")
    .eq("term", term)
    .maybeSingle();

  const { error } = await admin.from("market_search_terms").upsert({
    term,
    search_count: (existing?.search_count ?? 0) + 1,
    last_searched_at: new Date().toISOString(),
  }, { onConflict: "term" });

  return apiSuccess({ recorded: !error });
}
