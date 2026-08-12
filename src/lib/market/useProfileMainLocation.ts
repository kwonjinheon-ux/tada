"use client";

import { useEffect, useRef } from "react";
import type { MainLocation } from "@/data/nzLocations";
import { findMainLocation } from "@/lib/market/nz-location";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type UseProfileMainLocationOptions = {
  hasMainLocationInUrl: boolean;
  mainLocation: MainLocation | "";
  onResolve: (mainLocation: MainLocation) => void;
};

// Market browse surfaces only default the primary area from the signed-in
// profile. A URL choice always wins and the more specific suburb is untouched.
export function useProfileMainLocation({ hasMainLocationInUrl, mainLocation, onResolve }: UseProfileMainLocationOptions) {
  const hasResolved = useRef(false);

  useEffect(() => {
    if (hasResolved.current || hasMainLocationInUrl || mainLocation) return;
    hasResolved.current = true;

    void (async () => {
      const supabase = createBrowserSupabaseClient();
      const { data: { user } } = await supabase?.auth.getUser() ?? { data: { user: null } };
      if (!supabase || !user) return;
      const { data: profile } = await supabase.from("profiles").select("main_location,region_city").eq("id", user.id).maybeSingle();
      const profileMainLocation = findMainLocation(profile?.main_location ?? profile?.region_city);
      if (profileMainLocation) onResolve(profileMainLocation);
    })();
  }, [hasMainLocationInUrl, mainLocation, onResolve]);
}
