import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { apiFailure, apiSuccess } from "@/lib/api/response";
import { createBearerSupabaseClient, createServerSupabaseClient } from "@/lib/supabase/server";

const deleteRequest = z.object({
  phrase: z.enum(["탈퇴합니다", "DELETE MY ACCOUNT"]),
  acknowledged: z.literal(true),
  finalConfirmation: z.literal(true),
  password: z.string().max(256).optional(),
  locale: z.enum(["ko", "en"]).default("en"),
});

const userImageBuckets = [
  "profile-avatars", "listing-images", "market-listing-images", "bargain-listing-images",
  "community-post-images", "service-listing-images", "group-buy-images", "advertising-assets",
] as const;

function accountAdmin() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function userStoragePaths(admin: SupabaseClient, bucket: string, userId: string) {
  const paths: string[] = [];
  const folders = [userId];
  while (folders.length) {
    const folder = folders.pop()!;
    for (let offset = 0; ; offset += 100) {
      const { data, error } = await admin.storage.from(bucket).list(folder, { limit: 100, offset });
      if (error) throw error;
      for (const entry of data ?? []) {
        const path = `${folder}/${entry.name}`;
        if (entry.id === null) folders.push(path);
        else paths.push(path);
      }
      if (paths.length + folders.length > 10000) throw new Error("Too many account files to process automatically.");
      if (!data || data.length < 100) break;
    }
  }
  return paths;
}

export async function DELETE(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return apiFailure("FORBIDDEN", "Invalid request origin.", 403);
  const parsed = deleteRequest.safeParse(await request.json().catch(() => null));
  if (!parsed.success || (parsed.data.locale === "ko" && parsed.data.phrase !== "탈퇴합니다") || (parsed.data.locale === "en" && parsed.data.phrase !== "DELETE MY ACCOUNT")) return apiFailure("BAD_REQUEST", "Confirm account deletion exactly as shown.", 400);
  const ko = parsed.data.locale === "ko";
  const say = (en: string, kr: string) => ko ? kr : en;
  const bearer = request.headers.get("authorization")?.match(/^Bearer (\S+)$/i)?.[1];
  const supabase = bearer ? createBearerSupabaseClient(bearer) : await createServerSupabaseClient();
  if (!supabase) return apiFailure("UNAVAILABLE", say("Account settings are unavailable.", "계정 설정을 이용할 수 없습니다."), 503);
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return apiFailure("UNAUTHORIZED", say("Sign in again to delete your account.", "탈퇴하려면 다시 로그인해 주세요."), 401);
  const admin = accountAdmin();
  if (!admin) return apiFailure("UNAVAILABLE", say("Account deletion is not configured. Please contact support.", "계정 탈퇴 설정이 준비되지 않았습니다. 고객지원에 문의해 주세요."), 503);

  // A password account must prove possession of its current password; OAuth-only accounts
  // use their authenticated session and the two explicit confirmation steps in the UI.
  if (user.identities?.some((identity) => identity.provider === "email")) {
    if (!parsed.data.password || !user.email) return apiFailure("BAD_REQUEST", say("Enter your current password.", "현재 비밀번호를 입력해 주세요."), 400);
    const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url || !publicKey) return apiFailure("UNAVAILABLE", say("Account verification is unavailable.", "계정 확인을 이용할 수 없습니다."), 503);
    const verifier = createClient(url, publicKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const verified = await verifier.auth.signInWithPassword({ email: user.email, password: parsed.data.password });
    if (verified.error || verified.data.user?.id !== user.id) return apiFailure("UNAUTHORIZED", say("The current password is incorrect.", "현재 비밀번호가 올바르지 않습니다."), 401);
    await verifier.auth.signOut({ scope: "local" });
  }

  // Do not erase the other party's pending transaction or legally relevant order records.
  const participant = `buyer_id.eq.${user.id},seller_id.eq.${user.id}`;
  const [marketOffers, bargainReservations, bargainOffers, buyerOrders, paidOrders, moderation, ads, adEvents] = await Promise.all([
    admin.from("market_trade_offers").select("id", { count: "exact", head: true }).or(participant).in("status", ["pending", "accepted"]),
    admin.from("bargain_item_reservations").select("id", { count: "exact", head: true }).or(participant).in("status", ["pending", "accepted", "requested", "confirmed", "on_the_way"]),
    admin.from("bargain_listing_offers").select("id", { count: "exact", head: true }).or(participant).in("status", ["pending", "accepted"]),
    admin.from("group_buy_orders").select("id", { count: "exact", head: true }).eq("buyer_id", user.id),
    admin.from("group_buy_orders").select("id", { count: "exact", head: true }).eq("paid_by", user.id),
    admin.from("market_moderation_actions").select("id", { count: "exact", head: true }).eq("moderator_id", user.id),
    admin.from("ads").select("id", { count: "exact", head: true }).eq("created_by", user.id),
    admin.from("ad_events").select("id", { count: "exact", head: true }).eq("user_id", user.id),
  ]);
  const checks = [marketOffers, bargainReservations, bargainOffers, buyerOrders, paidOrders, moderation, ads, adEvents];
  if (checks.some((result) => result.error)) return apiFailure("UNAVAILABLE", say("We could not verify your account activity. Please try again later.", "계정 활동을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요."), 503);
  if ([marketOffers, bargainReservations, bargainOffers].some((result) => (result.count ?? 0) > 0)) return apiFailure("CONFLICT", say("Finish or cancel your ongoing trades before deleting your account.", "진행 중인 거래를 완료하거나 취소한 뒤 탈퇴해 주세요."), 409);
  if ([buyerOrders, paidOrders, moderation, ads, adEvents].some((result) => (result.count ?? 0) > 0)) return apiFailure("CONFLICT", say("This account has order or administrative records that need review. Please contact support to close it.", "주문 또는 운영 기록을 확인해야 하는 계정입니다. 탈퇴를 위해 고객지원에 문의해 주세요."), 409);
  const groups = await admin.from("group_buys").select("id").eq("owner_id", user.id).limit(1001);
  if (groups.error || (groups.data?.length ?? 0) > 1000) return apiFailure("UNAVAILABLE", say("We could not verify your group orders. Please contact support.", "공동구매 주문을 확인하지 못했습니다. 고객지원에 문의해 주세요."), 503);
  for (let start = 0; start < (groups.data?.length ?? 0); start += 100) {
    const ids = groups.data!.slice(start, start + 100).map((group) => group.id);
    const orders = await admin.from("group_buy_orders").select("id", { count: "exact", head: true }).in("group_buy_id", ids);
    if (orders.error) return apiFailure("UNAVAILABLE", say("We could not verify your group orders.", "공동구매 주문을 확인하지 못했습니다."), 503);
    if (orders.count) return apiFailure("CONFLICT", say("Your group-buy orders need review before account deletion. Please contact support.", "공동구매 주문 확인이 필요합니다. 탈퇴를 위해 고객지원에 문의해 주세요."), 409);
  }

  let removedFiles = 0;
  try {
    const storage = [] as { bucket: string; paths: string[] }[];
    for (const bucket of userImageBuckets) storage.push({ bucket, paths: await userStoragePaths(admin, bucket, user.id) });
    for (const { bucket, paths } of storage) {
      for (let start = 0; start < paths.length; start += 100) {
        const batch = paths.slice(start, start + 100);
        const { error } = await admin.storage.from(bucket).remove(batch);
        if (error) throw error;
        removedFiles += batch.length;
      }
    }
    const { error } = await admin.auth.admin.deleteUser(user.id, false);
    if (error) throw error;
    return apiSuccess({ deleted: true });
  } catch (error) {
    console.error("Account deletion failed", error);
    return apiFailure("INTERNAL", removedFiles
      ? say("We could not complete deletion. Some account photos may have been removed; please contact support before retrying.", "탈퇴를 완료하지 못했습니다. 일부 사진이 삭제되었을 수 있으니 다시 시도하기 전에 고객지원에 문의해 주세요.")
      : say("We could not complete deletion. No account files were removed; please contact support.", "탈퇴를 완료하지 못했습니다. 계정 파일은 삭제되지 않았습니다. 고객지원에 문의해 주세요."), 500);
  }
}
