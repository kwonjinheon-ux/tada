import { z } from "zod";
import { uuidSchema } from "@/contracts/api";
import { apiFailure, apiSuccess } from "@/lib/api/response";
import { isMarketModerator } from "@/lib/market/safety";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const statusSchema = z.object({ status: z.enum(["published", "pending", "sold", "archived"]) });

async function adminClient() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { supabase: null, error: apiFailure("UNAVAILABLE", "Admin tools are unavailable right now.", 503) };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase: null, error: apiFailure("UNAUTHORIZED", "Please log in.", 401) };
  if (!await isMarketModerator(supabase)) return { supabase: null, error: apiFailure("FORBIDDEN", "Administrator access is required.", 403) };
  return { supabase, error: null };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ listingId: string }> }) {
  const { listingId } = await params;
  if (!uuidSchema.safeParse(listingId).success) return apiFailure("BAD_REQUEST", "Invalid listing.", 400);
  const { supabase, error } = await adminClient(); if (!supabase || error) return error!;
  const parsed = statusSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiFailure("BAD_REQUEST", "Choose a valid listing status.", 400);
  const { error: updateError } = await supabase.from("market_listings").update({ status: parsed.data.status }).eq("id", listingId);
  if (updateError) return apiFailure("INTERNAL", "Unable to update this listing.", 500);
  return apiSuccess({ listingId, status: parsed.data.status });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ listingId: string }> }) {
  const { listingId } = await params;
  if (!uuidSchema.safeParse(listingId).success) return apiFailure("BAD_REQUEST", "Invalid listing.", 400);
  const { supabase, error } = await adminClient(); if (!supabase || error) return error!;
  const { error: deleteError } = await supabase.from("market_listings").delete().eq("id", listingId);
  if (deleteError) return apiFailure("INTERNAL", "Unable to delete this listing.", 500);
  return apiSuccess({ listingId, deleted: true });
}
