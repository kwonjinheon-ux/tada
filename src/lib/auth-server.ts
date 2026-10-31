import { cache } from "react";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Who is signed in, without a round trip to the auth server: the token is checked
 * against the project's signing keys locally. Enough for reads and writes that RLS
 * guards anyway; use `getServerUser` when the full user record is needed.
 */
export const getServerUserId = cache(async () => {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getClaims();
  return data?.claims.sub ?? null;
});

export const getServerUser = cache(async () => {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
});
