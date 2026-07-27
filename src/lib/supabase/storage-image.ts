import "server-only";

import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";

export type StorageImageVariant = "avatar" | "gallery" | "thumbnail";

const SIGNED_URL_TTL_SECONDS = 60 * 60;

function createPublicStorageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !publishableKey) return null;

  return createClient(url, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const getCachedSignedStorageImages = unstable_cache(
  async (bucket: string, paths: string[]) => {
    const supabase = createPublicStorageClient();
    if (!supabase || !paths.length) return [] as Array<[string, string]>;

    // Serve original uploads directly. This avoids transformation-service failures
    // while keeping every private Storage object behind a time-limited URL.
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);

    if (error) throw error;

    return (data ?? []).flatMap((entry) => (
      entry.path && entry.signedUrl ? [[entry.path, entry.signedUrl] as [string, string]] : []
    ));
  },
  ["signed-storage-images-v2"],
  { revalidate: 3000 },
);

export async function getSignedStorageImage(
  bucket: string,
  path: string,
  variant: StorageImageVariant,
) {
  const images = await getSignedStorageImages(bucket, [path], variant);
  return images.get(path) ?? null;
}

export async function getSignedStorageImages(
  bucket: string,
  paths: string[],
  _variant: StorageImageVariant,
) {
  const uniquePaths = [...new Set(paths.filter(Boolean))].sort();
  if (!uniquePaths.length) return new Map<string, string>();

  try {
    return new Map(await getCachedSignedStorageImages(bucket, uniquePaths));
  } catch {
    return new Map<string, string>();
  }
}
