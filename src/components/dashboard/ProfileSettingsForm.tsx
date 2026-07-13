"use client";

import { useState } from "react";
import { ProfilePhotoUploader } from "@/components/dashboard/ProfilePhotoUploader";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type Profile = { display_name: string; nickname_changed_at: string | null; phone: string | null; location_mode: "manual" | "current"; region_city: string | null; region_suburb: string | null; latitude: number | null; longitude: number | null };

const NZ_CITIES = [
  ["Whangārei", -35.725, 174.323, ["Avenues", "Kamo", "Onerahi", "Tikipunga"]], ["Auckland", -36.849, 174.763, ["CBD", "Albany", "Manukau", "New Lynn", "Takapuna"]], ["Hamilton", -37.787, 175.279, ["Flagstaff", "Hillcrest", "Rototuna", "Chartwell", "Frankton"]], ["Tauranga", -37.687, 176.165, ["Mount Maunganui", "Papamoa", "Bethlehem", "Otumoetai"]], ["Rotorua", -38.137, 176.252, ["Ngongotahā", "Kawaha Point", "Lynmore", "Pukehangi"]], ["Gisborne", -38.662, 178.018, ["Kaiti", "Elgin", "Whataupoko", "Te Hapara"]], ["Napier", -39.492, 176.912, ["Ahuriri", "Taradale", "Marewa", "Westshore"]], ["Hastings", -39.638, 176.844, ["Havelock North", "Flaxmere", "Mahora", "Parkvale"]], ["New Plymouth", -39.056, 174.075, ["Fitzroy", "Bell Block", "Vogeltown", "Westown"]], ["Whanganui", -39.933, 175.052, ["Gonville", "Durie Hill", "Castlecliff", "Springvale"]], ["Palmerston North", -40.356, 175.609, ["Hokowhitu", "Kelvin Grove", "Roslyn", "Terrace End"]], ["Porirua", -41.133, 174.84, ["Aotea", "Cannons Creek", "Paremata", "Whitby"]], ["Lower Hutt", -41.212, 174.903, ["Petone", "Wainuiomata", "Stokes Valley", "Eastbourne"]], ["Upper Hutt", -41.125, 175.07, ["Trentham", "Silverstream", "Maoribank", "Pinehaven"]], ["Wellington", -41.286, 174.776, ["Te Aro", "Karori", "Kilbirnie", "Newtown", "Johnsonville"]], ["Nelson", -41.271, 173.283, ["Stoke", "Tahunanui", "The Wood", "Atawhai"]], ["Christchurch", -43.532, 172.637, ["Riccarton", "Halswell", "Papanui", "Sumner", "Ilam"]], ["Dunedin", -45.878, 170.503, ["North East Valley", "Mornington", "St Clair", "Mosgiel"]], ["Invercargill", -46.413, 168.353, ["Waikiwi", "Gladstone", "Kingswell", "Appleby"]],
] as const;

export function ProfileSettingsForm({ email, avatarPath, initialProfile }: { email: string; avatarPath?: string | null; initialProfile: Profile }) {
  const [displayName, setDisplayName] = useState(initialProfile.display_name);
  const [phone, setPhone] = useState(initialProfile.phone ?? "");
  const [locationMode, setLocationMode] = useState<"manual" | "current">(initialProfile.location_mode);
  const [city, setCity] = useState(() => NZ_CITIES.some(([name]) => name === initialProfile.region_city) ? initialProfile.region_city! : "");
  const [suburb, setSuburb] = useState(initialProfile.region_suburb ?? "");
  const [coordinates, setCoordinates] = useState({ latitude: initialProfile.latitude, longitude: initialProfile.longitude });
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const changedAt = initialProfile.nickname_changed_at ? new Date(initialProfile.nickname_changed_at) : null;
  const nextNicknameChange = changedAt ? new Date(changedAt.getTime() + 30 * 24 * 60 * 60 * 1000) : null;
  const nicknameLocked = Boolean(nextNicknameChange && nextNicknameChange > new Date());
  const selectedCity = NZ_CITIES.find(([name]) => name === city);
  const availableSuburbs = selectedCity?.[3] ?? [];
  const mapUrl = `https://www.google.com/maps?q=${encodeURIComponent([suburb, city, "New Zealand"].filter(Boolean).join(", ") || "New Zealand")}&output=embed`;
  const passwordsMatch = Boolean(confirmPassword) && newPassword === confirmPassword;
  const applyNearestLocation = (latitude: number, longitude: number, source: string) => {
    const nearest = NZ_CITIES.reduce((closest, location) => ((location[1] - latitude) ** 2 + (location[2] - longitude) ** 2) < ((closest[1] - latitude) ** 2 + (closest[2] - longitude) ** 2) ? location : closest);
    setLocationMode("current"); setCoordinates({ latitude, longitude }); setCity(nearest[0]); setSuburb(nearest[3][0]); setStatus(`${source} set to ${nearest[0]}.`);
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) { setStatus("Location services are not available in this browser."); return; }
    setIsLocating(true); setStatus("Finding your current location…");
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      applyNearestLocation(coords.latitude, coords.longitude, "Current location"); setIsLocating(false);
    }, () => {
      void fetch("https://ipapi.co/json/").then((response) => response.json()).then((data) => {
        if (typeof data.latitude !== "number" || typeof data.longitude !== "number") throw new Error("No IP location");
        applyNearestLocation(data.latitude, data.longitude, "Approximate location");
      }).catch(() => setStatus("Allow location access in your browser settings, then try again.")).finally(() => setIsLocating(false));
    }, { enableHighAccuracy: true, maximumAge: 0, timeout: 12000 });
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
        <section className="profile-panel"><h2><i className="fa-regular fa-id-badge" /> Personal Information</h2><label className="profile-field"><span>Display Name / Nickname</span><input value={displayName} disabled={nicknameLocked} onChange={(event) => setDisplayName(event.target.value)} /><small>{nicknameLocked ? `Nickname can be changed again on ${nextNicknameChange?.toLocaleDateString()}.` : "Changing your nickname locks further changes for 30 days."}</small></label></section>
        <section className="profile-panel"><h2><i className="fa-solid fa-lock" /> Security</h2><div className="profile-password-grid"><label className="profile-field is-wide"><span>Current Password</span><div className="profile-password-input"><input type={showCurrentPassword ? "text" : "password"} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /><button type="button" aria-label={showCurrentPassword ? "Hide current password" : "Show current password"} onClick={() => setShowCurrentPassword((value) => !value)}><i className={`fa-regular ${showCurrentPassword ? "fa-eye-slash" : "fa-eye"}`} /></button></div></label><label className="profile-field"><span>New Password</span><div className="profile-password-input"><input type={showNewPassword ? "text" : "password"} minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /><button type="button" aria-label={showNewPassword ? "Hide new password" : "Show new password"} onClick={() => setShowNewPassword((value) => !value)}><i className={`fa-regular ${showNewPassword ? "fa-eye-slash" : "fa-eye"}`} /></button></div></label><label className="profile-field"><span>Confirm New Password</span><div className={`profile-password-input ${confirmPassword ? (passwordsMatch ? "is-valid" : "is-invalid") : ""}`}><input type={showConfirmPassword ? "text" : "password"} minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /><button type="button" aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"} onClick={() => setShowConfirmPassword((value) => !value)}><i className={`fa-regular ${showConfirmPassword ? "fa-eye-slash" : "fa-eye"}`} /></button>{confirmPassword && <i className={`password-match-icon fa-solid ${passwordsMatch ? "fa-check" : "fa-xmark"}`} aria-label={passwordsMatch ? "Passwords match" : "Passwords do not match"} />}</div></label></div><div className="profile-panel-action"><button className="profile-primary-button" type="button" disabled={isUpdatingPassword} onClick={() => void updatePassword()}>{isUpdatingPassword ? "Updating…" : "Update Password"}</button></div></section>
      </div>
      <div className="profile-side-column">
        <section className="profile-panel"><div className="profile-panel-title"><h2>Email Address</h2><span><i className="fa-solid fa-circle-check" /> Verified</span></div><p className="profile-email">{email}</p></section>
        <section className="profile-panel"><h2>Phone Number</h2><div className="profile-phone"><span>+64</span><input type="tel" value={phone} placeholder="21 555 0123" onChange={(event) => setPhone(event.target.value)} /></div></section>
      </div>
      <section className="profile-panel profile-region-panel"><h2>Trading Region</h2><div className="profile-location-actions"><button className={locationMode === "current" ? "is-active" : ""} type="button" disabled={isLocating} onClick={useCurrentLocation}><i className="fa-solid fa-location-crosshairs" /> {isLocating ? "Finding location…" : "Use current location"}</button></div><div className="profile-region-fields"><label className="profile-field"><span>City</span><select value={city} onChange={(event) => { const nextCity = event.target.value; const next = NZ_CITIES.find(([name]) => name === nextCity); setLocationMode("manual"); setCity(nextCity); setSuburb(next?.[3][0] ?? ""); }}><option value="">Select a city</option>{NZ_CITIES.map(([name]) => <option key={name}>{name}</option>)}</select></label><label className="profile-field"><span>Suburb / Area</span><select disabled={!selectedCity} value={availableSuburbs.includes(suburb as never) ? suburb : ""} onChange={(event) => { setLocationMode("manual"); setSuburb(event.target.value); }}><option value="">Select a suburb</option>{availableSuburbs.map((name) => <option key={name}>{name}</option>)}</select></label></div><div className="profile-map profile-google-map"><iframe title={`${city || "New Zealand"} map`} src={mapUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" /><span><i className="fa-solid fa-location-dot" /> {city && suburb ? `${city} / ${suburb}` : "Choose a city and suburb"}</span></div></section>
    </div>
    <div className="profile-save-bar"><span className="profile-form-status" role="status">{status}</span><button className="profile-primary-button" type="button" disabled={isSaving} onClick={() => void saveChanges()}>{isSaving ? "Saving…" : "Save Changes"}</button></div>
  </>;
}
