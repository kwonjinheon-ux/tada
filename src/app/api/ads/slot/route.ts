import { NextResponse } from "next/server";
import { z } from "zod";
import { apiFailure, apiSuccess } from "@/lib/api/response";
import { selectAd } from "@/lib/advertising/select";
import { AD_PLACEMENTS, type PublicAd } from "@/lib/advertising/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const querySchema = z.object({ placement: z.enum(AD_PLACEMENTS), device: z.enum(["desktop", "mobile"]) });
export async function GET(request: Request) {
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams)); if (!parsed.success) return apiFailure("BAD_REQUEST", "Invalid ad slot.", 400);
  const supabase = await createServerSupabaseClient(); if (!supabase) return apiSuccess({ ad: null });
  const [{ data: ads }, { data: settings }] = await Promise.all([supabase.from("active_ad_candidates").select("*").eq("placement", parsed.data.placement), supabase.from("public_ad_placement_settings").select("serving_mode").eq("placement", parsed.data.placement).maybeSingle()]);
  const ad = settings ? selectAd((ads ?? []).map((row) => ({ id: row.id, provider: row.provider, name: row.name, sponsorName: row.sponsor_name, placement: row.placement, priority: row.priority, frequencyLevel: row.frequency_level, weight: row.weight, adsenseClientId: row.adsense_client_id, adsenseSlotId: row.adsense_slot_id, adsenseFormat: row.adsense_format, desktopImageUrl: row.desktop_image_url, mobileImageUrl: row.mobile_image_url, destinationUrl: row.destination_url, altText: row.alt_text, showOnDesktop: row.show_on_desktop, showOnMobile: row.show_on_mobile, allowResponsiveFallback: row.allow_responsive_fallback, openInNewTab: row.open_in_new_tab, dailyImpressions: Number(row.daily_impressions), totalImpressions: Number(row.total_impressions), dailyImpressionCap: row.daily_impression_cap, totalImpressionCap: row.total_impression_cap }) as PublicAd), settings.serving_mode, parsed.data.device) : null;
  return apiSuccess({ ad });
}
