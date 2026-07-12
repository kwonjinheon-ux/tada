import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { ProfilePhotoUploader } from "@/components/dashboard/ProfilePhotoUploader";
import { getServerUser } from "@/lib/auth-server";

export const metadata = { title: "Profile Settings" };

export default async function ProfileSettingsPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");
  const displayName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Tada User";
  const avatarPath = user.user_metadata?.avatar_path;

  return (
    <main className="marketplace-page dashboard-page profile-settings-page">
      <DashboardSidebar context="market" active="Profile Settings" />
      <div className="dashboard-content profile-settings-content">
        <header className="profile-heading"><h1>Profile Settings</h1><p>Manage your personal information and account security.</p></header>
        <div className="profile-settings-grid">
          <div className="profile-main-column">
            <section className="profile-panel profile-photo-panel">
              <h2>Profile Photo</h2>
              <ProfilePhotoUploader initialPath={avatarPath} />
            </section>
            <section className="profile-panel">
              <h2><i className="fa-regular fa-id-badge" /> Personal Information</h2>
              <label className="profile-field"><span>Display Name / Nickname</span><input defaultValue={displayName} /><small>This is how your name will appear to other buyers and sellers.</small></label>
            </section>
            <section className="profile-panel">
              <h2><i className="fa-solid fa-lock" /> Security</h2>
              <div className="profile-password-grid"><label className="profile-field is-wide"><span>Current Password</span><input type="password" placeholder="••••••••••••" /></label><label className="profile-field"><span>New Password</span><input type="password" /></label><label className="profile-field"><span>Confirm New Password</span><input type="password" /></label></div>
              <div className="profile-panel-action"><button className="profile-primary-button" type="button">Update Password</button></div>
            </section>
          </div>
          <div className="profile-side-column">
            <section className="profile-panel"><div className="profile-panel-title"><h2>Email Address</h2><span><i className="fa-solid fa-circle-check" /> Verified</span></div><p className="profile-email">{user.email}</p><button className="profile-outline-button" type="button">Change Email</button></section>
            <section className="profile-panel"><h2>Phone Number</h2><div className="profile-phone"><span>+64</span><input type="tel" placeholder="21 555 0123" /></div><button className="profile-verify-button" type="button"><i className="fa-regular fa-message" /> Verify via SMS</button></section>
            <section className="profile-panel"><h2>Trading Region</h2><select className="profile-select" defaultValue="Auckland"><option>Auckland</option><option>Wellington</option><option>Christchurch</option><option>Hamilton</option></select><div className="profile-map"><i className="fa-solid fa-location-dot" /><span>Auckland, New Zealand</span></div></section>
            <section className="profile-panel danger-panel"><h2>Danger Zone</h2><p>Once you deactivate your account, access will be disabled. Please be certain.</p><button className="profile-danger-button" type="button">Deactivate Account</button></section>
          </div>
        </div>
        <div className="profile-save-bar"><button type="button">Discard Changes</button><button className="profile-primary-button" type="button">Save Changes</button></div>
      </div>
    </main>
  );
}
