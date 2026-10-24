import { redirect } from "next/navigation";
import { ProfileSettingsForm } from "@/components/dashboard/ProfileSettingsForm";
import { getServerUser } from "@/lib/auth-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = { title: "Profile Settings" };

export default async function ProfileSettingsPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");
  const supabase = await createServerSupabaseClient();
  const profileResult = supabase
    ? await supabase.from("profiles").select("display_name, avatar_path, phone, location_mode, region_city, region_suburb, main_location, sub_location, locality, raw_suburb, region, latitude, longitude, preferred_locale, profile_visibility").eq("id", user.id).maybeSingle()
    : { data: null, error: null };
  // An older location schema must not disable an otherwise available privacy setting.
  const visibilityResult = profileResult.error && supabase
    ? await supabase.from("profiles").select("profile_visibility").eq("id", user.id).maybeSingle()
    : profileResult;
  const { data: profile } = profileResult.error && supabase
    ? await supabase.from("profiles").select("display_name, avatar_path, phone, location_mode, region_city, region_suburb, latitude, longitude, preferred_locale").eq("id", user.id).maybeSingle()
    : profileResult;
  const categorizedProfile = profile as (typeof profile & { main_location?: string | null; sub_location?: string | null; locality?: string | null; raw_suburb?: string | null; region?: string | null; profile_visibility?: string | null }) | null;
  const displayName = profile?.display_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Tada User";
  const completedTradeResults = supabase ? await Promise.all([
    supabase.from("market_trade_offers").select("id", { count: "exact", head: true }).eq("seller_id", user.id).eq("status", "completed"),
    supabase.from("market_trade_offers").select("id", { count: "exact", head: true }).eq("buyer_id", user.id).eq("status", "completed"),
    supabase.from("bargain_item_reservations").select("id", { count: "exact", head: true }).eq("seller_id", user.id).eq("status", "picked_up"),
    supabase.from("bargain_item_reservations").select("id", { count: "exact", head: true }).eq("buyer_id", user.id).eq("status", "picked_up"),
  ]) : null;
  const completedSaleCount = completedTradeResults && [completedTradeResults[0], completedTradeResults[2]].every((result) => !result.error && result.count !== null)
    ? (completedTradeResults[0].count ?? 0) + (completedTradeResults[2].count ?? 0)
    : null;
  const completedPurchaseCount = completedTradeResults && [completedTradeResults[1], completedTradeResults[3]].every((result) => !result.error && result.count !== null)
    ? (completedTradeResults[1].count ?? 0) + (completedTradeResults[3].count ?? 0)
    : null;
  const avatarPath = profile?.avatar_path || user.user_metadata?.avatar_path || null;
  const signedAvatar = avatarPath && supabase ? await supabase.storage.from("profile-avatars").createSignedUrl(avatarPath, 3600) : null;
  const identityProviders = user.identities?.map((identity) => identity.provider) ?? [];
  const metadataProviders = Array.isArray(user.app_metadata?.providers)
    ? user.app_metadata.providers.filter((provider: unknown): provider is string => typeof provider === "string")
    : [];
  const primaryProvider = typeof user.app_metadata?.provider === "string" ? user.app_metadata.provider : null;
  const authProviders = identityProviders.length
    ? identityProviders
    : metadataProviders.length
      ? metadataProviders
      : primaryProvider ? [primaryProvider] : [];
  return (
      <div className="dashboard-content profile-settings-content profile-settings-page">
        <ProfileSettingsForm
          email={user.email ?? ""}
          completedPurchaseCount={completedPurchaseCount}
          completedSaleCount={completedSaleCount}
          emailVerified={Boolean(user.email_confirmed_at)}
          initialVerifiedPhone={user.phone_confirmed_at ? user.phone ?? "" : ""}
          avatarPath={avatarPath}
          avatarUrl={signedAvatar?.data?.signedUrl ?? null}
          userId={user.id}
          hasPassword={authProviders.includes("email")}
          authProvider={authProviders.find((provider) => provider !== "email") ?? null}
          initialPendingEmail={user.new_email}
          profileVisibilityAvailable={Boolean(supabase && !visibilityResult.error)}
          memberSince={user.created_at}
          initialDescriptionTextSizeStep={typeof user.user_metadata?.listing_description_text_step === "number" && user.user_metadata.listing_description_text_step >= 0 && user.user_metadata.listing_description_text_step <= 5 ? user.user_metadata.listing_description_text_step : 0}
          initialProfile={{
            display_name: displayName,
            phone: profile?.phone ?? null,
            location_mode: profile?.location_mode === "current" ? "current" : "manual",
            region_city: profile?.region_city ?? null,
            region_suburb: profile?.region_suburb ?? null,
            main_location: categorizedProfile?.main_location ?? null,
            sub_location: categorizedProfile?.sub_location ?? null,
            locality: categorizedProfile?.locality ?? null,
            raw_suburb: categorizedProfile?.raw_suburb ?? null,
            region: categorizedProfile?.region ?? null,
            latitude: profile?.latitude ? Number(profile.latitude) : null,
            longitude: profile?.longitude ? Number(profile.longitude) : null,
            preferred_locale: ["en", "ko", "zh", "ja", "es", "hi", "ar"].includes(profile?.preferred_locale ?? "") ? profile?.preferred_locale as "en" | "ko" | "zh" | "ja" | "es" | "hi" | "ar" : "en",
            profile_visibility: ["members", "interested_users", "trade_partners", "private"].includes(visibilityResult.data?.profile_visibility ?? "") ? visibilityResult.data?.profile_visibility as "members" | "interested_users" | "trade_partners" | "private" : "public",
          }}
        />
      </div>
  );
}
