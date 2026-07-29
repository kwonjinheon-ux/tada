import { marketConversationRequestSchema } from "@/contracts/api";
import { apiFailure, apiSuccess } from "@/lib/api/response";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type ListingRow = { owner_id: string };

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return apiFailure("UNAVAILABLE", "Messaging is unavailable right now.", 503);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiFailure("UNAUTHORIZED", "Please log in to message the seller.", 401);

  const parsed = marketConversationRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiFailure("BAD_REQUEST", "A valid listing is required.", 400);
  const { listingId } = parsed.data;

  const [{ data: listing, error: listingError }, { data: existing }] = await Promise.all([
    supabase.from("market_listings").select("owner_id").eq("id", listingId).maybeSingle(),
    supabase.from("market_conversations").select("id").eq("listing_id", listingId).eq("buyer_id", user.id).maybeSingle(),
  ]);
  const sellerId = (listing as ListingRow | null)?.owner_id;
  if (listingError || !sellerId) return apiFailure("NOT_FOUND", "This listing is not available for messaging.", 404);
  if (sellerId === user.id) return apiFailure("BAD_REQUEST", "You cannot message yourself about this listing.", 400);
  if (existing?.id) return apiSuccess({ conversationId: existing.id, created: false });

  const { data: conversation, error } = await supabase
    .from("market_conversations")
    .insert({ listing_id: listingId, buyer_id: user.id, seller_id: sellerId })
    .select("id")
    .single();

  if (error || !conversation) {
    const { data: duplicate } = await supabase
      .from("market_conversations")
      .select("id")
      .eq("listing_id", listingId)
      .eq("buyer_id", user.id)
      .maybeSingle();
    if (duplicate?.id) return apiSuccess({ conversationId: duplicate.id, created: false });
    return apiFailure("INTERNAL", "Unable to open a conversation right now.", 500);
  }

  return apiSuccess({ conversationId: conversation.id, created: true }, { status: 201 });
}
