"use client";

import { useState, type CSSProperties } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { ProfilePhotoUploader } from "@/components/dashboard/ProfilePhotoUploader";
import { Button } from "@/components/ui/Button";
import { languageOptions, SupportedLocale, useLanguage } from "@/components/LanguageProvider";
import { descriptionTextScale, MAX_DESCRIPTION_TEXT_SIZE_STEP, TextSizeControls } from "@/components/ui/TextSizeSection";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { ListingLocationSelector } from "@/components/market/ListingLocationSelector";
import { findMainLocation } from "@/lib/market/nz-location";
import type { MainLocation } from "@/data/nzLocations";

type Profile = { display_name: string; phone: string | null; location_mode: "manual" | "current"; region_city: string | null; region_suburb: string | null; main_location: string | null; sub_location: string | null; locality: string | null; raw_suburb: string | null; region: string | null; latitude: number | null; longitude: number | null; preferred_locale: SupportedLocale };

export function ProfileSettingsForm({ email, avatarPath, memberSince, initialProfile, initialDescriptionTextSizeStep }: { email: string; avatarPath?: string | null; memberSince?: string | null; initialProfile: Profile; initialDescriptionTextSizeStep: number }) {
  const router = useRouter();
  const isLegacy = usePathname()?.endsWith("/profile-v0") ?? false;
  const { locale, setLocale, t } = useLanguage();
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
  const [location, setLocation] = useState(() => ({ mainLocation: (findMainLocation(initialProfile.main_location ?? initialProfile.region_city) ?? "") as MainLocation | "", subLocation: initialProfile.sub_location ?? initialProfile.region_suburb ?? "", locality: initialProfile.locality, rawSuburb: initialProfile.raw_suburb, region: initialProfile.region, latitude: initialProfile.latitude, longitude: initialProfile.longitude }));
  const [descriptionTextSizeStep, setDescriptionTextSizeStep] = useState(initialDescriptionTextSizeStep);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneVerificationSent, setPhoneVerificationSent] = useState(false);
  const [isSendingPhoneCode, setIsSendingPhoneCode] = useState(false);
  const [isVerifyingPhoneCode, setIsVerifyingPhoneCode] = useState(false);
  const [status, setStatus] = useState("");
  const [mobileView, setMobileView] = useState<"home" | "identity" | "security" | "notifications" | "privacy" | "display" | "management">("home");
  const [isPasswordEditorOpen, setIsPasswordEditorOpen] = useState(false);
  const [savedSettings, setSavedSettings] = useState(() => ({ displayName: initialProfile.display_name, email, phone: initialProfile.phone ?? "", locationMode: initialProfile.location_mode, location, locale: initialProfile.preferred_locale, descriptionTextSizeStep: initialDescriptionTextSizeStep }));
  const passwordsMatch = Boolean(confirmPassword) && newPassword === confirmPassword;
  const locationLabel = [location.subLocation, location.mainLocation].filter(Boolean).join(", ");
  const legacySwitch = (label: string, checked = false) => <label className="profile-static-switch"><input type="checkbox" aria-label={label} checked={checked} disabled readOnly /><span aria-hidden="true" /></label>;

  const updateLocale = async (nextLocale: SupportedLocale) => {
    setLocale(nextLocale);
    const supabase = createBrowserSupabaseClient();
    if (!supabase) { setStatus(t("languageSaved")); return; }
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { setStatus("Please sign in again."); return; }
    const { error } = await supabase.from("profiles").upsert({ id: userData.user.id, display_name: displayName, preferred_locale: nextLocale });
    if (error) { setStatus(error.message); return; }
    setSavedSettings((current) => ({ ...current, locale: nextLocale }));
    setStatus(t("languageSaved"));
  };

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
    if (!error) { setDisplayName(nickname); setNicknameDraft(nickname); setSavedSettings((current) => ({ ...current, displayName: nickname })); setIsEditingNickname(false); }
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
    const profileValues = { id: userData.user.id, display_name: nickname, phone: phone.trim() || null, location_mode: locationMode, region_city: location.mainLocation || null, region_suburb: location.subLocation || null, latitude: location.latitude, longitude: location.longitude, preferred_locale: locale };
    const { error: categorizedLocationError } = await supabase.from("profiles").upsert({ ...profileValues, main_location: location.mainLocation || null, sub_location: location.subLocation || null, locality: location.locality, raw_suburb: location.rawSuburb, region: location.region });
    const profileError = categorizedLocationError && ["42703", "PGRST204"].includes(categorizedLocationError.code)
      ? (await supabase.from("profiles").upsert(profileValues)).error
      : categorizedLocationError;
    if (profileError) { setStatus(profileError.message); setIsSavingAll(false); return; }
    const authUpdate = nextEmail === savedSettings.email
      ? { data: { full_name: nickname, listing_description_text_step: descriptionTextSizeStep } }
      : { email: nextEmail, data: { full_name: nickname, listing_description_text_step: descriptionTextSizeStep } };
    const { error: authError } = await supabase.auth.updateUser(authUpdate);
    if (authError) { setStatus(authError.message); setIsSavingAll(false); return; }
    setDisplayName(nickname); setNicknameDraft(nickname); setIsEditingNickname(false);
    setSavedSettings({ displayName: nickname, email: nextEmail, phone, locationMode, location, locale, descriptionTextSizeStep });
    setStatus(nextEmail === savedSettings.email ? "Settings saved." : "Settings saved. Confirm the email change from your inbox.");
    setIsSavingAll(false);
    router.refresh();
  };

  const discardSettings = () => {
    setDisplayName(savedSettings.displayName); setNicknameDraft(savedSettings.displayName); setEmailDraft(savedSettings.email); setPhone(savedSettings.phone);
    setLocationMode(savedSettings.locationMode); setLocation(savedSettings.location); setLocale(savedSettings.locale); setDescriptionTextSizeStep(savedSettings.descriptionTextSizeStep);
    setIsEditingNickname(false); setStatus("Changes discarded.");
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

  if (!isLegacy) return <div className="profile-settings-current" data-mobile-view={mobileView}>
    <header className="profile-settings-intro">
      <Link href="/market/dashboard/my-page" className="my-page-link"><i className="ms ms-arrow-back" aria-hidden="true" />{locale === "ko" ? "마이페이지" : "My Page"}</Link>
      <div className="profile-current-title-row">
        <h1><span className="profile-current-desktop-title">{locale === "ko" ? "프로필 설정" : "Profile settings"}</span><span className="profile-current-mobile-title">{mobileView === "home" ? (locale === "ko" ? "프로필 설정" : "Profile settings") : mobileView === "identity" ? (locale === "ko" ? "내 정보 수정" : "Edit my details") : ({ security: locale === "ko" ? "인증 및 보안" : "Security", notifications: locale === "ko" ? "알림" : "Notifications", privacy: locale === "ko" ? "공개 설정" : "Privacy", display: locale === "ko" ? "언어 및 화면" : "Language & display", management: locale === "ko" ? "계정 관리" : "Account management" } as Record<string, string>)[mobileView]}</span></h1>
        {mobileView !== "home" ? <Button variant="ghost" size="sm" className="profile-current-mobile-back" onClick={() => setMobileView("home")}>{locale === "ko" ? "설정 목록" : "All settings"}</Button> : null}
      </div>
      <p>{locale === "ko" ? "내 정보와 알림, 공개 설정을 간단하게 관리하세요." : "Keep your details and settings in one place."}</p>
    </header>

    <section className="ui-panel profile-current-hero" aria-label={locale === "ko" ? "내 프로필" : "My profile"}>
      <ProfilePhotoUploader initialPath={avatarPath} displayName={displayName} email={email} memberSince={memberSince} locationLabel={locationLabel || null} />
      <Button variant="secondary" className="profile-current-edit-action" onClick={() => { setMobileView("identity"); setIsAccountOpen(true); requestAnimationFrame(() => document.getElementById("profile-current-identity")?.scrollIntoView({ behavior: "smooth", block: "start" })); }}>{locale === "ko" ? "정보 수정" : "Edit details"}</Button>
    </section>

    <nav className="profile-current-mobile-menu" aria-label={locale === "ko" ? "프로필 설정 메뉴" : "Profile settings menu"}>
      {[
        { key: "security", icon: "ms-lock", title: locale === "ko" ? "인증 및 보안" : "Security", detail: locale === "ko" ? "이메일, 전화번호, 비밀번호" : "Email, phone, password" },
        { key: "notifications", icon: "ms-notifications", title: locale === "ko" ? "알림" : "Notifications", detail: locale === "ko" ? "채팅, 거래, 이메일, 문자" : "Messages, trades, email, SMS" },
        { key: "privacy", icon: "ms-visibility", title: locale === "ko" ? "공개 설정" : "Privacy", detail: locale === "ko" ? "채팅 허용, 전화번호 공개" : "Chat and phone visibility" },
        { key: "display", icon: "ms-language", title: locale === "ko" ? "언어 및 화면" : "Language & display", detail: locale === "ko" ? "언어, 글자 크기" : "Language and text size" },
        { key: "management", icon: "ms-settings", title: locale === "ko" ? "계정 관리" : "Account management", detail: locale === "ko" ? "계정 관리 안내" : "Account information" },
      ].map((item) => <button key={item.key} type="button" onClick={() => setMobileView(item.key as typeof mobileView)}><i className={`ms ${item.icon}`} aria-hidden="true" /><span><strong>{item.title}</strong><small>{item.detail}</small></span><i className="ms ms-arrow-forward" aria-hidden="true" /></button>)}
    </nav>

    <div className="profile-current-grid">
      <div className="profile-current-column">
        <section id="profile-current-identity" className="ui-panel profile-current-card profile-current-identity">
          <header className="profile-current-card-heading"><i className="ms ms-person" aria-hidden="true" /><h2>{locale === "ko" ? "내 정보" : "My details"}</h2></header>
          <label className="profile-current-field"><span>{locale === "ko" ? "이름 또는 닉네임" : "Name or nickname"} <em>*</em></span><input className="ui-input" maxLength={40} value={nicknameDraft} onChange={(event) => setNicknameDraft(event.target.value)} autoComplete="nickname" /><small>{locale === "ko" ? "다른 이웃에게 표시되는 이름이에요." : "The name other neighbours will see."}</small></label>
          <div className="profile-current-field"><span>{locale === "ko" ? "지역" : "Location"} <em>*</em></span><ListingLocationSelector value={location} labels={locale === "ko" ? { main: "주요 지역", mainPlaceholder: "지역 선택", sub: "세부 지역", subPlaceholder: "세부 지역 선택" } : undefined} onChange={(nextLocation) => { setLocation(nextLocation); setLocationMode(nextLocation.latitude === null ? "manual" : "current"); }} /><small>{locale === "ko" ? "가까운 이웃과 연결하는 데 사용해요. 상세 주소는 표시하지 않습니다." : "Used to connect with nearby neighbours. Your exact address is not shown."}</small></div>
        </section>
        <section className="ui-panel profile-current-card profile-current-privacy">
          <header className="profile-current-card-heading"><i className="ms ms-visibility" aria-hidden="true" /><h2>{locale === "ko" ? "공개 설정" : "Privacy"}</h2></header>
          <div className="profile-current-setting-row"><i className="ms ms-chat" aria-hidden="true" /><span>{locale === "ko" ? "채팅 허용" : "Allow chat"}</span>{legacySwitch(locale === "ko" ? "채팅 허용: 준비 중" : "Allow chat: unavailable")}</div>
          <div className="profile-current-setting-row"><i className="ms ms-call" aria-hidden="true" /><span>{locale === "ko" ? "전화번호 공개" : "Show phone number"}</span>{legacySwitch(locale === "ko" ? "전화번호 공개: 준비 중" : "Show phone number: unavailable")}</div>
          <p className="profile-current-unavailable">{locale === "ko" ? "공개 설정은 아직 계정에 연결되지 않아 변경할 수 없습니다." : "Privacy controls are not connected to your account yet."}</p>
        </section>
      </div>

      <div className="profile-current-column">
        <section className="ui-panel profile-current-card profile-current-security">
          <header className="profile-current-card-heading"><i className="ms ms-lock" aria-hidden="true" /><h2>{locale === "ko" ? "인증 및 보안" : "Verification & security"}</h2></header>
          <div className="profile-current-contact-row"><i className="ms ms-call" aria-hidden="true" /><div><label htmlFor="profile-current-phone">{locale === "ko" ? "전화번호" : "Phone"}</label><input id="profile-current-phone" className="ui-input" type="tel" autoComplete="tel" value={phone} placeholder="021 555 0123" onChange={(event) => setPhone(event.target.value)} /></div><Button variant="secondary" size="sm" disabled={isSendingPhoneCode} onClick={() => void sendPhoneCode()}>{isSendingPhoneCode ? t("saving") : t("verify")}</Button></div>
          {phoneVerificationSent ? <div className="profile-current-otp"><label htmlFor="profile-current-otp">{locale === "ko" ? "문자로 받은 6자리 코드" : "6-digit SMS code"}</label><input id="profile-current-otp" className="ui-input" inputMode="numeric" maxLength={6} value={phoneOtp} onChange={(event) => setPhoneOtp(event.target.value.replace(/\D/g, ""))} /><Button variant="primary" size="sm" disabled={isVerifyingPhoneCode} onClick={() => void verifyPhoneCode()}>{t("verify")}</Button></div> : null}
          <div className="profile-current-contact-row"><i className="ms ms-email" aria-hidden="true" /><div><label htmlFor="profile-current-email">{locale === "ko" ? "이메일" : "Email"}</label><input id="profile-current-email" className="ui-input" type="email" autoComplete="email" value={emailDraft} onChange={(event) => setEmailDraft(event.target.value)} /></div><Button variant="secondary" size="sm" disabled={isUpdatingEmail} onClick={() => void updateEmail()}>{isUpdatingEmail ? t("saving") : t("update")}</Button></div>
          <div className="profile-current-password-row"><i className="ms ms-lock" aria-hidden="true" /><span>{locale === "ko" ? "비밀번호" : "Password"}</span><Button variant="ghost" size="sm" aria-expanded={isPasswordEditorOpen} onClick={() => setIsPasswordEditorOpen((open) => !open)}>{isPasswordEditorOpen ? (locale === "ko" ? "접기" : "Close") : (locale === "ko" ? "변경" : "Change")}</Button></div>
          {isPasswordEditorOpen ? <div className="profile-current-password-fields">
            <div><label htmlFor="profile-current-password">{locale === "ko" ? "현재 비밀번호" : "Current password"}</label><input id="profile-current-password" className="ui-input" type={showCurrentPassword ? "text" : "password"} autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /><button type="button" aria-label={locale === "ko" ? "현재 비밀번호 표시 전환" : "Toggle current password visibility"} onClick={() => setShowCurrentPassword((value) => !value)}>{showCurrentPassword ? (locale === "ko" ? "숨기기" : "Hide") : (locale === "ko" ? "보기" : "Show")}</button></div>
            <div><label htmlFor="profile-current-new-password">{locale === "ko" ? "새 비밀번호 · 8자 이상" : "New password · 8+ characters"}</label><input id="profile-current-new-password" className="ui-input" type={showNewPassword ? "text" : "password"} autoComplete="new-password" minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /><button type="button" aria-label={locale === "ko" ? "새 비밀번호 표시 전환" : "Toggle new password visibility"} onClick={() => setShowNewPassword((value) => !value)}>{showNewPassword ? (locale === "ko" ? "숨기기" : "Hide") : (locale === "ko" ? "보기" : "Show")}</button></div>
            <div><label htmlFor="profile-current-confirm-password">{locale === "ko" ? "새 비밀번호 확인" : "Confirm new password"}</label><input id="profile-current-confirm-password" className="ui-input" type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /><button type="button" aria-label={locale === "ko" ? "비밀번호 확인 표시 전환" : "Toggle confirmation visibility"} onClick={() => setShowConfirmPassword((value) => !value)}>{showConfirmPassword ? (locale === "ko" ? "숨기기" : "Hide") : (locale === "ko" ? "보기" : "Show")}</button></div>
            {confirmPassword && !passwordsMatch ? <p role="alert">{locale === "ko" ? "새 비밀번호가 일치하지 않습니다." : "New passwords do not match."}</p> : null}
            <Button variant="primary" disabled={isUpdatingPassword || !passwordsMatch} onClick={() => void updatePassword()}>{isUpdatingPassword ? t("saving") : (locale === "ko" ? "비밀번호 변경" : "Update password")}</Button>
          </div> : null}
        </section>
        <section className="ui-panel profile-current-card profile-current-notifications">
          <header className="profile-current-card-heading"><i className="ms ms-notifications" aria-hidden="true" /><h2>{locale === "ko" ? "알림" : "Notifications"}</h2></header>
          {[["ms-chat", locale === "ko" ? "채팅 메시지" : "Chat messages"], ["ms-notifications", locale === "ko" ? "가격 업데이트" : "Price updates"], ["ms-email", locale === "ko" ? "이메일 알림" : "Email alerts"], ["ms-call", locale === "ko" ? "문자(SMS) 알림" : "SMS alerts"], ["ms-star", locale === "ko" ? "후기 알림" : "Review alerts"]].map(([icon, label]) => <div className="profile-current-setting-row" key={label}><i className={`ms ${icon}`} aria-hidden="true" /><span>{label}</span>{legacySwitch(`${label}: ${locale === "ko" ? "준비 중" : "unavailable"}`)}</div>)}
          <p className="profile-current-unavailable">{locale === "ko" ? "알림 수신 설정은 준비 중입니다. 현재 알림 동작에는 영향을 주지 않습니다." : "Notification preferences are not available yet and do not change delivery."}</p>
        </section>
        <section className="ui-panel profile-current-card profile-current-display">
          <header className="profile-current-card-heading"><i className="ms ms-language" aria-hidden="true" /><h2>{locale === "ko" ? "언어 및 화면" : "Language & display"}</h2></header>
          <label className="profile-current-field"><span>{locale === "ko" ? "표시 언어" : "Display language"}</span><select className="ui-input" value={locale} onChange={(event) => void updateLocale(event.target.value as SupportedLocale)}>{languageOptions.map((option) => <option key={option.code} value={option.code}>{option.flag} {option.label} ({option.nativeLabel})</option>)}</select><small>{locale === "ko" ? "언어 선택은 바로 적용됩니다." : "Language changes apply immediately."}</small></label>
          <div className="profile-current-text-size"><span>{locale === "ko" ? "상품 설명 글자 크기" : "Listing description text size"}</span><TextSizeControls value={descriptionTextSizeStep} label={locale === "ko" ? "상품 설명 글자 크기" : "Listing description text size"} onChange={(change) => setDescriptionTextSizeStep((value) => Math.min(MAX_DESCRIPTION_TEXT_SIZE_STEP, Math.max(0, value + change)))} /></div>
        </section>
      </div>
    </div>
    <section className="ui-panel profile-current-management"><header className="profile-current-card-heading"><i className="ms ms-settings" aria-hidden="true" /><h2>{locale === "ko" ? "계정 관리" : "Account management"}</h2></header><p>{locale === "ko" ? "계정 비활성화·탈퇴 기능은 아직 준비 중입니다. 계정 관련 도움이 필요하면 고객지원에 문의해 주세요." : "Account deactivation and deletion are not available here yet. Contact support if you need account help."}</p></section>
    <div className="profile-current-actions"><Button variant="secondary" disabled={isSavingAll} onClick={discardSettings}>{t("discard")}</Button><Button variant="primary" disabled={isSavingAll} onClick={() => void saveAllSettings()}>{isSavingAll ? t("saving") : t("saveChanges")}</Button></div>
    {status ? <p className="profile-form-status" role="status">{status}</p> : null}
  </div>;

  return <>
    {isLegacy ? <header className="profile-v0-note"><div><h1>{locale === "ko" ? "프로필 설정 V0" : "Profile Settings V0"}</h1><p role="note">{locale === "ko" ? "이전 디자인 비교용입니다. 아래 알림·공개 스위치는 실제 계정 설정에 적용되지 않아 사용할 수 없습니다." : "Previous design for comparison. The notification and visibility switches below do not affect your account and are disabled."}</p></div><Link className="ui-button ui-button--secondary ui-button--sm" href="/market/dashboard/profile">{locale === "ko" ? "현재 버전 보기" : "View current version"}</Link></header> : null}
    {!isLegacy ? <>
    <header className="profile-settings-intro"><Link href="/market/dashboard/my-page" className="my-page-link"><i className="ms ms-arrow-back" aria-hidden="true" />{locale === "ko" ? "마이페이지" : "My Page"}</Link><h1>{locale === "ko" ? "프로필 설정" : "Profile settings"}</h1><p>{locale === "ko" ? "내 정보와 보안을 한곳에서 관리하세요." : "Keep your account details and security up to date."}</p></header>
    <nav className="profile-settings-jump" aria-label={locale === "ko" ? "설정 바로가기" : "Settings shortcuts"}>
      <a href="#profile-account" onClick={() => setIsAccountOpen(true)}>{locale === "ko" ? "내 정보" : "Account"}</a>
      <a href="#profile-location" onClick={() => setIsLocationOpen(true)}>{locale === "ko" ? "지역" : "Location"}</a>
      <a href="#profile-security" onClick={() => setIsSecurityOpen(true)}>{locale === "ko" ? "보안" : "Security"}</a>
      <a href="#profile-display">{locale === "ko" ? "화면" : "Display"}</a>
    </nav>
    </> : null}
    <div className="profile-settings-grid profile-settings-grid-refined">
      <div className="profile-main-column">
        <section className="profile-panel profile-photo-panel"><ProfilePhotoUploader initialPath={avatarPath} displayName={displayName} email={email} memberSince={memberSince} locationLabel={locationLabel || null} /></section>
        <section className="profile-panel profile-language-panel">
          <header className="profile-section-heading"><i className="ms ms-language" aria-hidden="true" /><h2>{t("languageSettings")}</h2></header>
          <label className="profile-language-select"><span>{t("displayLanguage")}</span><select value={locale} onChange={(event) => void updateLocale(event.target.value as SupportedLocale)}>{languageOptions.map((option) => <option key={option.code} value={option.code}>{option.flag} {option.label} ({option.nativeLabel})</option>)}</select></label>
          <p>{t("supportedNow")}</p>
        </section>
        <section id="profile-account" className={`profile-panel profile-account-panel ${isAccountOpen ? "is-open" : ""}`}>
          <button className="profile-section-toggle" type="button" aria-expanded={isAccountOpen} onClick={() => setIsAccountOpen((value) => !value)}><span><i className="ms ms-person" aria-hidden="true" /> {t("account")}</span><i className={`icon icon-expand-${isAccountOpen ? "less" : "more"}`} aria-hidden="true" /></button>
          {isAccountOpen ? <div className="profile-account-content"><div className="profile-account-fields">
            <div className="profile-account-field"><span>{t("nickname")}</span>{isEditingNickname ? <form className="profile-account-nickname-form" onSubmit={(event) => { event.preventDefault(); void saveNickname(); }}><input aria-label={t("nickname")} autoFocus maxLength={40} value={nicknameDraft} onChange={(event) => setNicknameDraft(event.target.value)} /><button className="profile-primary-button" type="submit" disabled={isSavingNickname}>{isSavingNickname ? t("saving") : t("save")}</button><button className="profile-inline-button" type="button" disabled={isSavingNickname} onClick={() => { setNicknameDraft(displayName); setIsEditingNickname(false); }}>{t("cancel")}</button></form> : <div className="profile-account-value"><strong>{displayName}</strong><button type="button" aria-label="Edit nickname" onClick={() => { setNicknameDraft(displayName); setIsEditingNickname(true); }}><i className="ms ms-edit" aria-hidden="true" /></button></div>}</div>
            <div className="profile-account-field"><span>{t("emailAddress")}</span><div className="profile-account-action"><input type="email" value={emailDraft} onChange={(event) => setEmailDraft(event.target.value)} /><button className="profile-outline-button" type="button" disabled={isUpdatingEmail} onClick={() => void updateEmail()}>{isUpdatingEmail ? t("saving") : t("update")}</button></div></div>
            <div className="profile-account-field"><span>{t("phoneNumber")}</span><div className="profile-account-action"><div className="profile-phone"><span>+64</span><input type="tel" value={phone} placeholder="21 555 0123" onChange={(event) => setPhone(event.target.value)} /></div>{phoneVerificationSent ? <div className="phone-verification"><input inputMode="numeric" maxLength={6} value={phoneOtp} placeholder="6-digit SMS code" onChange={(event) => setPhoneOtp(event.target.value.replace(/\D/g, ""))} /><button className="profile-primary-button" type="button" disabled={isVerifyingPhoneCode} onClick={() => void verifyPhoneCode()}>{isVerifyingPhoneCode ? t("saving") : t("verify")}</button></div> : <button className="profile-outline-button" type="button" disabled={isSendingPhoneCode} onClick={() => void sendPhoneCode()}>{isSendingPhoneCode ? t("saving") : t("verify")}</button>}</div></div>
          </div></div> : null}
        </section>
        <section id="profile-security" className={`profile-panel profile-security-panel ${isSecurityOpen ? "is-open" : ""}`}>
          <button className="profile-security-toggle" type="button" aria-expanded={isSecurityOpen} onClick={() => setIsSecurityOpen((value) => !value)}><span><i className="ms ms-lock" /> {t("security")}</span><i className={`icon icon-expand-${isSecurityOpen ? "less" : "more"}`} /></button>
          {isSecurityOpen ? <div className="profile-security-content">
            <section className="profile-security-section"><h3>Password</h3><div className="profile-password-grid"><label className="profile-field is-wide"><span>Current Password</span><div className="profile-password-input"><input type={showCurrentPassword ? "text" : "password"} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /><button type="button" aria-label={showCurrentPassword ? "Hide current password" : "Show current password"} onClick={() => setShowCurrentPassword((value) => !value)}><i className={`ms ${showCurrentPassword ? "ms-visibility-off" : "ms-visibility"}`} /></button></div></label><label className="profile-field"><span>New Password</span><div className="profile-password-input"><input type={showNewPassword ? "text" : "password"} minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /><button type="button" aria-label={showNewPassword ? "Hide new password" : "Show new password"} onClick={() => setShowNewPassword((value) => !value)}><i className={`ms ${showNewPassword ? "ms-visibility-off" : "ms-visibility"}`} /></button></div></label><label className="profile-field"><span>Confirm New Password</span><div className={`profile-password-input ${confirmPassword ? (passwordsMatch ? "is-valid" : "is-invalid") : ""}`}><input type={showConfirmPassword ? "text" : "password"} minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /><button type="button" aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"} onClick={() => setShowConfirmPassword((value) => !value)}><i className={`ms ${showConfirmPassword ? "ms-visibility-off" : "ms-visibility"}`} /></button></div></label></div><div className="profile-panel-action"><button className="profile-primary-button" type="button" disabled={isUpdatingPassword} onClick={() => void updatePassword()}>{isUpdatingPassword ? "Updating…" : "Update Password"}</button></div></section>
            <section className="profile-security-section"><div className="profile-panel-title"><h3>Email Address</h3><span><i className="ms ms-check-circle" /> Verified</span></div><label className="profile-field"><input type="email" value={emailDraft} onChange={(event) => setEmailDraft(event.target.value)} /></label><div className="profile-panel-action"><button className="profile-outline-button" type="button" disabled={isUpdatingEmail} onClick={() => void updateEmail()}>{isUpdatingEmail ? "Updating…" : "Change Email"}</button></div></section>
            <section className="profile-security-section"><h3>Phone Number</h3><div className="profile-phone"><span>+64</span><input type="tel" value={phone} placeholder="21 555 0123" onChange={(event) => setPhone(event.target.value)} /></div>{phoneVerificationSent ? <div className="phone-verification"><input inputMode="numeric" maxLength={6} value={phoneOtp} placeholder="6-digit SMS code" onChange={(event) => setPhoneOtp(event.target.value.replace(/\D/g, ""))} /><button className="profile-primary-button" type="button" disabled={isVerifyingPhoneCode} onClick={() => void verifyPhoneCode()}>{isVerifyingPhoneCode ? "Verifying…" : "Verify code"}</button></div> : <button className="profile-outline-button" type="button" disabled={isSendingPhoneCode} onClick={() => void sendPhoneCode()}>{isSendingPhoneCode ? "Sending…" : "Change Phone Number"}</button>}</section>
          </div> : null}
        </section>
      </div>
      <aside className="profile-static-preferences">
        {isLegacy ? <>
          <section className="profile-panel profile-static-preference-panel"><header className="profile-section-heading"><i className="ms ms-notifications" aria-hidden="true" /><h2>{t("contactPreferences")}</h2></header><div className="profile-static-setting-list"><div><strong>{t("allowChat")}</strong>{legacySwitch(t("allowChat"), true)}</div><div><strong>{t("showPhoneNumber")}</strong>{legacySwitch(t("showPhoneNumber"))}</div><div><strong>{t("receiveEmailNotifications")}</strong>{legacySwitch(t("receiveEmailNotifications"), true)}</div></div></section>
          <section className="profile-panel profile-static-preference-panel"><header className="profile-section-heading"><i className="ms ms-notifications" aria-hidden="true" /><h2>{t("notifications")}</h2></header><div className="profile-static-setting-list"><div><p><strong>{t("chatMessages")}</strong><small>{t("inAppNotifications")}</small></p>{legacySwitch(t("chatMessages"), true)}</div><div><p><strong>{t("priceUpdates")}</strong><small>{t("weeklyNewsletter")}</small></p>{legacySwitch(t("priceUpdates"))}</div><div><p><strong>{t("smsAlerts")}</strong><small>{t("criticalAlerts")}</small></p>{legacySwitch(t("smsAlerts"), true)}</div><div><p><strong>{t("reviews")}</strong><small>{t("criticalAlerts")}</small></p>{legacySwitch(t("reviews"), true)}</div></div></section>
        </> : <section className="ui-panel profile-panel profile-preferences-notice"><header className="profile-section-heading"><i className="ms ms-notifications" aria-hidden="true" /><h2>{locale === "ko" ? "알림과 공개 설정" : "Notifications & privacy"}</h2></header><p>{locale === "ko" ? "알림 수신과 연락처 공개 설정은 아직 계정에 연결되지 않았습니다. 실제로 적용되는 설정이 준비되면 이곳에서 관리할 수 있어요." : "Notification delivery and contact visibility are not connected to your account yet. You can manage them here when account-level settings are available."}</p></section>}
      </aside>
    </div>
    <section id="profile-display" className="profile-panel profile-description-text-size-panel">
      <header className="profile-section-heading"><i className="ms ms-format-size" aria-hidden="true" /><h2>Listing description text size</h2></header>
      <p className="profile-description-text-size-help">Set a comfortable size for every listing description. Save changes to apply it across Tada.</p>
      <div className="profile-description-text-size-preview">
        <div>
          <span>Preview · {Math.round(descriptionTextScale(descriptionTextSizeStep) * 100)}%</span>
          <p style={{ "--text-scale": descriptionTextScale(descriptionTextSizeStep) } as CSSProperties}>This is how description content will appear on every listing.</p>
        </div>
        <TextSizeControls
          value={descriptionTextSizeStep}
          label="Listing description text size"
          onChange={(change) => setDescriptionTextSizeStep((value) => Math.min(MAX_DESCRIPTION_TEXT_SIZE_STEP, Math.max(0, value + change)))}
        />
      </div>
    </section>
    <section id="profile-location" className={`profile-panel profile-location-privacy-panel ${isLocationOpen ? "is-open" : ""}`}>
      <button className="profile-section-toggle" type="button" aria-expanded={isLocationOpen} onClick={() => setIsLocationOpen((value) => !value)}><span><i className="ms ms-location-on" aria-hidden="true" /> {t("locationPrivacy")}</span><i className={`icon icon-expand-${isLocationOpen ? "less" : "more"}`} aria-hidden="true" /></button>
      {isLocationOpen ? <>
      <div className="profile-location-access"><div><strong>{t("locationAccess")}</strong><span>{locationMode === "current" ? t("usingCurrentLocation") : t("setManually")}</span></div></div>
      <ListingLocationSelector value={location} onChange={(nextLocation) => { setLocation(nextLocation); setLocationMode(nextLocation.latitude === null ? "manual" : "current"); }} />
      <div className="profile-location-privacy-note"><i className="ms ms-info" aria-hidden="true" /><p>{t("locationPrivacyNote")}</p></div>
      </> : null}
    </section>
    <div className="profile-settings-actions"><button className="profile-discard-button" type="button" disabled={isSavingAll} onClick={discardSettings}>{t("discard")}</button><button className="profile-primary-button" type="button" disabled={isSavingAll} onClick={() => void saveAllSettings()}>{isSavingAll ? t("saving") : t("saveChanges")}</button></div>
    {status ? <p className="profile-form-status" role="status">{status}</p> : null}
  </>;
}
