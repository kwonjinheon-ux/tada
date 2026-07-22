"use client";

import { useState } from "react";
import { ProfilePhotoUploader } from "@/components/dashboard/ProfilePhotoUploader";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type Profile = { display_name: string; phone: string | null; location_mode: "manual" | "current"; region_city: string | null; region_suburb: string | null; latitude: number | null; longitude: number | null };
type Preferences = { allowChat: boolean; showPhoneNumber: boolean; emailNotifications: boolean; newMessages: boolean; savedItems: boolean; priceUpdates: boolean; reviews: boolean };

const defaultPreferences: Preferences = { allowChat: true, showPhoneNumber: false, emailNotifications: true, newMessages: true, savedItems: true, priceUpdates: true, reviews: true };

export function ProfileSettingsForm({ email, avatarPath, memberSince, initialProfile, initialPreferences }: { email: string; avatarPath?: string | null; memberSince?: string | null; initialProfile: Profile; initialPreferences?: Partial<Preferences> }) {
  const [displayName, setDisplayName] = useState(initialProfile.display_name);
  const [nicknameDraft, setNicknameDraft] = useState(initialProfile.display_name);
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [isSavingNickname, setIsSavingNickname] = useState(false);
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
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneVerificationSent, setPhoneVerificationSent] = useState(false);
  const [isSendingPhoneCode, setIsSendingPhoneCode] = useState(false);
  const [isVerifyingPhoneCode, setIsVerifyingPhoneCode] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>({ ...defaultPreferences, ...initialPreferences });
  const [status, setStatus] = useState("");
  const passwordsMatch = Boolean(confirmPassword) && newPassword === confirmPassword;

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

  const updatePreference = async (key: keyof Preferences, value: boolean) => {
    const nextPreferences = { ...preferences, [key]: value };
    setPreferences(nextPreferences);
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.auth.updateUser({ data: { market_preferences: nextPreferences } });
    if (error) { setPreferences(preferences); setStatus(error.message); }
  };

  const preferenceToggle = (key: keyof Preferences, label: string) => <label className="profile-preference-toggle" key={key}><input type="checkbox" checked={preferences[key]} onChange={(event) => void updatePreference(key, event.target.checked)} /><span>{label}</span></label>;

  return <>
    <div className="profile-settings-grid profile-settings-grid-refined">
      <div className="profile-main-column">
        <section className="profile-panel profile-photo-panel"><ProfilePhotoUploader initialPath={avatarPath} displayName={displayName} email={email} memberSince={memberSince} nicknameDraft={nicknameDraft} isEditingNickname={isEditingNickname} isSavingNickname={isSavingNickname} onNicknameChange={setNicknameDraft} onEditNickname={() => { setNicknameDraft(displayName); setIsEditingNickname(true); }} onCancelNickname={() => { setNicknameDraft(displayName); setIsEditingNickname(false); }} onSaveNickname={() => void saveNickname()} /></section>
        <section className={`profile-panel profile-security-panel ${isSecurityOpen ? "is-open" : ""}`}>
          <button className="profile-security-toggle" type="button" aria-expanded={isSecurityOpen} onClick={() => setIsSecurityOpen((value) => !value)}><span><i className="fa-solid fa-lock" /> Security</span><i className={`fa-solid fa-chevron-${isSecurityOpen ? "up" : "down"}`} /></button>
          {isSecurityOpen ? <div className="profile-security-content">
            <section className="profile-security-section"><h3>Password</h3><div className="profile-password-grid"><label className="profile-field is-wide"><span>Current Password</span><div className="profile-password-input"><input type={showCurrentPassword ? "text" : "password"} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /><button type="button" aria-label={showCurrentPassword ? "Hide current password" : "Show current password"} onClick={() => setShowCurrentPassword((value) => !value)}><i className={`fa-regular ${showCurrentPassword ? "fa-eye-slash" : "fa-eye"}`} /></button></div></label><label className="profile-field"><span>New Password</span><div className="profile-password-input"><input type={showNewPassword ? "text" : "password"} minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /><button type="button" aria-label={showNewPassword ? "Hide new password" : "Show new password"} onClick={() => setShowNewPassword((value) => !value)}><i className={`fa-regular ${showNewPassword ? "fa-eye-slash" : "fa-eye"}`} /></button></div></label><label className="profile-field"><span>Confirm New Password</span><div className={`profile-password-input ${confirmPassword ? (passwordsMatch ? "is-valid" : "is-invalid") : ""}`}><input type={showConfirmPassword ? "text" : "password"} minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /><button type="button" aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"} onClick={() => setShowConfirmPassword((value) => !value)}><i className={`fa-regular ${showConfirmPassword ? "fa-eye-slash" : "fa-eye"}`} /></button></div></label></div><div className="profile-panel-action"><button className="profile-primary-button" type="button" disabled={isUpdatingPassword} onClick={() => void updatePassword()}>{isUpdatingPassword ? "Updating…" : "Update Password"}</button></div></section>
            <section className="profile-security-section"><div className="profile-panel-title"><h3>Email Address</h3><span><i className="fa-solid fa-circle-check" /> Verified</span></div><label className="profile-field"><input type="email" value={emailDraft} onChange={(event) => setEmailDraft(event.target.value)} /></label><div className="profile-panel-action"><button className="profile-outline-button" type="button" disabled={isUpdatingEmail} onClick={() => void updateEmail()}>{isUpdatingEmail ? "Updating…" : "Change Email"}</button></div></section>
            <section className="profile-security-section"><h3>Phone Number</h3><div className="profile-phone"><span>+64</span><input type="tel" value={phone} placeholder="21 555 0123" onChange={(event) => setPhone(event.target.value)} /></div>{phoneVerificationSent ? <div className="phone-verification"><input inputMode="numeric" maxLength={6} value={phoneOtp} placeholder="6-digit SMS code" onChange={(event) => setPhoneOtp(event.target.value.replace(/\D/g, ""))} /><button className="profile-primary-button" type="button" disabled={isVerifyingPhoneCode} onClick={() => void verifyPhoneCode()}>{isVerifyingPhoneCode ? "Verifying…" : "Verify code"}</button></div> : <button className="profile-outline-button" type="button" disabled={isSendingPhoneCode} onClick={() => void sendPhoneCode()}>{isSendingPhoneCode ? "Sending…" : "Change Phone Number"}</button>}</section>
          </div> : null}
        </section>
      </div>
      <aside className="profile-side-column profile-preferences-column">
        <section className="profile-panel profile-trust-panel"><h2>Trust &amp; Reputation</h2><dl><div><dt>Profile completion</dt><dd><i className="fa-solid fa-battery-three-quarters" /> 35%</dd></div><div><dt>Completed trades</dt><dd>0</dd></div><div><dt>Response time</dt><dd>New</dd></div><div><dt>Response rate</dt><dd>New</dd></div></dl></section>
        <section className="profile-panel"><h2>Contact Preferences</h2><div className="profile-preference-list">{preferenceToggle("allowChat", "Allow chat")}{preferenceToggle("showPhoneNumber", "Show phone number")}{preferenceToggle("emailNotifications", "Receive email notifications")}</div></section>
        <section className="profile-panel"><h2>Notifications</h2><div className="profile-preference-list">{preferenceToggle("newMessages", "New messages")}{preferenceToggle("savedItems", "Saved items")}{preferenceToggle("priceUpdates", "Price updates")}{preferenceToggle("reviews", "Reviews")}</div></section>
      </aside>
    </div>
    {status ? <p className="profile-form-status" role="status">{status}</p> : null}
  </>;
}
