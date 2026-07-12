import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { ProfileSettingsForm } from "@/components/dashboard/ProfileSettingsForm";
import { getServerUser } from "@/lib/auth-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = { title: "Profile Settings" };

export default async function ProfileSettingsPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");
  const supabase = await createServerSupabaseClient();
  const { data: profile } = supabase
    ? await supabase.from("profiles").select("display_name, nickname_changed_at, phone, location_mode, region_city, region_suburb, latitude, longitude").eq("id", user.id).maybeSingle()
    : { data: null };
  const displayName = profile?.display_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Tada User";

  return (
    <main className="marketplace-page dashboard-page profile-settings-page">
      <DashboardSidebar context="market" active="Profile Settings" />
      <div className="dashboard-content profile-settings-content">
        <ProfileSettingsForm
          email={user.email ?? ""}
          avatarPath={user.user_metadata?.avatar_path}
          initialProfile={{
            display_name: displayName,
            nickname_changed_at: profile?.nickname_changed_at ?? null,
            phone: profile?.phone ?? null,
            location_mode: profile?.location_mode === "current" ? "current" : "manual",
            region_city: profile?.region_city ?? null,
            region_suburb: profile?.region_suburb ?? null,
            latitude: profile?.latitude ? Number(profile.latitude) : null,
            longitude: profile?.longitude ? Number(profile.longitude) : null,
          }}
        />
      </div>
    </main>
  );
}
