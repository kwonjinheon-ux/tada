import { apiFailure, apiSuccess } from "@/lib/api/response";
import { isMarketModerator } from "@/lib/market/safety";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const allowedMimeTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return apiFailure("UNAVAILABLE", "Advertising is unavailable.", 503);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !await isMarketModerator(supabase)) return apiFailure("FORBIDDEN", "Administrator access is required.", 403);

  const formData = await request.formData();
  const file = formData.get("file");
  const variant = formData.get("variant");
  if (!(file instanceof File) || (variant !== "desktop" && variant !== "mobile")) return apiFailure("BAD_REQUEST", "Choose a valid advertising image.", 400);
  if (file.size === 0 || file.size > MAX_FILE_SIZE) return apiFailure("BAD_REQUEST", "Advertising images must be 5 MB or smaller.", 400);

  const extension = allowedMimeTypes.get(file.type);
  if (!extension) return apiFailure("BAD_REQUEST", "Use a JPEG, PNG, or WebP image.", 400);

  const path = `${user.id}/advertising/${variant}-${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("advertising-assets").upload(path, await file.arrayBuffer(), {
    contentType: file.type,
    upsert: false,
  });
  if (error) return apiFailure("INTERNAL", "Unable to upload the advertising image.", 500);

  const { data } = supabase.storage.from("advertising-assets").getPublicUrl(path);
  return apiSuccess({ path, url: data.publicUrl });
}
