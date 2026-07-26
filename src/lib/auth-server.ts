import { cache } from "react";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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
