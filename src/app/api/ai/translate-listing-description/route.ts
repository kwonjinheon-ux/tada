import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  DescriptionTranslationError,
  descriptionTranslationLocales,
  translateListingDescription,
} from "@/lib/ai/description-translation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 45;

const requestSchema = z.object({ description: z.string().trim().min(1).max(5_000) }).strip();
const localeSchema = z.enum(descriptionTranslationLocales);

function failure(code: "BAD_REQUEST" | "UNAUTHORIZED" | "UNAVAILABLE", message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return failure("UNAVAILABLE", "Translation is not configured yet.", 503);

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return failure("UNAUTHORIZED", "Please sign in to translate this description.", 401);

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return failure("BAD_REQUEST", "Please check this listing description and try again.", 400);

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("preferred_locale")
    .eq("id", user.id)
    .maybeSingle();
  const locale = localeSchema.safeParse(profile?.preferred_locale);

  if (profileError || !locale.success) {
    return failure("BAD_REQUEST", "Set your display language in My Profile before translating.", 400);
  }

  try {
    const translation = await translateListingDescription({
      description: parsed.data.description,
      locale: locale.data,
      safetyIdentifier: createHash("sha256").update(user.id).digest("hex"),
    });
    return NextResponse.json({ data: { description: translation, locale: locale.data } });
  } catch (error) {
    console.error("Listing description translation failed", error);
    if (error instanceof DescriptionTranslationError && error.code === "AI_NOT_CONFIGURED") {
      return failure("UNAVAILABLE", "Translation is not configured yet.", 503);
    }
    if (error instanceof DescriptionTranslationError && error.code === "AI_REQUEST_TIMED_OUT") {
      return failure("UNAVAILABLE", "Translation took too long. Please try again.", 504);
    }
    return failure("UNAVAILABLE", "We could not translate this description right now. Please try again.", 503);
  }
}
