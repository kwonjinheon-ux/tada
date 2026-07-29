import { marketModerationReviewRequestSchema, uuidSchema } from "@/contracts/api";
import { apiFailure, apiSuccess } from "@/lib/api/response";
import { isMarketModerator } from "@/lib/market/safety";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function PATCH(request: Request, { params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await params;
  if (!uuidSchema.safeParse(reportId).success) return apiFailure("BAD_REQUEST", "Invalid report.", 400);
  const supabase = await createServerSupabaseClient();
  if (!supabase) return apiFailure("UNAVAILABLE", "Moderation is unavailable right now.", 503);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiFailure("UNAUTHORIZED", "Please log in.", 401);
  if (!await isMarketModerator(supabase)) return apiFailure("FORBIDDEN", "Moderator access is required.", 403);
  const parsed = marketModerationReviewRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiFailure("BAD_REQUEST", "Choose a valid review action.", 400);

  const { data: report, error: reportError } = await supabase
    .from("market_reports")
    .select("id,reported_user_id,target_type,target_id")
    .eq("id", reportId)
    .maybeSingle();
  if (reportError || !report) return apiFailure("NOT_FOUND", "Report not found.", 404);

  const review = parsed.data;
  const { error: updateError } = await supabase.from("market_reports").update({
    status: review.status,
    reviewer_id: user.id,
    reviewer_note: review.reviewerNote || null,
    reviewed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", reportId);
  if (updateError) return apiFailure("INTERNAL", "Unable to update this report.", 500);

  if (review.action !== "none") {
    const isListingAction = review.action === "listing_hidden" || review.action === "listing_restored";
    if (review.action === "suspension" && !report.reported_user_id) return apiFailure("BAD_REQUEST", "This report has no member to suspend.", 400);
    const { error: actionError } = await supabase.from("market_moderation_actions").insert({
      report_id: report.id,
      target_user_id: isListingAction ? null : report.reported_user_id,
      target_listing_id: isListingAction && report.target_type === "listing" ? report.target_id : null,
      action_type: review.action,
      note: review.reviewerNote || null,
      ends_at: review.action === "suspension" ? new Date(Date.now() + (review.suspensionHours ?? 24) * 3_600_000).toISOString() : null,
      moderator_id: user.id,
    });
    if (actionError) return apiFailure("INTERNAL", "The review was saved, but the enforcement action failed.", 500);
    if (isListingAction && report.target_type === "listing") {
      const { error: listingError } = await supabase.from("market_listings").update({ status: review.action === "listing_hidden" ? "pending" : "published" }).eq("id", report.target_id);
      if (listingError) return apiFailure("INTERNAL", "The review was saved, but listing visibility could not be updated.", 500);
    }
  }
  return apiSuccess({ reportId, status: review.status });
}
