import "server-only";

import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";

export type StorageImageVariant = "avatar" | "gallery" | "thumbnail";

const variants = {
  avatar: { width: 256, height: 256, quality: 76, resize: "cover" as const },
  gallery: { width: 1600, quality: 82, resize: "contain" as const },
  thumbnail: { width: 720, height: 720, quality: 72, resize: "cover" as const },
};

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

const getCachedSignedStorageImage = unstable_cache(
  async (bucket: string, path: string, variant: StorageImageVariant) => {
    const supabase = createPublicStorageClient();
    if (!supabase) return null;

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 3600, { transform: variants[variant] });

    if (error) throw error;
    return data.signedUrl;
  },
  ["signed-storage-image-v1"],
  { revalidate: 3000 },
);

export async function getSignedStorageImage(
  bucket: string,
  path: string,
  variant: StorageImageVariant,
) {
  try {
    return await getCachedSignedStorageImage(bucket, path, variant);
  } catch {
    return null;
  }
}

export async function getSignedStorageImages(
  bucket: string,
  paths: string[],
  variant: StorageImageVariant,
) {
  const uniquePaths = [...new Set(paths.filter(Boolean))];
  const signedUrls = await Promise.all(
    uniquePaths.map((path) => getSignedStorageImage(bucket, path, variant)),
  );

  return new Map(
    uniquePaths
      .map((path, index) => [path, signedUrls[index]] as const)
      .filter((entry): entry is readonly [string, string] => Boolean(entry[1])),
  );
}
