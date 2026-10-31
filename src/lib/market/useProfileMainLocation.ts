"use client";

import { useEffect, useRef } from "react";
import type { MainLocation } from "@/data/nzLocations";
import { loadProfileLocation } from "@/lib/market/profile-main-location";
import { loadBrowserSupabaseClient } from "@/lib/supabase/load-client";

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
  // The default is a starting point, not a correction. Once it has been
  // applied the reader owns the filter: choosing All New Zealand leaves no
  // location on the URL, which otherwise looks exactly like a fresh visit and
  // put the profile area straight back.
  const hasAppliedDefault = useRef(false);

  useEffect(() => {
    if (!enabled || hasAppliedDefault.current || hasMainLocationInUrl || mainLocation) return;
    let cancelled = false;

    void (async () => {
      const supabase = await loadBrowserSupabaseClient();
      const { data: { user } } = await supabase?.auth.getUser() ?? { data: { user: null } };
      if (!supabase || !user) return;
      const location = await loadProfileLocation(supabase, user.id);
      if (!cancelled && location) {
        hasAppliedDefault.current = true;
        onResolveRef.current(location.mainLocation, location.subLocation);
      }
    })().catch(() => undefined);
    return () => { cancelled = true; };
  }, [enabled, hasMainLocationInUrl, mainLocation]);
}
