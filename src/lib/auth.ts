import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export async function signInWithEmail(email: string, password: string) {
  const supabase = createBrowserSupabaseClient();

  if (!supabase) {
    return { error: "Supabase environment variables are not configured." };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error: error?.message ?? null };
}

export async function signUpWithEmail(email: string, password: string, fullName?: string) {
  const supabase = createBrowserSupabaseClient();

  if (!supabase) {
    return { error: "Supabase environment variables are not configured." };
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName ?? "" } },
  });

  return { error: error?.message ?? null };
}

export async function signOut() {
  const supabase = createBrowserSupabaseClient();

  if (!supabase) {
    return { error: "Supabase environment variables are not configured." };
  }

  const { error } = await supabase.auth.signOut();
  return { error: error?.message ?? null };
}
