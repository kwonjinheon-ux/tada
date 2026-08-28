import { apiFailure, apiSuccess } from "@/lib/api/response";
import { groupBuyOrderRequestSchema } from "@/contracts/api";
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
  const { data, error } = await supabase.from("group_buy_orders").select("id,reference,buyer_name,buyer_email,buyer_phone,fulfilment,delivery_address,buyer_note,subtotal_cents,delivery_cents,total_cents,paid_at,created_at,group_buy_order_items(item_id,quantity,unit_price_cents,group_buy_items(name,unit_label))").eq("group_buy_id", groupBuyId).order("created_at");
  if (error) return apiFailure("FORBIDDEN", "Only the group buy owner can view these orders.", 403);
  return apiSuccess({ orders: data ?? [] });
}

export async function POST(request: Request, { params }: { params: Promise<{ groupBuyId: string }> }) {
  const { groupBuyId } = await params; const { supabase, user } = await client(request);
  if (!supabase || !user) return apiFailure("UNAUTHORIZED", "Sign in to place an order.", 401);
  const parsed = groupBuyOrderRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiFailure("BAD_REQUEST", parsed.error.issues[0]?.message ?? "Complete the order details.", 400);
  const body = parsed.data;
  const { data: round } = await supabase.from("group_buys").select("title,bank_account_name,bank_account_number,reference_prefix,delivery_fee_cents,delivery_free_over_cents,group_buy_items(id,name,price_cents,limit_per_person)").eq("id", groupBuyId).eq("status", "open").maybeSingle();
  if (!round) return apiFailure("NOT_FOUND", "This group buy is unavailable.", 404);
  const items = new Map((round.group_buy_items ?? []).map((item: { id: string; price_cents: number; limit_per_person: number | null }) => [item.id, item]));
  const validLines = body.lines.filter((line) => items.has(line.itemId));
  if (!validLines.length) return apiFailure("BAD_REQUEST", "Choose at least one valid item.", 400);
  const subtotal = validLines.reduce((sum, line) => sum + (items.get(line.itemId)?.price_cents ?? 0) * line.quantity, 0);
  const delivery = body.fulfilment === "delivery" && (!round.delivery_free_over_cents || subtotal < round.delivery_free_over_cents) ? round.delivery_fee_cents : 0;
  const { count } = await supabase.from("group_buy_orders").select("id", { count: "exact", head: true }).eq("group_buy_id", groupBuyId);
  const reference = `${round.reference_prefix}${String((count ?? 0) + 1).padStart(4, "0")}`;
  const { data: order, error } = await supabase.from("group_buy_orders").insert({ group_buy_id: groupBuyId, buyer_id: user.id, reference, buyer_name: body.name, buyer_email: body.email, buyer_phone: body.phone, fulfilment: body.fulfilment, delivery_address: body.fulfilment === "delivery" ? body.address || null : null, buyer_note: body.note || null, subtotal_cents: subtotal, delivery_cents: delivery, total_cents: subtotal + delivery }).select("id,reference").single();
  if (error || !order) return apiFailure("INTERNAL", "Unable to submit this order.", 500);
  const { error: lineError } = await supabase.from("group_buy_order_items").insert(validLines.map((line) => ({ order_id: order.id, item_id: line.itemId, quantity: line.quantity, unit_price_cents: items.get(line.itemId)?.price_cents })));
  if (lineError) return apiFailure("INTERNAL", "Your order could not be completed.", 500);
  await sendOrderEmail({ to: body.email, title: round.title ?? "Group buy", reference: order.reference, accountName: round.bank_account_name, accountNumber: round.bank_account_number, lines: validLines.map((line) => ({ name: (items.get(line.itemId) as { name?: string })?.name ?? "Item", quantity: line.quantity, unitPriceCents: items.get(line.itemId)?.price_cents ?? 0 })), totalCents: subtotal + delivery });
  return apiSuccess({ reference: order.reference }, { status: 201 });
}

async function sendOrderEmail(input: { to: string; title: string; reference: string; accountName: string; accountNumber: string; lines: Array<{ name: string; quantity: number; unitPriceCents: number }>; totalCents: number }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) { console.warn("Order saved without email delivery: configure RESEND_API_KEY and RESEND_FROM_EMAIL."); return; }
  const escape = (value: string) => value.replace(/[&<>\"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&apos;" })[character] ?? character);
  const items = input.lines.map((line) => `<li>${escape(line.name)} × ${line.quantity} — NZ$${((line.unitPriceCents * line.quantity) / 100).toFixed(2)}</li>`).join("");
  const html = `<h1>Group buy order ${escape(input.reference)}</h1><p>${escape(input.title)}</p><h2>Items</h2><ul>${items}</ul><p><strong>Total: NZ$${(input.totalCents / 100).toFixed(2)}</strong></p><h2>Bank transfer</h2><p>Account name: ${escape(input.accountName)}<br>Account number: ${escape(input.accountNumber)}<br>Reference: <strong>${escape(input.reference)}</strong></p>`;
  try { const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ from, to: [input.to], subject: `Your Tada group buy order ${input.reference}`, html }) }); if (!response.ok) console.error("Order email delivery failed", await response.text()); } catch (error) { console.error("Order email delivery failed", error); }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ groupBuyId: string }> }) {
  const { groupBuyId } = await params; const { supabase, user } = await client(request);
  if (!supabase || !user) return apiFailure("UNAUTHORIZED", "Sign in to update payment status.", 401);
  const body = await request.json().catch(() => null) as { orderId?: string; paid?: boolean } | null;
  if (!body?.orderId || typeof body.paid !== "boolean") return apiFailure("BAD_REQUEST", "Invalid payment update.", 400);
  const { data, error } = await supabase.from("group_buy_orders").update({ paid_at: body.paid ? new Date().toISOString() : null, paid_by: body.paid ? user.id : null }).eq("id", body.orderId).eq("group_buy_id", groupBuyId).select("id,paid_at").single();
  if (error || !data) return apiFailure("FORBIDDEN", "Only the group buy owner can update payment status.", 403);
  return apiSuccess({ orderId: data.id, paid: Boolean(data.paid_at) });
}
