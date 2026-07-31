import { marketDescriptionTextSizeRequestSchema } from "@/contracts/api";
import { apiFailure, apiSuccess } from "@/lib/api/response";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function profileDisplayName(user: { email?: string | null; user_metadata?: Record<string, unknown> }) {
  const metadataName = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name.trim() : "";
  const emailName = user.email?.split("@")[0]?.trim() ?? "";
  const candidate = (metadataName || emailName).slice(0, 40);
  return candidate.length >= 2 ? candidate : "Tada member";
}

export async function GET() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return apiFailure("UNAVAILABLE", "Text size preferences are unavailable right now.", 503);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiSuccess({ sizeStep: 0, persisted: false });

  const { data, error } = await supabase
    .from("profiles")
    .select("listing_description_text_step")
    .eq("id", user.id)
    .maybeSingle();
  if (error) return apiFailure("INTERNAL", "Unable to load text size preferences.", 500);

  return apiSuccess({ sizeStep: data?.listing_description_text_step ?? 0, persisted: true });
}

export async function PATCH(request: Request) {
  const parsed = marketDescriptionTextSizeRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiFailure("BAD_REQUEST", "Choose a valid text size.", 400);

  const supabase = await createServerSupabaseClient();
  if (!supabase) return apiFailure("UNAVAILABLE", "Text size preferences are unavailable right now.", 503);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiFailure("UNAUTHORIZED", "Please log in to save text size preferences.", 401);

  const { data: updated, error: updateError } = await supabase
    .from("profiles")
    .update({ listing_description_text_step: parsed.data.sizeStep })
    .eq("id", user.id)
    .select("id")
    .maybeSingle();
  if (updateError) return apiFailure("INTERNAL", "Unable to save text size preferences.", 500);

  if (!updated) {
    const { error: insertError } = await supabase.from("profiles").insert({
      id: user.id,
      display_name: profileDisplayName(user),
      listing_description_text_step: parsed.data.sizeStep,
    });
    if (insertError) return apiFailure("INTERNAL", "Unable to save text size preferences.", 500);
  }

  return apiSuccess({ sizeStep: parsed.data.sizeStep, persisted: true });
}
