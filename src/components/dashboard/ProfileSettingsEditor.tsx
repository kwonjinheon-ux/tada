"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { DialogOverlay } from "@/components/ui/DialogOverlay";
import { TextSizePreferencePreview, MAX_DESCRIPTION_TEXT_SIZE_STEP, descriptionTextScale } from "@/components/ui/TextSizeSection";
import { ListingLocationSelector } from "@/components/market/ListingLocationSelector";
import { ProfileIdentitySummary } from "@/components/dashboard/ProfileIdentitySummary";
import { ProfilePhotoUploader, persistProfilePhoto, type ProfilePhotoDraft } from "@/components/dashboard/ProfilePhotoUploader";
import type { ProfileSettingsProps, ProfileVisibility } from "@/components/dashboard/ProfileSettingsForm";
import { useLanguage, languageOptions, type SupportedLocale } from "@/components/LanguageProvider";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { findMainLocation } from "@/lib/market/nz-location";
import type { MainLocation } from "@/data/nzLocations";

type Section = "identity" | "security" | "privacy" | "display" | "management";
type Feedback = { text: string; error: boolean };
type SecurityEditor = "phone" | "email" | "password" | null;
const PHOTO_INPUT_ID = "profile-settings-photo-input";

function SettingsSection({ id, title, icon, summary, open, pinned, onToggle, children }: {
  id: Section; title: string; icon: string; summary?: string; open: boolean; pinned?: boolean;
  onToggle: () => void; children: ReactNode;
}) {
  return <section className={`ui-panel profile-editor-section${pinned ? " is-pinned" : ""}`}>
    <h2><Button variant="ghost" className="profile-editor-section-toggle" aria-expanded={open} aria-controls={`profile-editor-${id}`} aria-disabled={pinned || undefined} onClick={() => { if (!pinned) onToggle(); }}>
      <i className={`ms ${icon}`} aria-hidden="true" /><span>{title}</span>
      {!open && summary ? <small>{summary}</small> : null}
      {!pinned ? <i className={`ms ${open ? "ms-expand-less" : "ms-expand-more"}`} aria-hidden="true" /> : null}
    </Button></h2>
    <div id={`profile-editor-${id}`} className="profile-editor-section-body" hidden={!open}>{children}</div>
  </section>;
}

export function ProfileSettingsEditor({ email, emailVerified, initialVerifiedPhone, completedTradeCount, avatarPath, avatarUrl, memberSince, initialProfile, initialDescriptionTextSizeStep, userId, hasPassword = true, initialPendingEmail, profileVisibilityAvailable = true }: ProfileSettingsProps) {
  const router = useRouter();
  const { locale, setLocale, t } = useLanguage();
  const ko = locale === "ko";
  const say = (en: string, kr: string) => ko ? kr : en;
  const initialLocation = { mainLocation: (findMainLocation(initialProfile.main_location ?? initialProfile.region_city) ?? "") as MainLocation | "", subLocation: initialProfile.sub_location ?? initialProfile.region_suburb ?? "", locality: initialProfile.locality, rawSuburb: initialProfile.raw_suburb, region: initialProfile.region, latitude: initialProfile.latitude, longitude: initialProfile.longitude };
  const [name, setName] = useState(initialProfile.display_name);
  const [location, setLocation] = useState(initialLocation);
  const [visibility, setVisibility] = useState<ProfileVisibility>(initialProfile.profile_visibility);
  const [textStep, setTextStep] = useState(initialDescriptionTextSizeStep);
  const [snapshot, setSnapshot] = useState({ name: initialProfile.display_name, location: initialLocation, visibility: initialProfile.profile_visibility, textStep: initialDescriptionTextSizeStep });
  const [photoDraft, setPhotoDraft] = useState<ProfilePhotoDraft | null>(null);
  const [savedAvatar, setSavedAvatar] = useState(avatarUrl ?? null);
  const [expanded, setExpanded] = useState<Section | null>("identity");
  const [desktop, setDesktop] = useState(false);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [saving, setSaving] = useState(false);
  const [localeSaving, setLocaleSaving] = useState(false);
  const [feedback, setFeedback] = useState<Partial<Record<"profile" | "security" | "display" | "management", Feedback>>>({});
  const [fieldError, setFieldError] = useState<"name" | "location" | null>(null);
  const [securityEditor, setSecurityEditor] = useState<SecurityEditor>(null);
  const [emailDraft, setEmailDraft] = useState(email);
  const [pendingEmail, setPendingEmail] = useState(initialPendingEmail ?? "");
  const [phone, setPhone] = useState(initialVerifiedPhone || initialProfile.phone || "");
  const [verifiedPhone, setVerifiedPhone] = useState(initialVerifiedPhone);
  const [sentPhone, setSentPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [resendSeconds, setResendSeconds] = useState(0);
  const [securityBusy, setSecurityBusy] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [exitAction, setExitAction] = useState<"logout" | "back" | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const exitDialogRef = useRef<HTMLElement>(null);
  const normalisePhone = (value: string) => { const digits = value.replace(/\D/g, ""); return digits ? `+${digits.startsWith("64") ? digits : `64${digits.replace(/^0/, "")}`}` : ""; };
  const phoneVerified = Boolean(verifiedPhone && normalisePhone(phone) === normalisePhone(verifiedPhone));
  const displayedPhone = verifiedPhone || initialProfile.phone || "";
  const locationLabel = [location.subLocation, location.mainLocation].filter(Boolean).join(", ");
  const dirty = Boolean(photoDraft) || name !== snapshot.name || JSON.stringify(location) !== JSON.stringify(snapshot.location) || visibility !== snapshot.visibility || textStep !== snapshot.textStep;
  const busy = saving || securityBusy || localeSaving || loggingOut;
  // Match the saved profile checks on My Page; unsaved edits do not inflate this value.
  const profileProgress = Math.round([Boolean(snapshot.name.trim() && (savedAvatar || avatarPath)), Boolean(verifiedPhone), Boolean(snapshot.location.mainLocation || snapshot.location.subLocation)].filter(Boolean).length / 3 * 100);
  const visibilityLabel = visibility === "members" ? say("Tada members", "타다 회원만") : visibility === "trade_partners" ? say("Confirmed trade partners", "거래가 확정된 상대만") : say("Everyone", "전체 공개");
  const message = (section: keyof typeof feedback, text: string, error = false) => setFeedback((current) => ({ ...current, [section]: { text, error } }));
  const notice = (section: keyof typeof feedback) => feedback[section] ? <p id={`profile-editor-feedback-${section}`} className={`profile-editor-feedback${feedback[section]?.error ? " is-error" : ""}`} role={feedback[section]?.error ? "alert" : "status"}>{feedback[section]?.text}</p> : null;

  useEffect(() => { const query = window.matchMedia("(min-width: 1024px)"); const sync = () => setDesktop(query.matches); sync(); query.addEventListener("change", sync); return () => query.removeEventListener("change", sync); }, []);
  useEffect(() => { const viewport = window.visualViewport; const sync = () => setKeyboardInset(viewport ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop) : 0); viewport?.addEventListener("resize", sync); viewport?.addEventListener("scroll", sync); return () => { viewport?.removeEventListener("resize", sync); viewport?.removeEventListener("scroll", sync); }; }, []);
  useEffect(() => () => { if (photoDraft) URL.revokeObjectURL(photoDraft.url); }, [photoDraft]);
  useEffect(() => { if (!dirty) return; const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); }; window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn); }, [dirty]);
  useEffect(() => { if (!resendSeconds) return; const timer = window.setTimeout(() => setResendSeconds((current) => current - 1), 1000); return () => window.clearTimeout(timer); }, [resendSeconds]);
  useEffect(() => {
    if (!exitAction) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loggingOut) setExitAction(null);
      if (event.key !== "Tab") return;
      const buttons = exitDialogRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
      if (!buttons?.length) return;
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", close);
    return () => { document.body.style.overflow = overflow; window.removeEventListener("keydown", close); previous?.focus(); };
  }, [exitAction, loggingOut]);

  const toggle = (section: Section) => setExpanded((current) => current === section ? null : section);
  const authErrorText = (error: unknown, fallback: string) => {
    if (ko && typeof error === "object" && error && "code" in error) {
      const messages: Record<string, string> = { otp_expired: "인증 코드가 만료됐거나 올바르지 않습니다. 코드를 확인하거나 다시 받아 주세요.", over_sms_send_rate_limit: "인증 코드를 너무 자주 요청했습니다. 잠시 후 다시 시도해 주세요.", over_email_send_rate_limit: "메일을 너무 자주 요청했습니다. 잠시 후 다시 시도해 주세요.", phone_exists: "다른 계정에서 사용 중인 전화번호입니다.", email_exists: "다른 계정에서 사용 중인 이메일입니다.", invalid_credentials: "현재 로그인 정보 또는 비밀번호가 올바르지 않습니다.", same_password: "기존 비밀번호와 다른 새 비밀번호를 입력해 주세요.", weak_password: "더 안전한 비밀번호를 입력해 주세요.", reauthentication_needed: "보안을 위해 다시 로그인한 뒤 변경해 주세요." };
      if (messages[String(error.code)]) return messages[String(error.code)];
    }
    return error instanceof Error ? error.message : fallback;
  };
  const isOpen = (section: Section) => (desktop && (section === "identity" || section === "security")) || expanded === section;
  const requireClient = () => {
    const client = createBrowserSupabaseClient();
    if (!client) throw new Error(say("Account settings are temporarily unavailable. Please try again later.", "현재 계정 설정을 이용할 수 없습니다. 잠시 후 다시 시도해 주세요."));
    return client;
  };
  const authenticatedUser = async () => {
    const client = requireClient();
    const { data, error } = await client.auth.getUser();
    if (error || !data.user || (userId && data.user.id !== userId)) throw new Error(say("Please sign in again before changing your settings.", "설정을 변경하려면 다시 로그인해 주세요."));
    return { client, user: data.user };
  };
  const openSecurity = (editor: SecurityEditor) => { setSecurityEditor((current) => current === editor ? null : editor); setFeedback((current) => ({ ...current, security: undefined })); };

  const save = async () => {
    if (!dirty || busy) return;
    if (name.trim().length < 2 || name.trim().length > 40) { setFieldError("name"); setExpanded("identity"); message("profile", say("Enter a nickname between 2 and 40 characters.", "닉네임은 2~40자로 입력해 주세요."), true); requestAnimationFrame(() => nameRef.current?.focus()); return; }
    if (!location.mainLocation) { setFieldError("location"); setExpanded("identity"); message("profile", say("Choose your main location.", "지역을 선택해 주세요."), true); requestAnimationFrame(() => document.getElementById("listing-main-location")?.parentElement?.querySelector<HTMLButtonElement>(".post-select-trigger")?.focus()); return; }
    setFieldError(null); setSaving(true); setFeedback((current) => ({ ...current, profile: undefined }));
    try {
      const { client, user } = await authenticatedUser();
      const values = { id: user.id, display_name: name.trim(), location_mode: location.latitude === null ? "manual" : "current", region_city: location.mainLocation, region_suburb: location.subLocation || null, latitude: location.latitude, longitude: location.longitude, preferred_locale: locale, ...(profileVisibilityAvailable ? { profile_visibility: visibility } : {}) };
      const result = await client.from("profiles").upsert({ ...values, main_location: location.mainLocation, sub_location: location.subLocation || null, locality: location.locality, raw_suburb: location.rawSuburb, region: location.region });
      const error = result.error && ["42703", "PGRST204"].includes(result.error.code) ? (await client.from("profiles").upsert(values)).error : result.error;
      if (error) throw error;
      const metadata = await client.auth.updateUser({ data: { full_name: name.trim(), listing_description_text_step: textStep } });
      if (metadata.error) throw new Error(say("Your profile was saved, but display preferences could not be saved. Please retry.", "프로필은 저장됐지만 화면 설정을 저장하지 못했습니다. 다시 저장해 주세요.") + ` ${metadata.error.message}`);
      setName(name.trim()); setSnapshot({ name: name.trim(), location, visibility, textStep });
      if (photoDraft) {
        try { const url = await persistProfilePhoto(photoDraft.blob); setSavedAvatar(url); setPhotoDraft(null); }
        catch (error) { throw new Error(say("Other changes were saved, but your photo could not be saved. Please retry.", "다른 변경사항은 저장됐지만 사진을 저장하지 못했습니다. 다시 저장해 주세요.") + ` ${error instanceof Error ? error.message : String(error)}`); }
      }
      message("profile", say("Your changes have been saved.", "변경사항을 저장했습니다.")); router.refresh();
    } catch (error) { message("profile", error instanceof Error ? error.message : say("Unable to save your changes. Please try again.", "변경사항을 저장하지 못했습니다. 다시 시도해 주세요."), true); }
    finally { setSaving(false); }
  };
  const discard = () => { setName(snapshot.name); setLocation(snapshot.location); setVisibility(snapshot.visibility); setTextStep(snapshot.textStep); setPhotoDraft(null); setFieldError(null); message("profile", say("Unsaved changes were cancelled.", "저장하지 않은 변경사항을 취소했습니다.")); };
  const changeLocale = async (next: SupportedLocale) => {
    const previous = locale; setLocale(next); setLocaleSaving(true);
    try { const { client, user } = await authenticatedUser(); const { error } = await client.from("profiles").upsert({ id: user.id, display_name: snapshot.name, preferred_locale: next }); if (error) throw error; message("display", next === "ko" ? "언어 설정을 적용했습니다." : "Language updated."); }
    catch (error) { setLocale(previous); message("display", error instanceof Error ? error.message : say("Unable to save your language.", "언어 설정을 저장하지 못했습니다."), true); }
    finally { setLocaleSaving(false); }
  };
  const changeEmail = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailDraft.trim()) || emailDraft.trim().toLowerCase() === email.toLowerCase()) { message("security", say("Enter a different, valid email address.", "변경할 이메일 주소를 정확히 입력해 주세요."), true); return; }
    setSecurityBusy(true);
    try { const { client } = await authenticatedUser(); const { error } = await client.auth.updateUser({ email: emailDraft.trim() }); if (error) throw error; setPendingEmail(emailDraft.trim()); setSecurityEditor(null); message("security", say("Check your inbox to confirm the new email. Your current email stays active until confirmation.", "메일함에서 새 주소를 확인해 주세요. 인증을 완료할 때까지 기존 이메일이 유지됩니다.")); }
    catch (error) { message("security", authErrorText(error, say("Unable to change your email.", "이메일을 변경하지 못했습니다.")), true); }
    finally { setSecurityBusy(false); }
  };
  const resendEmail = async () => { setSecurityBusy(true); try { const { client } = await authenticatedUser(); const { error } = await client.auth.resend({ type: "signup", email }); if (error) throw error; message("security", say("A confirmation email has been sent.", "인증 메일을 보냈습니다. 메일함을 확인해 주세요.")); } catch (error) { message("security", error instanceof Error ? error.message : say("Unable to send the email.", "메일을 보내지 못했습니다."), true); } finally { setSecurityBusy(false); } };
  const sendCode = async () => {
    const target = normalisePhone(phone);
    if (!/^\+642\d{7,9}$/.test(target)) { message("security", say("Enter a valid New Zealand mobile number, such as 021 555 0123.", "뉴질랜드 휴대폰 번호를 정확히 입력해 주세요. 예: 021 555 0123"), true); return; }
    setSecurityBusy(true);
    try { const { client } = await authenticatedUser(); const { error } = await client.auth.updateUser({ phone: target }); if (error) throw error; setSentPhone(target); setOtp(""); setResendSeconds(60); message("security", say("A verification code was sent by SMS.", "문자로 인증 코드를 보냈습니다.")); }
    catch (error) { message("security", authErrorText(error, say("Unable to send the code.", "인증 코드를 보내지 못했습니다.")), true); }
    finally { setSecurityBusy(false); }
  };
  const verifyCode = async () => {
    if (!/^\d{6}$/.test(otp) || !sentPhone) { message("security", say("Enter the 6-digit code from your message.", "문자로 받은 6자리 인증 코드를 입력해 주세요."), true); return; }
    setSecurityBusy(true);
    try {
      const { client, user: before } = await authenticatedUser();
      const { error } = await client.auth.verifyOtp({ phone: sentPhone, token: otp, type: "phone_change" }); if (error) throw error;
      const { data, error: authError } = await client.auth.getUser();
      if (authError || !data.user || data.user.id !== before.id || !data.user.phone_confirmed_at || normalisePhone(data.user.phone ?? "") !== sentPhone) throw new Error(say("We could not confirm your verified number. Please sign in again.", "전화번호 인증 상태를 확인하지 못했습니다. 다시 로그인해 주세요."));
      const confirmed = data.user.phone ?? sentPhone; setVerifiedPhone(confirmed); setPhone(confirmed); setSentPhone(""); setOtp(""); setSecurityEditor(null);
      const sync = await client.from("profiles").update({ phone: confirmed }).eq("id", before.id);
      message("security", sync.error ? say("Your phone is verified. The profile copy could not be updated; please try again later.", "전화번호 인증은 완료됐습니다. 프로필 반영은 잠시 후 다시 확인해 주세요.") : say("Your phone number is verified.", "전화번호 인증을 완료했습니다.")); router.refresh();
    } catch (error) { message("security", authErrorText(error, say("Unable to verify this code.", "인증 코드를 확인하지 못했습니다.")), true); }
    finally { setSecurityBusy(false); }
  };
  const changePassword = async () => {
    if (!currentPassword || password.length < 8 || password !== confirmation) { message("security", say("Enter your current password and matching new passwords of at least 8 characters.", "현재 비밀번호와 8자 이상의 새 비밀번호를 입력하고, 새 비밀번호 확인을 일치시켜 주세요."), true); return; }
    setSecurityBusy(true);
    try { const { client } = await authenticatedUser(); const { error } = await client.auth.updateUser({ password, current_password: currentPassword }); if (error) throw error; setCurrentPassword(""); setPassword(""); setConfirmation(""); setSecurityEditor(null); message("security", say("Your password has been changed.", "비밀번호를 변경했습니다.")); }
    catch (error) { message("security", authErrorText(error, say("Unable to change your password.", "비밀번호를 변경하지 못했습니다.")), true); }
    finally { setSecurityBusy(false); }
  };
  const leave = async (action: "logout" | "back") => {
    if (action === "back") { setExitAction(null); router.push("/market/dashboard/my-page"); return; }
    setLoggingOut(true);
    try { const client = requireClient(); const { error } = await client.auth.signOut({ scope: "local" }); if (error) throw error; setExitAction(null); router.replace("/login"); router.refresh(); }
    catch (error) { setExitAction(null); message("management", error instanceof Error ? error.message : say("Unable to log out. Please try again.", "로그아웃하지 못했습니다. 다시 시도해 주세요."), true); }
    finally { setLoggingOut(false); }
  };
  const chip = (verified: boolean) => <span className={`ui-pill${verified ? " ui-pill--success" : ""}`}>{verified ? say("Verified", "인증됨") : say("Not verified", "미인증")}</span>;

  return <div className="profile-settings-current" data-dirty={dirty} style={{ "--profile-keyboard-inset": `${keyboardInset}px` } as CSSProperties}>
    <header className="profile-editor-intro"><Link className="my-page-link" href="/market/dashboard/my-page" onClick={(event) => { if (dirty) { event.preventDefault(); setExitAction("back"); } }}><i className="ms ms-arrow-back" aria-hidden="true" />{t("myPage")}</Link><h1>{t("profileSettings")}</h1><p>{say("Manage your profile and account in one place.", "내 정보와 계정 설정을 한곳에서 관리하세요.")}</p></header>
    <div className="profile-editor-layout">
      <fieldset className="profile-editor-main" disabled={saving} aria-busy={saving}><legend className="sr-only">{t("profileSettings")}</legend>
        <SettingsSection id="identity" title={say("Basic details", "기본 정보")} icon="ms-person" summary={snapshot.name} open={isOpen("identity")} pinned={desktop} onToggle={() => toggle("identity")}>
          <div className="profile-editor-identity-fields">
            <div className="profile-editor-photo"><ProfilePhotoUploader inputId={PHOTO_INPUT_ID} initialPath={avatarPath} displayName={name} presentation="editor" locale={ko ? "ko" : "en"} previewUrl={photoDraft?.url ?? savedAvatar} onDraftChange={setPhotoDraft} onStatusChange={(text, error) => message("profile", text, error)} /></div>
            <div className="profile-editor-fields"><label className="ui-field" htmlFor="profile-editor-name"><span>{say("Nickname", "닉네임")} <em>*</em></span><span className="profile-editor-name-input"><input ref={nameRef} id="profile-editor-name" className="ui-input" autoComplete="nickname" maxLength={40} value={name} aria-invalid={fieldError === "name" || undefined} aria-describedby={fieldError === "name" ? "profile-editor-name-error" : undefined} onChange={(event) => { setName(event.target.value); if (fieldError === "name") setFieldError(null); }} /><small>{name.length}/40</small></span>{fieldError === "name" ? <small id="profile-editor-name-error" className="profile-editor-field-error">{say("Use 2–40 characters.", "2~40자로 입력해 주세요.")}</small> : null}</label>
              <div className="profile-editor-location" data-invalid={fieldError === "location"}><ListingLocationSelector value={location} onChange={(value) => { setLocation(value); if (fieldError === "location") setFieldError(null); }} labels={ko ? { main: "지역 *", mainPlaceholder: "지역 선택", sub: "세부 지역", subPlaceholder: "세부 지역 선택" } : { main: "Location *", mainPlaceholder: "Select location", sub: "Neighbourhood", subPlaceholder: "Select neighbourhood" }} />{fieldError === "location" ? <small className="profile-editor-field-error">{say("Choose a location.", "지역을 선택해 주세요.")}</small> : null}</div>
            </div>
          </div>
        </SettingsSection>
        <SettingsSection id="security" title={say("Verification & security", "인증 및 보안")} icon="ms-lock" summary={say("Email and optional phone verification", "이메일 인증 · 전화번호 선택")} open={isOpen("security")} pinned={desktop} onToggle={() => toggle("security")}>
          <div className="profile-editor-security-row"><strong>{t("emailAddress")}</strong><div className="profile-editor-contact-value"><span>{email}</span>{chip(emailVerified)}</div><Button variant="secondary" size="sm" disabled={busy} aria-expanded={securityEditor === "email"} onClick={() => openSecurity("email")}>{securityEditor === "email" ? say("Close", "접기") : say("Change", "변경")}</Button></div>
          {pendingEmail ? <p className="profile-editor-pending" role="status">{say("Awaiting confirmation:", "이메일 확인 대기:")} {pendingEmail}</p> : null}
          {!emailVerified ? <Button variant="ghost" size="sm" disabled={busy} onClick={() => void resendEmail()}>{say("Send confirmation email", "인증 메일 받기")}</Button> : null}
          {securityEditor === "email" ? <div className="profile-editor-inline"><label className="ui-field" htmlFor="profile-editor-email"><span>{say("New email address", "새 이메일 주소")}</span><input autoFocus id="profile-editor-email" className="ui-input" disabled={securityBusy} aria-invalid={feedback.security?.error || undefined} aria-describedby={feedback.security?.error ? "profile-editor-feedback-security" : undefined} type="email" autoComplete="email" value={emailDraft} onChange={(event) => setEmailDraft(event.target.value)} /></label><Button variant="primary" size="sm" disabled={busy} onClick={() => void changeEmail()}>{securityBusy ? t("saving") : say("Send confirmation email", "인증 메일 보내기")}</Button></div> : null}
          <div className="profile-editor-security-row"><strong>{t("phoneNumber")}</strong><div className="profile-editor-contact-value"><span>{displayedPhone || say("No number added", "등록하지 않음")}</span>{displayedPhone ? chip(Boolean(verifiedPhone)) : <span className="ui-pill">{say("Optional", "선택")}</span>}</div><Button variant="secondary" size="sm" disabled={busy} aria-expanded={securityEditor === "phone"} onClick={() => openSecurity("phone")}>{securityEditor === "phone" ? say("Close", "접기") : displayedPhone ? say("Change", "변경") : say("Add", "추가")}</Button></div>
          {securityEditor === "phone" ? <div className="profile-editor-inline"><label className="ui-field" htmlFor="profile-editor-phone"><span>{t("phoneNumber")} <small>{say("Optional", "선택")}</small></span><input autoFocus id="profile-editor-phone" className="ui-input" disabled={securityBusy} aria-invalid={feedback.security?.error || undefined} aria-describedby={feedback.security?.error ? "profile-editor-feedback-security" : undefined} type="tel" autoComplete="tel" value={phone} placeholder="021 555 0123" onChange={(event) => { setPhone(event.target.value); if (sentPhone && normalisePhone(event.target.value) !== sentPhone) { setSentPhone(""); setOtp(""); } }} /></label>
            {sentPhone ? <><label className="ui-field" htmlFor="profile-editor-otp"><span>{say("Verification code", "인증 코드")}</span><input id="profile-editor-otp" className="ui-input" disabled={securityBusy} aria-invalid={feedback.security?.error || undefined} aria-describedby={feedback.security?.error ? "profile-editor-feedback-security" : undefined} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))} /></label><div className="profile-editor-inline-actions"><Button variant="primary" disabled={busy || otp.length !== 6} onClick={() => void verifyCode()}>{securityBusy ? t("saving") : say("Verify number", "인증하기")}</Button><Button variant="ghost" size="sm" disabled={busy || resendSeconds > 0} onClick={() => void sendCode()}>{say("Resend code", "코드 다시 받기")}{resendSeconds > 0 ? ` (${resendSeconds}s)` : ""}</Button></div></> : <Button variant="primary" size="sm" disabled={busy || !phone.trim() || phoneVerified} onClick={() => void sendCode()}>{securityBusy ? t("saving") : say("Send verification code", "인증 코드 받기")}</Button>}
            <small>{say("Your phone number is optional and is not shown on your public profile.", "전화번호 등록은 선택이며 공개 프로필에 표시되지 않아요.")}</small></div> : null}
          <div className="profile-editor-security-row"><strong>{t("password")}</strong><div className="profile-editor-contact-value"><span>{hasPassword ? "••••••••" : say("Managed by your sign-in provider", "로그인 서비스에서 관리")}</span></div>{hasPassword ? <Button variant="secondary" size="sm" disabled={busy} aria-expanded={securityEditor === "password"} onClick={() => openSecurity("password")}>{securityEditor === "password" ? say("Close", "접기") : say("Change", "변경")}</Button> : null}</div>
          {securityEditor === "password" ? <div className="profile-editor-inline">{[{ id: "current", title: t("currentPassword"), value: currentPassword, set: setCurrentPassword, autocomplete: "current-password" }, { id: "new", title: say("New password · 8+ characters", "새 비밀번호 · 8자 이상"), value: password, set: setPassword, autocomplete: "new-password" }, { id: "confirm", title: t("confirmNewPassword"), value: confirmation, set: setConfirmation, autocomplete: "new-password" }].map((field) => <label className="ui-field" key={field.id} htmlFor={`profile-editor-password-${field.id}`}><span>{field.title}</span><input id={`profile-editor-password-${field.id}`} className="ui-input" disabled={securityBusy} aria-invalid={feedback.security?.error || undefined} aria-describedby={feedback.security?.error ? "profile-editor-feedback-security" : undefined} type={showPasswords ? "text" : "password"} autoComplete={field.autocomplete} value={field.value} onChange={(event) => field.set(event.target.value)} /></label>)}<label className="profile-editor-show-password"><input type="checkbox" checked={showPasswords} onChange={(event) => setShowPasswords(event.target.checked)} />{say("Show passwords", "비밀번호 보기")}</label>{confirmation && confirmation !== password ? <small className="profile-editor-field-error">{say("The new passwords do not match.", "새 비밀번호가 일치하지 않습니다.")}</small> : null}<Button variant="primary" size="sm" disabled={busy} onClick={() => void changePassword()}>{securityBusy ? t("saving") : t("updatePassword")}</Button></div> : null}
          {notice("security")}<p className="profile-editor-help">{say("Email and phone changes take effect after their own verification.", "이메일·전화번호 변경은 별도 인증 후 적용돼요.")}</p>
        </SettingsSection>
        <SettingsSection id="privacy" title={say("Privacy", "공개 범위")} icon="ms-visibility" summary={`${visibilityLabel} · ${say("Contacts private", "연락처 비공개")}`} open={isOpen("privacy")} onToggle={() => toggle("privacy")}>
          <label className="ui-field" htmlFor="profile-editor-visibility"><span>{say("Seller profile visibility", "판매자 프로필 공개 범위")}</span><select id="profile-editor-visibility" className="ui-input" disabled={!profileVisibilityAvailable || saving} value={visibility} onChange={(event) => setVisibility(event.target.value as ProfileVisibility)}><option value="public">{say("Everyone", "전체 공개")}</option><option value="members">{say("Tada members", "타다 회원만")}</option><option value="trade_partners">{say("Confirmed trade partners", "거래가 확정된 상대만")}</option></select><small>{say("Your name, photo and ratings may still appear with listings and reviews.", "상품·후기에는 이름과 사진, 평점이 표시될 수 있어요.")}</small></label>
          <div className="profile-editor-info-row"><div><strong>{say("Contact details", "연락처")}</strong><p>{say("Your phone number is not shown on your public profile.", "전화번호는 공개 프로필에 표시되지 않아요.")}</p></div><span className="ui-pill">{say("Private", "비공개")}</span></div>
        </SettingsSection>
        <SettingsSection id="display" title={say("Language & text size", "언어 및 글씨 크기")} icon="ms-language" summary={`${ko ? "한국어" : "English"} · ${say("Listing text", "상품 설명")} ${Math.round(descriptionTextScale(textStep) * 100)}%`} open={isOpen("display")} onToggle={() => toggle("display")}>
          <label className="ui-field" htmlFor="profile-editor-language"><span>{t("displayLanguage")}</span><select id="profile-editor-language" className="ui-input" value={locale} disabled={busy} onChange={(event) => void changeLocale(event.target.value as SupportedLocale)}>{languageOptions.filter((option) => option.code === "en" || option.code === "ko").map((option) => <option key={option.code} value={option.code}>{option.nativeLabel}</option>)}</select><small>{say("Language changes apply immediately.", "언어는 바로 적용돼요.")}</small></label>{notice("display")}
          <div className="profile-editor-text-size"><strong>{say("Listing description text size", "상품 설명 글씨 크기")}</strong><TextSizePreferencePreview variant="settings" value={textStep} locale={locale} onChange={(change) => setTextStep((current) => Math.min(MAX_DESCRIPTION_TEXT_SIZE_STEP, Math.max(0, current + change)))} /></div>
        </SettingsSection>
        <SettingsSection id="management" title={say("Account management", "계정 관리")} icon="ms-settings" summary={say("Log out · Account help", "로그아웃 · 계정 도움")} open={isOpen("management")} onToggle={() => toggle("management")}>
          <div className="profile-editor-info-row"><div><strong>{t("logOut")}</strong><p>{say("Log out on this device.", "현재 기기에서 로그아웃합니다.")}</p></div><Button variant="secondary" size="sm" disabled={busy} onClick={() => dirty ? setExitAction("logout") : void leave("logout")}>{loggingOut ? t("loggingOut") : t("logOut")}</Button></div>
          <div className="profile-editor-info-row"><div><strong>{say("Account help", "계정 도움")}</strong><p>{say("Contact us about account changes or closure.", "계정 변경이나 탈퇴가 필요하면 문의해 주세요.")}</p></div><Link className="my-page-link" href="/contact">{say("Contact us", "문의하기")}<i className="ms ms-arrow-forward" aria-hidden="true" /></Link></div>{notice("management")}
        </SettingsSection>
      </fieldset>
      <aside className="profile-editor-rail" aria-label={say("Profile preview and save actions", "프로필 미리보기와 저장")}>
        <div className="ui-panel profile-editor-preview"><h2>{say("My profile preview", "내 프로필 미리보기")}</h2><ProfileIdentitySummary name={name} avatarUrl={photoDraft?.url ?? savedAvatar} location={locationLabel} joinedAt={memberSince} onPhotoEdit={() => document.getElementById(PHOTO_INPUT_ID)?.click()} /><div className="profile-editor-stats"><div><strong>{profileProgress}%</strong><span>{say("Tada Charge", "타다 충전")}</span><small>{say("Profile setup progress", "프로필 설정 진행률")}</small></div><div><strong>{completedTradeCount === null ? "—" : `${completedTradeCount}${ko ? "건" : ""}`}</strong><span>{say("Completed trades", "완료한 거래")}</span></div></div></div>
        <div className="profile-editor-actions" data-visible={dirty || saving}><Button variant="secondary" disabled={!dirty || busy} onClick={discard}>{t("cancel")}</Button><Button variant="primary" disabled={!dirty || busy} onClick={() => void save()}>{saving ? t("saving") : t("saveChanges")}</Button></div>
        <div className="profile-editor-save-feedback">{notice("profile")}{dirty && !feedback.profile ? <p>{say("You have unsaved changes.", "저장하지 않은 변경사항이 있어요.")}</p> : null}</div>
      </aside>
    </div>
    {exitAction ? <DialogOverlay className="profile-editor-exit-overlay" onClose={() => { if (!loggingOut) setExitAction(null); }} isDismissible={!loggingOut} aria-labelledby="profile-editor-exit-title"><section ref={exitDialogRef} className="ui-panel profile-editor-exit-dialog"><h2 id="profile-editor-exit-title">{say("Leave without saving?", "저장하지 않고 나갈까요?")}</h2><p>{say("Your unsaved profile changes will be lost.", "저장하지 않은 프로필 변경사항이 사라집니다.")}</p><p>{say("Tap outside to close.", "바깥을 누르면 닫힙니다.")}</p><div><Button variant="secondary" autoFocus disabled={loggingOut} onClick={() => setExitAction(null)}>{say("Keep editing", "계속 수정")}</Button><Button variant="primary" disabled={loggingOut} onClick={() => void leave(exitAction)}>{loggingOut ? t("loggingOut") : exitAction === "logout" ? t("logOut") : say("Leave", "나가기")}</Button></div></section></DialogOverlay> : null}
  </div>;
}
