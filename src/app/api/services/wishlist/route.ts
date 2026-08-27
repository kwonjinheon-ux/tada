import { serviceWishlistRequestSchema } from "@/contracts/api";
import { apiFailure, apiSuccess } from "@/lib/api/response";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function getRequestContext(request: Request) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: apiFailure("UNAVAILABLE", "Wishlist is unavailable right now.", 503) };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: apiFailure("UNAUTHORIZED", "Please log in to save services.", 401) };
  const parsed = serviceWishlistRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return { error: apiFailure("BAD_REQUEST", "A valid service is required.", 400) };
  return { supabase, user, serviceId: parsed.data.serviceId };
}

export async function POST(request: Request) {
  const context = await getRequestContext(request);
  if ("error" in context) return context.error;
  const { data: service } = await context.supabase.from("service_listings").select("id,owner_id").eq("id", context.serviceId).eq("status", "published").maybeSingle();
  if (!service) return apiFailure("NOT_FOUND", "This service is not available.", 404);
  if (service.owner_id === context.user.id) return apiFailure("BAD_REQUEST", "You cannot save your own service.", 400);
  const { error } = await context.supabase.from("service_wishlist").upsert({ user_id: context.user.id, service_id: context.serviceId }, { onConflict: "user_id,service_id", ignoreDuplicates: true });
  if (error) return apiFailure("INTERNAL", "Unable to save this service right now.", 500);
  return apiSuccess({ saved: true });
}

export async function DELETE(request: Request) {
  const context = await getRequestContext(request);
  if ("error" in context) return context.error;
  const { error } = await context.supabase.from("service_wishlist").delete().eq("user_id", context.user.id).eq("service_id", context.serviceId);
  if (error) return apiFailure("INTERNAL", "Unable to remove this service right now.", 500);
  return apiSuccess({ saved: false });
}
