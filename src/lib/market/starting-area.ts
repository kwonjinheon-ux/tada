import type { SupabaseClient } from "@supabase/supabase-js";
import type { MainLocation } from "@/data/nzLocations";
import { loadProfileLocation } from "@/lib/market/profile-main-location";

type PageParams = Record<string, string | string[] | undefined>;

/**
 * Where a signed-in reader starts on a browse page: Community, Market, Second
 * Hands and Services all open on the area set on the profile.
 *
 * Each of them used to find that out in the browser, after the page had been
 * served. The page was drawn for everywhere, then the browser read the profile,
 * wrote the area on to the address and fetched the list again behind a skeleton:
 * two loads for one visit. Settled on the server instead, the first paint is the
 * one that stays.
 *
 * An address that names an area, even the empty one that means All New Zealand,
 * is the reader's own choice and is never overridden. Only an address with no area
 * at all is a fresh visit.
 */
export function urlNamesArea(params: PageParams) {
  return "mainLocation" in params || "subLocation" in params;
}

/**
 * The area to start on, read on the server.
 *
 * `undefined` means the address named an area, so nothing was decided here and
 * the page should read its address as it always did. `""` means the question was
 * asked and there is no area to start on: a visitor, or a member who has not set
 * one. A page passes that on so the browser does not ask the same question again.
 *
 * `viewerId` comes back too, for a page that would otherwise ask the auth service
 * for the same thing. Pass the id when the page already has it.
 */
export async function resolveProfileAreaDefault(supabase: SupabaseClient, params: PageParams, knownViewerId?: string | null) {
  if (urlNamesArea(params)) return { viewerId: knownViewerId, profileLocationDefault: undefined };
  const viewerId = knownViewerId !== undefined ? knownViewerId : ((await supabase.auth.getUser()).data.user?.id ?? null);
  const location = viewerId ? await loadProfileLocation(supabase, viewerId) : null;
  return { viewerId, profileLocationDefault: (location?.mainLocation ?? "") as MainLocation | "" };
}

/**
 * The address a page was really drawn for: the one it was served with plus the
 * profile's area, when the server started it there. `null` when the address
 * names its own area or there is no area to add.
 *
 * Used on both sides, so the browser reads the same query the server answered and
 * finds the list already in the cache it was seeded with.
 */
export function searchWithProfileArea(search: string, profileLocationDefault: MainLocation | "" | undefined) {
  if (!profileLocationDefault) return null;
  const params = new URLSearchParams(search);
  if (params.has("mainLocation") || params.has("subLocation")) return null;
  params.set("mainLocation", profileLocationDefault);
  return params.toString();
}
