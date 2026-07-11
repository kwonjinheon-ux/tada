import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export async function signInWithEmail(email: string, password: string) {
  const supabase = createBrowserSupabaseClient();

  if (!supabase) {
    return { error: "Supabase environment variables are not configured." };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  return { error: error?.message ?? null };
}

export async function signUpWithEmail(email: string, password: string, fullName?: string) {
  const supabase = createBrowserSupabaseClient();

  if (!supabase) {
    return { error: "Supabase environment variables are not configured." };
  }

  const emailRedirectTo =
    typeof window === "undefined"
      ? undefined
      : `${window.location.origin}/auth/callback?next=/account`;

  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: { full_name: fullName?.trim() ?? "" },
      emailRedirectTo,
    },
  });

  return { error: error?.message ?? null, hasSession: Boolean(data.session) };
}

export async function signInWithGoogle() {
  const supabase = createBrowserSupabaseClient();

  if (!supabase) {
    return { error: "Supabase environment variables are not configured." };
  }

  const redirectTo = `${window.location.origin}/auth/callback?next=/account`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
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
