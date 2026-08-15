import { marketTradeReviewRequestSchema, marketTradeReviewResponseSchema } from "@/contracts/api";
import { apiFailure, apiSuccess } from "@/lib/api/response";
import { getServerUser } from "@/lib/auth-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type ReviewRow = {
  id: string;
  offer_id: string;
  seller_id: string;
  score: number | string;
  comment: string;
  created_at: string;
};

export async function POST(request: Request) {
  const parsed = marketTradeReviewRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiFailure("BAD_REQUEST", "Choose a half-star rating and write a review.", 400);

  const user = await getServerUser();
  if (!user) return apiFailure("UNAUTHORIZED", "Please log in to leave a review.", 401);

  const supabase = await createServerSupabaseClient();
  if (!supabase) return apiFailure("UNAVAILABLE", "Reviews are unavailable right now.", 503);

  const { data, error } = await supabase.rpc("submit_market_trade_review", {
    p_offer_id: parsed.data.offerId,
    p_score: parsed.data.score,
    p_comment: parsed.data.comment,
  });
  const review = data as ReviewRow | null;

  if (error || !review) {
    const message = error?.message?.replace(/^ERROR:\s*/i, "") || "Unable to save your review right now.";
    const status = error?.code === "23505" ? 409 : error?.code === "42501" ? 403 : 400;
    return apiFailure(status === 409 ? "CONFLICT" : status === 403 ? "FORBIDDEN" : "BAD_REQUEST", message, status);
  }

  return apiSuccess(marketTradeReviewResponseSchema.parse({
    reviewId: review.id,
    offerId: review.offer_id,
    sellerId: review.seller_id,
    score: Number(review.score),
    comment: review.comment,
    createdAt: review.created_at,
  }), { status: 201 });
}
