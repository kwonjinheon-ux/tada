import "server-only";

import {
  createSupabaseContext,
  type SupabaseEnv,
  type WithSupabaseConfig,
} from "@supabase/server";

function getServerPackageEnv(): Partial<SupabaseEnv> {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  const jwksUrl = process.env.SUPABASE_JWKS_URL;

  const env: Partial<SupabaseEnv> = {};

  if (url) {
    env.url = url;
  }

  if (publishableKey) {
    env.publishableKeys = { default: publishableKey };
  }

  if (secretKey) {
    env.secretKeys = { default: secretKey };
  }

  if (jwksUrl) {
    try {
      env.jwks = new URL(jwksUrl);
    } catch {
      // Let @supabase/server surface a clear auth error if JWKS is required.
    }
  }

  return env;
}

export function createSupabaseApiContext(
  request: Request,
  config: WithSupabaseConfig = { auth: "user" },
) {
  return createSupabaseContext(request, {
    ...config,
    env: {
      ...getServerPackageEnv(),
      ...config.env,
    },
  });
}
