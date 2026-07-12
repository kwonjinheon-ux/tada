"use client";

import { useState } from "react";
import { ProfilePhotoUploader } from "@/components/dashboard/ProfilePhotoUploader";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type Profile = { display_name: string; nickname_changed_at: string | null; phone: string | null; location_mode: "manual" | "current"; region_city: string | null; region_suburb: string | null; latitude: number | null; longitude: number | null };

export function ProfileSettingsForm({ email, avatarPath, initialProfile }: { email: string; avatarPath?: string | null; initialProfile: Profile }) {
  const [displayName, setDisplayName] = useState(initialProfile.display_name);
  const [phone, setPhone] = useState(initialProfile.phone ?? "");
  const [locationMode, setLocationMode] = useState<"manual" | "current">(initialProfile.location_mode);
  const [city, setCity] = useState(initialProfile.region_city ?? "Hamilton");
  const [suburb, setSuburb] = useState(initialProfile.region_suburb ?? "Flagstaff");
  const [coordinates, setCoordinates] = useState({ latitude: initialProfile.latitude, longitude: initialProfile.longitude });
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const changedAt = initialProfile.nickname_changed_at ? new Date(initialProfile.nickname_changed_at) : null;
  const nextNicknameChange = changedAt ? new Date(changedAt.getTime() + 30 * 24 * 60 * 60 * 1000) : null;
  const nicknameLocked = Boolean(nextNicknameChange && nextNicknameChange > new Date());

  const useCurrentLocation = () => {
    if (!navigator.geolocation) { setStatus("Location services are not available in this browser."); return; }
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      setLocationMode("current");
      setCoordinates({ latitude: coords.latitude, longitude: coords.longitude });
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.latitude}&lon=${coords.longitude}`);
        const data = await response.json();
        const address = data.address ?? {};
        setCity(address.city ?? address.town ?? address.village ?? "Current location");
        setSuburb(address.suburb ?? address.neighbourhood ?? address.city_district ?? "");
      } catch { setCity("Current location"); setSuburb(`${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`); }
    }, () => setStatus("Location permission was not granted. Enter your region manually."));
  };

  const saveChanges = async () => {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) { setStatus("Supabase is not configured."); return; }
    const nickname = displayName.trim();
    if (nickname.length < 2 || nickname.length > 40) { setStatus("Nickname must be between 2 and 40 characters."); return; }
    if (nicknameLocked && nickname !== initialProfile.display_name) { setStatus(`Nickname can be changed after ${nextNicknameChange?.toLocaleDateString()}.`); return; }
    setIsSaving(true); setStatus("");
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { setStatus("Please sign in again."); setIsSaving(false); return; }
    const { error } = await supabase.from("profiles").upsert({ id: userData.user.id, display_name: nickname, phone: phone.trim() || null, location_mode: locationMode, region_city: city.trim() || null, region_suburb: suburb.trim() || null, latitude: coordinates.latitude, longitude: coordinates.longitude });
    if (error) { setStatus(error.message); setIsSaving(false); return; }
    const { error: metadataError } = await supabase.auth.updateUser({ data: { full_name: nickname } });
    setStatus(metadataError ? metadataError.message : "Profile settings saved."); setIsSaving(false);
  };

  const updatePassword = async () => {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) { setStatus("Supabase is not configured."); return; }
    if (!currentPassword || newPassword.length < 8) { setStatus("Enter your current password and a new password of at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { setStatus("New passwords do not match."); return; }
    setIsUpdatingPassword(true);
    const { error: verificationError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
    if (verificationError) { setStatus("Your current password is incorrect."); setIsUpdatingPassword(false); return; }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setStatus(error ? error.message : "Password updated successfully.");
    if (!error) { setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }
    setIsUpdatingPassword(false);
  };

  return <>
    <div className="profile-settings-grid">
      <div className="profile-main-column">
        <section className="profile-panel profile-photo-panel"><h2>Profile Photo</h2><ProfilePhotoUploader initialPath={avatarPath} displayName={displayName} /></section>
        <section className="profile-panel"><h2><i className="fa-regular fa-id-badge" /> Personal Information</h2><label className="profile-field"><span>Display Name / Nickname</span><input value={displayName} disabled={nicknameLocked} onChange={(event) => setDisplayName(event.target.value)} /><small>{nicknameLocked ? `Nickname can be changed again on ${nextNicknameChange?.toLocaleDateString()}.` : "This is how your name will appear to other buyers and sellers."}</small></label></section>
        <section className="profile-panel"><h2><i className="fa-solid fa-lock" /> Security</h2><div className="profile-password-grid"><label className="profile-field is-wide"><span>Current Password</span><input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label><label className="profile-field"><span>New Password</span><input type="password" minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label><label className="profile-field"><span>Confirm New Password</span><input type="password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label></div><div className="profile-panel-action"><button className="profile-primary-button" type="button" disabled={isUpdatingPassword} onClick={() => void updatePassword()}>{isUpdatingPassword ? "Updating…" : "Update Password"}</button></div></section>
      </div>
      <div className="profile-side-column">
        <section className="profile-panel"><div className="profile-panel-title"><h2>Email Address</h2><span><i className="fa-solid fa-circle-check" /> Verified</span></div><p className="profile-email">{email}</p></section>
        <section className="profile-panel"><h2>Phone Number</h2><div className="profile-phone"><span>+64</span><input type="tel" value={phone} placeholder="21 555 0123" onChange={(event) => setPhone(event.target.value)} /></div></section>
        <section className="profile-panel"><h2>Trading Region</h2><div className="profile-location-actions"><button className={locationMode === "current" ? "is-active" : ""} type="button" onClick={useCurrentLocation}><i className="fa-solid fa-location-crosshairs" /> Use current location</button><button className={locationMode === "manual" ? "is-active" : ""} type="button" onClick={() => setLocationMode("manual")}><i className="fa-regular fa-pen-to-square" /> Set manually</button></div><div className="profile-region-fields"><label className="profile-field"><span>City</span><input value={city} onChange={(event) => setCity(event.target.value)} placeholder="Hamilton" /></label><label className="profile-field"><span>Suburb / Area</span><input value={suburb} onChange={(event) => setSuburb(event.target.value)} placeholder="Flagstaff" /></label></div><div className="profile-map"><i className="fa-solid fa-location-dot" /><span>{[city, suburb].filter(Boolean).join(" / ") || "Set your trading region"}</span></div></section>
      </div>
    </div>
    <div className="profile-save-bar"><span className="profile-form-status" role="status">{status}</span><button className="profile-primary-button" type="button" disabled={isSaving} onClick={() => void saveChanges()}>{isSaving ? "Saving…" : "Save Changes"}</button></div>
  </>;
}
