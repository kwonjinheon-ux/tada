"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProfilePhotoUploader } from "@/components/dashboard/ProfilePhotoUploader";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type Profile = { display_name: string; phone: string | null; location_mode: "manual" | "current"; region_city: string | null; region_suburb: string | null; latitude: number | null; longitude: number | null };
type LocationCoordinates = { latitude: number; longitude: number; accuracy: number };
type LocationRequestState = { status: "idle" } | { status: "loading" } | { status: "success"; coordinates: LocationCoordinates } | { status: "error"; message: string };
type StaticSwitches = { allowChat: boolean; showPhoneNumber: boolean; emailNotifications: boolean; chatMessages: boolean; priceUpdates: boolean; smsAlerts: boolean; reviews: boolean };
const PROFILE_PREFERENCES_KEY = "tada-profile-preferences";
const defaultStaticSwitches: StaticSwitches = { allowChat: true, showPhoneNumber: false, emailNotifications: true, chatMessages: true, priceUpdates: false, smsAlerts: true, reviews: true };
const readStaticSwitches = (): StaticSwitches => {
  if (typeof window === "undefined") return defaultStaticSwitches;
  try {
    const stored = JSON.parse(window.localStorage.getItem(PROFILE_PREFERENCES_KEY) ?? "null");
    return stored && typeof stored === "object" ? { ...defaultStaticSwitches, ...stored } : defaultStaticSwitches;
  } catch { return defaultStaticSwitches; }
};
const NZ_CITIES = [
  ["Whangarei", -35.725, 174.323, ["Avenues", "Kamo", "Onerahi", "Tikipunga"]], ["Auckland", -36.849, 174.763, ["CBD", "Albany", "Manukau", "New Lynn", "Takapuna"]], ["Hamilton", -37.787, 175.279, ["Flagstaff", "Hillcrest", "Rototuna", "Chartwell", "Frankton"]], ["Tauranga", -37.687, 176.165, ["Mount Maunganui", "Papamoa", "Bethlehem", "Otumoetai"]], ["Rotorua", -38.137, 176.252, ["Ngongotaha", "Kawaha Point", "Lynmore", "Pukehangi"]], ["Napier", -39.492, 176.912, ["Ahuriri", "Taradale", "Marewa", "Westshore"]], ["Palmerston North", -40.356, 175.609, ["Hokowhitu", "Kelvin Grove", "Roslyn", "Terrace End"]], ["Wellington", -41.286, 174.776, ["Te Aro", "Karori", "Kilbirnie", "Newtown", "Johnsonville"]], ["Nelson", -41.271, 173.283, ["Stoke", "Tahunanui", "The Wood", "Atawhai"]], ["Christchurch", -43.532, 172.637, ["Riccarton", "Halswell", "Papanui", "Sumner", "Ilam"]], ["Dunedin", -45.878, 170.503, ["North East Valley", "Mornington", "St Clair", "Mosgiel"]], ["Invercargill", -46.413, 168.353, ["Waikiwi", "Gladstone", "Kingswell", "Appleby"]],
] as const;

export function ProfileSettingsForm({ email, avatarPath, memberSince, initialProfile }: { email: string; avatarPath?: string | null; memberSince?: string | null; initialProfile: Profile }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initialProfile.display_name);
  const [nicknameDraft, setNicknameDraft] = useState(initialProfile.display_name);
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [isSavingNickname, setIsSavingNickname] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [emailDraft, setEmailDraft] = useState(email);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [phone, setPhone] = useState(initialProfile.phone ?? "");
  const [locationMode, setLocationMode] = useState<"manual" | "current">(initialProfile.location_mode);
  const [city, setCity] = useState(() => NZ_CITIES.some(([name]) => name === initialProfile.region_city) ? initialProfile.region_city ?? "" : "");
  const [suburb, setSuburb] = useState(initialProfile.region_suburb ?? "");
  const [coordinates, setCoordinates] = useState({ latitude: initialProfile.latitude, longitude: initialProfile.longitude });
  const [currentLocation, setCurrentLocation] = useState<LocationRequestState>({ status: "idle" });
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneVerificationSent, setPhoneVerificationSent] = useState(false);
  const [isSendingPhoneCode, setIsSendingPhoneCode] = useState(false);
  const [isVerifyingPhoneCode, setIsVerifyingPhoneCode] = useState(false);
  const [status, setStatus] = useState("");
  const [staticSwitches, setStaticSwitches] = useState<StaticSwitches>(readStaticSwitches);
  const [savedSettings, setSavedSettings] = useState(() => ({ displayName: initialProfile.display_name, email, phone: initialProfile.phone ?? "", locationMode: initialProfile.location_mode, city: NZ_CITIES.some(([name]) => name === initialProfile.region_city) ? initialProfile.region_city ?? "" : "", suburb: initialProfile.region_suburb ?? "", coordinates: { latitude: initialProfile.latitude, longitude: initialProfile.longitude }, staticSwitches: readStaticSwitches() }));
  const passwordsMatch = Boolean(confirmPassword) && newPassword === confirmPassword;
  const selectedCity = NZ_CITIES.find(([name]) => name === city);
  const availableSuburbs = selectedCity?.[3] ?? [];
  const locationLabel = [suburb, city].filter(Boolean).join(", ");
  const staticSwitch = (key: keyof typeof staticSwitches) => <label className="profile-static-switch"><input type="checkbox" checked={staticSwitches[key]} onChange={() => setStaticSwitches((current) => ({ ...current, [key]: !current[key] }))} /><span aria-hidden="true" /></label>;

  const saveNickname = async () => {
    const nickname = nicknameDraft.trim();
    if (nickname.length < 2 || nickname.length > 40) { setStatus("Nickname must be between 2 and 40 characters."); return; }
    const supabase = createBrowserSupabaseClient();
    if (!supabase) { setStatus("Profile settings are unavailable right now."); return; }
    setIsSavingNickname(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { setStatus("Please sign in again."); setIsSavingNickname(false); return; }
    const { error } = await supabase.from("profiles").upsert({ id: userData.user.id, display_name: nickname });
    if (!error) await supabase.auth.updateUser({ data: { full_name: nickname } });
    setStatus(error ? error.message : "Nickname updated.");
    if (!error) { setDisplayName(nickname); setNicknameDraft(nickname); setIsEditingNickname(false); }
    setIsSavingNickname(false);
  };

  const updatePassword = async () => {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) { setStatus("Profile settings are unavailable right now."); return; }
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

  const updateEmail = async () => {
    const nextEmail = emailDraft.trim();
    const supabase = createBrowserSupabaseClient();
    if (!supabase || !nextEmail) { setStatus("Enter a valid email address."); return; }
    setIsUpdatingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: nextEmail });
    setStatus(error ? error.message : "Check your email to confirm the new address.");
    setIsUpdatingEmail(false);
  };

  const normalisedPhone = () => {
    const digits = phone.replace(/\D/g, "");
    return digits ? (digits.startsWith("64") ? `+${digits}` : `+64${digits.replace(/^0/, "")}`) : "";
  };

  const getGeolocationErrorMessage = (code: number) => {
    if (code === 1) return "Location permission was denied. Please allow it in your browser settings and try again.";
    if (code === 2) return "Your current location is unavailable. Check GPS or your network connection.";
    if (code === 3) return "Finding your location took too long. Please try again.";
    return "We could not determine your current location.";
  };

  const useCurrentLocation = () => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) { setCurrentLocation({ status: "error", message: "This browser does not support location services." }); return; }
    setCurrentLocation({ status: "loading" });
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      const nearest = NZ_CITIES.reduce((closest, candidate) => ((candidate[1] - coords.latitude) ** 2 + (candidate[2] - coords.longitude) ** 2) < ((closest[1] - coords.latitude) ** 2 + (closest[2] - coords.longitude) ** 2) ? candidate : closest);
      setLocationMode("current"); setCity(nearest[0]); setSuburb(nearest[3][0]); setCoordinates({ latitude: coords.latitude, longitude: coords.longitude }); setCurrentLocation({ status: "success", coordinates: { latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy } });
    }, (error) => setCurrentLocation({ status: "error", message: getGeolocationErrorMessage(error.code) }), { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
  };

  const saveAllSettings = async () => {
    const nickname = nicknameDraft.trim();
    const nextEmail = emailDraft.trim();
    if (nickname.length < 2 || nickname.length > 40) { setStatus("Nickname must be between 2 and 40 characters."); return; }
    if (!nextEmail) { setStatus("Enter a valid email address."); return; }
    const supabase = createBrowserSupabaseClient();
    if (!supabase) { setStatus("Profile settings are unavailable right now."); return; }
    setIsSavingAll(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { setStatus("Please sign in again."); setIsSavingAll(false); return; }
    const { error: profileError } = await supabase.from("profiles").upsert({ id: userData.user.id, display_name: nickname, phone: phone.trim() || null, location_mode: locationMode, region_city: city || null, region_suburb: suburb || null, latitude: coordinates.latitude, longitude: coordinates.longitude });
    if (profileError) { setStatus(profileError.message); setIsSavingAll(false); return; }
    const authUpdate = nextEmail === savedSettings.email ? { data: { full_name: nickname } } : { email: nextEmail, data: { full_name: nickname } };
    const { error: authError } = await supabase.auth.updateUser(authUpdate);
    if (authError) { setStatus(authError.message); setIsSavingAll(false); return; }
    window.localStorage.setItem(PROFILE_PREFERENCES_KEY, JSON.stringify(staticSwitches));
    setDisplayName(nickname); setNicknameDraft(nickname); setIsEditingNickname(false);
    setSavedSettings({ displayName: nickname, email: nextEmail, phone, locationMode, city, suburb, coordinates, staticSwitches });
    setStatus(nextEmail === savedSettings.email ? "Settings saved." : "Settings saved. Confirm the email change from your inbox.");
    setIsSavingAll(false);
    router.refresh();
  };

  const discardSettings = () => {
    setDisplayName(savedSettings.displayName); setNicknameDraft(savedSettings.displayName); setEmailDraft(savedSettings.email); setPhone(savedSettings.phone);
    setLocationMode(savedSettings.locationMode); setCity(savedSettings.city); setSuburb(savedSettings.suburb); setCoordinates(savedSettings.coordinates); setStaticSwitches(savedSettings.staticSwitches);
    setCurrentLocation({ status: "idle" }); setIsEditingNickname(false); setStatus("Changes discarded.");
  };

  const signOut = async () => {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) { setStatus("Unable to sign out right now."); return; }
    setIsSigningOut(true);
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) { setStatus(error.message); setIsSigningOut(false); return; }
    router.replace("/");
    router.refresh();
  };

  const sendPhoneCode = async () => {
    const supabase = createBrowserSupabaseClient(); const targetPhone = normalisedPhone();
    if (!supabase || !targetPhone) { setStatus("Enter a valid New Zealand phone number first."); return; }
    setIsSendingPhoneCode(true);
    const { error } = await supabase.auth.updateUser({ phone: targetPhone });
    setStatus(error ? error.message : "A 6-digit verification code was sent by SMS."); setPhoneVerificationSent(!error); setIsSendingPhoneCode(false);
  };

  const verifyPhoneCode = async () => {
    const supabase = createBrowserSupabaseClient(); const targetPhone = normalisedPhone();
    if (!supabase || phoneOtp.length !== 6) { setStatus("Enter the 6-digit SMS code."); return; }
    setIsVerifyingPhoneCode(true);
    const { error } = await supabase.auth.verifyOtp({ phone: targetPhone, token: phoneOtp, type: "phone_change" });
    setStatus(error ? error.message : "Phone number verified successfully.");
    if (!error) { setPhoneVerificationSent(false); setPhoneOtp(""); }
    setIsVerifyingPhoneCode(false);
  };

  return <>
    <div className="profile-settings-grid profile-settings-grid-refined">
      <div className="profile-main-column">
        <section className="profile-panel profile-photo-panel"><ProfilePhotoUploader initialPath={avatarPath} displayName={displayName} email={email} memberSince={memberSince} locationLabel={locationLabel || null} /></section>
        <section className={`profile-panel profile-account-panel ${isAccountOpen ? "is-open" : ""}`}>
          <button className="profile-section-toggle" type="button" aria-expanded={isAccountOpen} onClick={() => setIsAccountOpen((value) => !value)}><span><i className="fa-regular fa-user" aria-hidden="true" /> Account</span><i className={`fa-solid fa-chevron-${isAccountOpen ? "up" : "down"}`} aria-hidden="true" /></button>
          {isAccountOpen ? <div className="profile-account-content"><div className="profile-account-fields">
            <div className="profile-account-field"><span>Nickname</span>{isEditingNickname ? <form className="profile-account-nickname-form" onSubmit={(event) => { event.preventDefault(); void saveNickname(); }}><input aria-label="Nickname" autoFocus maxLength={40} value={nicknameDraft} onChange={(event) => setNicknameDraft(event.target.value)} /><button className="profile-primary-button" type="submit" disabled={isSavingNickname}>{isSavingNickname ? "Saving..." : "Save"}</button><button className="profile-inline-button" type="button" disabled={isSavingNickname} onClick={() => { setNicknameDraft(displayName); setIsEditingNickname(false); }}>Cancel</button></form> : <div className="profile-account-value"><strong>{displayName}</strong><button type="button" aria-label="Edit nickname" onClick={() => { setNicknameDraft(displayName); setIsEditingNickname(true); }}><i className="fa-solid fa-pen" aria-hidden="true" /></button></div>}</div>
            <div className="profile-account-field"><span>Email address</span><div className="profile-account-action"><input type="email" value={emailDraft} onChange={(event) => setEmailDraft(event.target.value)} /><button className="profile-outline-button" type="button" disabled={isUpdatingEmail} onClick={() => void updateEmail()}>{isUpdatingEmail ? "Updating..." : "Update"}</button></div></div>
            <div className="profile-account-field"><span>Phone number</span><div className="profile-account-action"><div className="profile-phone"><span>+64</span><input type="tel" value={phone} placeholder="21 555 0123" onChange={(event) => setPhone(event.target.value)} /></div>{phoneVerificationSent ? <div className="phone-verification"><input inputMode="numeric" maxLength={6} value={phoneOtp} placeholder="6-digit SMS code" onChange={(event) => setPhoneOtp(event.target.value.replace(/\D/g, ""))} /><button className="profile-primary-button" type="button" disabled={isVerifyingPhoneCode} onClick={() => void verifyPhoneCode()}>{isVerifyingPhoneCode ? "Verifying..." : "Verify"}</button></div> : <button className="profile-outline-button" type="button" disabled={isSendingPhoneCode} onClick={() => void sendPhoneCode()}>{isSendingPhoneCode ? "Sending..." : "Verify"}</button>}</div></div>
          </div></div> : null}
        </section>
        <section className={`profile-panel profile-security-panel ${isSecurityOpen ? "is-open" : ""}`}>
          <button className="profile-security-toggle" type="button" aria-expanded={isSecurityOpen} onClick={() => setIsSecurityOpen((value) => !value)}><span><i className="fa-solid fa-lock" /> Security</span><i className={`fa-solid fa-chevron-${isSecurityOpen ? "up" : "down"}`} /></button>
          {isSecurityOpen ? <div className="profile-security-content">
            <section className="profile-security-section"><h3>Password</h3><div className="profile-password-grid"><label className="profile-field is-wide"><span>Current Password</span><div className="profile-password-input"><input type={showCurrentPassword ? "text" : "password"} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /><button type="button" aria-label={showCurrentPassword ? "Hide current password" : "Show current password"} onClick={() => setShowCurrentPassword((value) => !value)}><i className={`fa-regular ${showCurrentPassword ? "fa-eye-slash" : "fa-eye"}`} /></button></div></label><label className="profile-field"><span>New Password</span><div className="profile-password-input"><input type={showNewPassword ? "text" : "password"} minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /><button type="button" aria-label={showNewPassword ? "Hide new password" : "Show new password"} onClick={() => setShowNewPassword((value) => !value)}><i className={`fa-regular ${showNewPassword ? "fa-eye-slash" : "fa-eye"}`} /></button></div></label><label className="profile-field"><span>Confirm New Password</span><div className={`profile-password-input ${confirmPassword ? (passwordsMatch ? "is-valid" : "is-invalid") : ""}`}><input type={showConfirmPassword ? "text" : "password"} minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /><button type="button" aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"} onClick={() => setShowConfirmPassword((value) => !value)}><i className={`fa-regular ${showConfirmPassword ? "fa-eye-slash" : "fa-eye"}`} /></button></div></label></div><div className="profile-panel-action"><button className="profile-primary-button" type="button" disabled={isUpdatingPassword} onClick={() => void updatePassword()}>{isUpdatingPassword ? "Updating…" : "Update Password"}</button></div></section>
            <section className="profile-security-section"><div className="profile-panel-title"><h3>Email Address</h3><span><i className="fa-solid fa-circle-check" /> Verified</span></div><label className="profile-field"><input type="email" value={emailDraft} onChange={(event) => setEmailDraft(event.target.value)} /></label><div className="profile-panel-action"><button className="profile-outline-button" type="button" disabled={isUpdatingEmail} onClick={() => void updateEmail()}>{isUpdatingEmail ? "Updating…" : "Change Email"}</button></div></section>
            <section className="profile-security-section"><h3>Phone Number</h3><div className="profile-phone"><span>+64</span><input type="tel" value={phone} placeholder="21 555 0123" onChange={(event) => setPhone(event.target.value)} /></div>{phoneVerificationSent ? <div className="phone-verification"><input inputMode="numeric" maxLength={6} value={phoneOtp} placeholder="6-digit SMS code" onChange={(event) => setPhoneOtp(event.target.value.replace(/\D/g, ""))} /><button className="profile-primary-button" type="button" disabled={isVerifyingPhoneCode} onClick={() => void verifyPhoneCode()}>{isVerifyingPhoneCode ? "Verifying…" : "Verify code"}</button></div> : <button className="profile-outline-button" type="button" disabled={isSendingPhoneCode} onClick={() => void sendPhoneCode()}>{isSendingPhoneCode ? "Sending…" : "Change Phone Number"}</button>}</section>
          </div> : null}
        </section>
      </div>
      <aside className="profile-static-preferences">
        <section className="profile-panel profile-static-preference-panel"><header className="profile-section-heading"><i className="fa-regular fa-bell" aria-hidden="true" /><h2>Contact Preferences</h2></header><div className="profile-static-setting-list"><div><strong>Allow Chat</strong>{staticSwitch("allowChat")}</div><div><strong>Show Phone Number</strong>{staticSwitch("showPhoneNumber")}</div><div><strong>Receive Email Notifications</strong>{staticSwitch("emailNotifications")}</div></div></section>
        <section className="profile-panel profile-static-preference-panel"><header className="profile-section-heading"><i className="fa-regular fa-bell" aria-hidden="true" /><h2>Notifications</h2></header><div className="profile-static-setting-list"><div><p><strong>Chat messages</strong><small>In-app notifications for new chats</small></p>{staticSwitch("chatMessages")}</div><div><p><strong>Price Updates</strong><small>Weekly newsletters and transaction info</small></p>{staticSwitch("priceUpdates")}</div><div><p><strong>SMS Alerts</strong><small>Critical account alerts via text</small></p>{staticSwitch("smsAlerts")}</div><div><p><strong>Reviews</strong><small>Critical account alerts via text</small></p>{staticSwitch("reviews")}</div></div></section>
      </aside>
    </div>
    <section className={`profile-panel profile-location-privacy-panel ${isLocationOpen ? "is-open" : ""}`}>
      <button className="profile-section-toggle" type="button" aria-expanded={isLocationOpen} onClick={() => setIsLocationOpen((value) => !value)}><span><i className="fa-solid fa-location-dot" aria-hidden="true" /> Location &amp; Privacy</span><i className={`fa-solid fa-chevron-${isLocationOpen ? "up" : "down"}`} aria-hidden="true" /></button>
      {isLocationOpen ? <>
      <div className="profile-location-access"><div><strong>Location access</strong><span>{locationMode === "current" ? "Using your current location" : "Set manually"}</span></div><button type="button" aria-label="Use current location" disabled={currentLocation.status === "loading"} onClick={useCurrentLocation}><i className="fa-solid fa-sliders" aria-hidden="true" /></button></div>
      <div className="profile-location-actions"><button className={locationMode === "current" ? "is-active" : ""} type="button" disabled={currentLocation.status === "loading"} onClick={useCurrentLocation}><i className="fa-solid fa-location-crosshairs" aria-hidden="true" /> {currentLocation.status === "loading" ? "Finding location..." : "Use current location"}</button><button className={locationMode === "manual" ? "is-active" : ""} type="button" onClick={() => { setLocationMode("manual"); setCurrentLocation({ status: "idle" }); }}><i className="fa-regular fa-pen-to-square" aria-hidden="true" /> Enter manually</button></div>
      {currentLocation.status === "error" ? <p className="profile-location-feedback is-error" role="alert">{currentLocation.message}</p> : null}
      {currentLocation.status === "success" ? <p className="profile-location-feedback">Current location found within {Math.round(currentLocation.coordinates.accuracy)}m accuracy.</p> : null}
      <div className="profile-region-fields"><label className="profile-field"><span>City</span><select value={city} onChange={(event) => { const nextCity = event.target.value; const next = NZ_CITIES.find(([name]) => name === nextCity); setLocationMode("manual"); setCity(nextCity); setSuburb(next?.[3][0] ?? ""); }}><option value="">Select a city</option>{NZ_CITIES.map(([name]) => <option key={name}>{name}</option>)}</select></label><label className="profile-field"><span>Suburb / Area</span><select disabled={!selectedCity} value={availableSuburbs.includes(suburb as never) ? suburb : ""} onChange={(event) => { setLocationMode("manual"); setSuburb(event.target.value); }}><option value="">Select a suburb</option>{availableSuburbs.map((name) => <option key={name}>{name}</option>)}</select></label></div>
      <div className="profile-location-privacy-note"><i className="fa-solid fa-circle-info" aria-hidden="true" /><p>Your location data is encrypted and never shared with third-party advertisers.</p></div>
      </> : null}
    </section>
    <div className="profile-settings-actions"><button className="profile-discard-button" type="button" disabled={isSavingAll} onClick={discardSettings}>Discard</button><button className="profile-primary-button" type="button" disabled={isSavingAll} onClick={() => void saveAllSettings()}>{isSavingAll ? "Saving..." : "Save changes"}</button></div>
    <button className="profile-logout-button" type="button" disabled={isSigningOut} onClick={() => void signOut()}><i className="fa-solid fa-right-from-bracket" aria-hidden="true" /> {isSigningOut ? "Logging out..." : "Logout"}</button>
    {status ? <p className="profile-form-status" role="status">{status}</p> : null}
  </>;
}
