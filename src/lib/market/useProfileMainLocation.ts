"use client";

import { useEffect, useRef } from "react";
import type { MainLocation } from "@/data/nzLocations";
import { findMainLocation, findSubLocation } from "@/lib/market/nz-location";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type UseProfileMainLocationOptions = {
  hasMainLocationInUrl: boolean;
  mainLocation: MainLocation | "";
  onResolve: (mainLocation: MainLocation, subLocation: string) => void;
  enabled?: boolean;
};

// Browse surfaces only default the primary area from the signed-in
// profile. A URL choice always wins and the more specific suburb is untouched.
export function useProfileMainLocation({ hasMainLocationInUrl, mainLocation, onResolve, enabled = true }: UseProfileMainLocationOptions) {
  const onResolveRef = useRef(onResolve);
  useEffect(() => { onResolveRef.current = onResolve; }, [onResolve]);

  useEffect(() => {
    if (!enabled || hasMainLocationInUrl || mainLocation) return;
    let cancelled = false;

    void (async () => {
      const supabase = createBrowserSupabaseClient();
      const { data: { user } } = await supabase?.auth.getUser() ?? { data: { user: null } };
      if (!supabase || !user) return;
      let { data: profile, error } = await supabase.from("profiles").select("main_location,region_city,sub_location,region_suburb").eq("id", user.id).maybeSingle();
      if (error && ["42703", "PGRST204"].includes(error.code)) {
        const legacy = await supabase.from("profiles").select("region_city,region_suburb").eq("id", user.id).maybeSingle();
        profile = legacy.data ? { main_location: null, sub_location: null, region_city: legacy.data.region_city, region_suburb: legacy.data.region_suburb } : null;
        error = legacy.error;
      }
      const profileMainLocation = findMainLocation(profile?.main_location) ?? findMainLocation(profile?.region_city);
      if (!cancelled && !error && profileMainLocation) {
        const suburb = findSubLocation(profileMainLocation, profile?.sub_location) ?? findSubLocation(profileMainLocation, profile?.region_suburb) ?? "";
        onResolveRef.current(profileMainLocation, suburb);
      }
    })().catch(() => undefined);
    return () => { cancelled = true; };
  }, [enabled, hasMainLocationInUrl, mainLocation]);
}
