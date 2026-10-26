import type { SupabaseClient } from "@supabase/supabase-js";
import type { MainLocation } from "@/data/nzLocations";
import { findMainLocation, findSubLocation } from "@/lib/market/nz-location";

export type ProfileLocation = { mainLocation: MainLocation; subLocation: string };

/**
 * The area a member has set on their profile, if there is one.
 *
 * Browse pages start on this area for a signed-in reader. It used to be read in
 * the browser after the page had been served, which meant the page was drawn
 * for everywhere, then drawn again for the profile's area once the browser had
 * found out which that was. Read on the server instead, the first paint is
 * already the right one. The browser still uses it where a page cannot know in
 * advance, so both go through here.
 *
 * Older databases only have the region columns, so a missing main_location
 * falls back to them rather than treating the member as having no area.
 */
export async function loadProfileLocation(supabase: SupabaseClient, userId: string): Promise<ProfileLocation | null> {
  let { data: profile, error } = await supabase.from("profiles").select("main_location,region_city,sub_location,region_suburb").eq("id", userId).maybeSingle();
  if (error && ["42703", "PGRST204"].includes(error.code)) {
    const legacy = await supabase.from("profiles").select("region_city,region_suburb").eq("id", userId).maybeSingle();
    profile = legacy.data ? { main_location: null, sub_location: null, region_city: legacy.data.region_city, region_suburb: legacy.data.region_suburb } : null;
    error = legacy.error;
  }
  if (error) return null;

  const mainLocation = findMainLocation(profile?.main_location) ?? findMainLocation(profile?.region_city);
  if (!mainLocation) return null;
  const subLocation = findSubLocation(mainLocation, profile?.sub_location) ?? findSubLocation(mainLocation, profile?.region_suburb) ?? "";
  return { mainLocation, subLocation };
}
