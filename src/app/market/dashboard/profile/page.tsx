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
    ? await supabase.from("profiles").select("display_name, phone, location_mode, region_city, region_suburb, main_location, sub_location, locality, raw_suburb, region, latitude, longitude, preferred_locale, profile_visibility").eq("id", user.id).maybeSingle()
    : { data: null, error: null };
  const { data: profile } = profileResult.error && supabase
    ? await supabase.from("profiles").select("display_name, phone, location_mode, region_city, region_suburb, latitude, longitude, preferred_locale").eq("id", user.id).maybeSingle()
    : profileResult;
  const categorizedProfile = profile as (typeof profile & { main_location?: string | null; sub_location?: string | null; locality?: string | null; raw_suburb?: string | null; region?: string | null; profile_visibility?: string | null }) | null;
  const displayName = profile?.display_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Tada User";
  const completedTradeResults = supabase ? await Promise.all([
    supabase.from("market_trade_offers").select("id", { count: "exact", head: true }).eq("seller_id", user.id).eq("status", "completed"),
    supabase.from("market_trade_offers").select("id", { count: "exact", head: true }).eq("buyer_id", user.id).eq("status", "completed"),
    supabase.from("bargain_item_reservations").select("id", { count: "exact", head: true }).eq("seller_id", user.id).eq("status", "picked_up"),
    supabase.from("bargain_item_reservations").select("id", { count: "exact", head: true }).eq("buyer_id", user.id).eq("status", "picked_up"),
  ]) : null;
  const completedTradeCount = completedTradeResults && completedTradeResults.every((result) => !result.error && result.count !== null)
    ? completedTradeResults.reduce((total, result) => total + (result.count ?? 0), 0)
    : null;
  return (
      <div className="dashboard-content profile-settings-content profile-settings-page">
        <ProfileSettingsForm
          email={user.email ?? ""}
          completedTradeCount={completedTradeCount}
          emailVerified={Boolean(user.email_confirmed_at)}
          initialVerifiedPhone={user.phone_confirmed_at ? user.phone ?? "" : ""}
          avatarPath={user.user_metadata?.avatar_path}
          memberSince={new Intl.DateTimeFormat("en-NZ", { month: "long", year: "numeric" }).format(new Date(user.created_at))}
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
            profile_visibility: categorizedProfile?.profile_visibility === "members" || categorizedProfile?.profile_visibility === "trade_partners" ? categorizedProfile.profile_visibility : "public",
          }}
        />
      </div>
  );
}
