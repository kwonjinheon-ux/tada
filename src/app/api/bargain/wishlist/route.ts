import { marketWishlistRequestSchema } from "@/contracts/api";
import { apiFailure, apiSuccess } from "@/lib/api/response";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return apiFailure("UNAVAILABLE", "Wishlist is unavailable right now.", 503);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiSuccess({ saved: false });
  const listingId = new URL(request.url).searchParams.get("listingId");
  if (!marketWishlistRequestSchema.safeParse({ listingId }).success) return apiFailure("BAD_REQUEST", "A valid listing is required.", 400);
  const { data } = await supabase.from("bargain_wishlist").select("listing_id").eq("user_id", user.id).eq("listing_id", listingId).maybeSingle();
  return apiSuccess({ saved: Boolean(data) });
}

async function getRequestContext(request: Request) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: apiFailure("UNAVAILABLE", "Wishlist is unavailable right now.", 503) };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: apiFailure("UNAUTHORIZED", "Please log in to save listings.", 401) };
  const parsed = marketWishlistRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return { error: apiFailure("BAD_REQUEST", "A valid listing is required.", 400) };
  return { supabase, user, listingId: parsed.data.listingId };
}

export async function POST(request: Request) {
  const context = await getRequestContext(request);
  if ("error" in context) return context.error;
  const { data: listing } = await context.supabase.from("bargain_listings").select("id,owner_id").eq("id", context.listingId).maybeSingle();
  if (!listing) return apiFailure("NOT_FOUND", "This listing is not available.", 404);
  if (listing.owner_id === context.user.id) return apiFailure("BAD_REQUEST", "You cannot save your own listing.", 400);
  const { error } = await context.supabase.from("bargain_wishlist").upsert({ user_id: context.user.id, listing_id: context.listingId }, { onConflict: "user_id,listing_id", ignoreDuplicates: true });
  if (error) return apiFailure("INTERNAL", "Unable to save this listing right now.", 500);
  return apiSuccess({ saved: true });
}

export async function DELETE(request: Request) {
  const context = await getRequestContext(request);
  if ("error" in context) return context.error;
  const { error } = await context.supabase.from("bargain_wishlist").delete().eq("user_id", context.user.id).eq("listing_id", context.listingId);
  if (error) return apiFailure("INTERNAL", "Unable to remove this listing right now.", 500);
  return apiSuccess({ saved: false });
}
