import { apiFailure, apiSuccess } from "@/lib/api/response";
import { createBearerSupabaseClient, createServerSupabaseClient } from "@/lib/supabase/server";

async function client(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1] ?? null;
  const supabase = token ? createBearerSupabaseClient(token) : await createServerSupabaseClient();
  if (!supabase) return { supabase: null, user: null };
  const { data: { user } } = await supabase.auth.getUser(token ?? undefined);
  return { supabase, user };
}

export async function GET(request: Request, { params }: { params: Promise<{ groupBuyId: string }> }) {
  const { groupBuyId } = await params; const { supabase, user } = await client(request);
  if (!supabase || !user) return apiFailure("UNAUTHORIZED", "Sign in to view orders.", 401);
  const { data, error } = await supabase.from("group_buy_orders").select("id,reference,buyer_name,buyer_phone,fulfilment,delivery_address,buyer_note,subtotal_cents,delivery_cents,total_cents,paid_at,created_at,group_buy_order_items(item_id,quantity,unit_price_cents,group_buy_items(name,unit_label))").eq("group_buy_id", groupBuyId).order("created_at");
  if (error) return apiFailure("FORBIDDEN", "Only the group buy owner can view these orders.", 403);
  return apiSuccess({ orders: data ?? [] });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ groupBuyId: string }> }) {
  const { groupBuyId } = await params; const { supabase, user } = await client(request);
  if (!supabase || !user) return apiFailure("UNAUTHORIZED", "Sign in to update payment status.", 401);
  const body = await request.json().catch(() => null) as { orderId?: string; paid?: boolean } | null;
  if (!body?.orderId || typeof body.paid !== "boolean") return apiFailure("BAD_REQUEST", "Invalid payment update.", 400);
  const { error } = await supabase.from("group_buy_orders").update({ paid_at: body.paid ? new Date().toISOString() : null, paid_by: body.paid ? user.id : null }).eq("id", body.orderId).eq("group_buy_id", groupBuyId);
  if (error) return apiFailure("FORBIDDEN", "Only the group buy owner can update payment status.", 403);
  return apiSuccess({ paid: body.paid });
}
