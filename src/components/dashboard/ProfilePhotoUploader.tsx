"use client";

import { ChangeEvent, PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { getAvatarFallback } from "@/lib/avatar-fallback";
import { DialogOverlay } from "@/components/ui/DialogOverlay";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const PREVIEW_SIZE = 300;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

type Transform = { x: number; y: number; zoom: number; rotation: number };
type Point = { x: number; y: number };
export type ProfilePhotoDraft = { blob: Blob; url: string };

export async function persistProfilePhoto(blob: Blob) {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error("Please sign in again.");
  const path = `${userData.user.id}/avatar.jpg`;
  const { error: uploadError } = await supabase.storage.from("profile-avatars").upload(path, blob, { cacheControl: "3600", contentType: "image/jpeg", upsert: true });
  if (uploadError) throw uploadError;
  const { error: profileError } = await supabase.from("profiles").update({ avatar_path: path }).eq("id", userData.user.id);
  if (profileError) throw profileError;
  const { error: metadataError } = await supabase.auth.updateUser({ data: { avatar_path: path } });
  if (metadataError) throw metadataError;
  const { data: signed } = await supabase.storage.from("profile-avatars").createSignedUrl(path, 3600);
  const updatedUrl = signed?.signedUrl ? `${signed.signedUrl}&v=${Date.now()}` : null;
  window.dispatchEvent(new CustomEvent("profile-avatar-updated", { detail: updatedUrl }));
  return updatedUrl;
}

const distance = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);
const angle = (a: Point, b: Point) => Math.atan2(b.y - a.y, b.x - a.x);
const centre = (a: Point, b: Point) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function ProfilePhotoUploader({ initialPath, displayName, email, memberSince, locationLabel, presentation = "standard", locale = "en", previewUrl, onDraftChange, inputId, onStatusChange }: { initialPath?: string | null; displayName?: string | null; email?: string; memberSince?: string | null; locationLabel?: string | null; presentation?: "standard" | "editor" | "preview"; locale?: "en" | "ko"; previewUrl?: string | null; onDraftChange?: (draft: ProfilePhotoDraft) => void; inputId?: string; onStatusChange?: (text: string, error?: boolean) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const editorImageRef = useRef<HTMLImageElement>(null);
  const pointersRef = useRef(new Map<number, Point>());
  const gestureRef = useRef<{ centre: Point; distance: number; angle: number } | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [editorUrl, setEditorUrl] = useState<string | null>(null);
  const [imageReady, setImageReady] = useState(false);
  const [editorError, setEditorError] = useState("");
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, zoom: 1, rotation: 0 });
  const [status, setStatus] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const avatarFallback = getAvatarFallback(displayName);
  const visibleAvatarUrl = previewUrl ?? avatarUrl;
  const joinedDate = memberSince ? new Date(memberSince) : null;
  const joinedLabel = joinedDate && !Number.isNaN(joinedDate.getTime())
    ? new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-NZ", { month: "long", year: "numeric" }).format(joinedDate)
    : null;

  useEffect(() => {
    if (!initialPath) return;
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    void supabase.storage.from("profile-avatars").createSignedUrl(initialPath, 3600).then(({ data }) => setAvatarUrl(data?.signedUrl ?? null));
  }, [initialPath]);

  useEffect(() => {
    const syncAvatar = (event: Event) => setAvatarUrl((event as CustomEvent<string | null>).detail);
    window.addEventListener("profile-avatar-updated", syncAvatar);
    return () => window.removeEventListener("profile-avatar-updated", syncAvatar);
  }, []);

  useEffect(() => {
    if (onDraftChange && !previewUrl) setStatus("");
  }, [onDraftChange, previewUrl]);

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
  }, []);

  const closeEditor = () => {
    setEditorUrl(null);
    pointersRef.current.clear();
    gestureRef.current = null;
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  };

  useEffect(() => {
    if (!editorUrl) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isUploading) { event.preventDefault(); closeEditor(); }
      if (event.key !== "Tab") return;
      const buttons = dialogRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
      if (!buttons?.length) return;
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = overflow; window.removeEventListener("keydown", onKeyDown); previous?.focus(); };
  }, [editorUrl, isUploading]);

  const openEditor = (url: string) => {
    setEditorUrl(url);
    setImageReady(false);
    setEditorError("");
    setTransform({ x: 0, y: 0, zoom: 1, rotation: 0 });
    setStatus("");
  };

  const selectPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { const text = locale === "ko" ? "이미지 파일을 선택해 주세요." : "Please select an image file."; setStatus(text); onStatusChange?.(text, true); return; }
    if (file.size > MAX_FILE_SIZE) { const text = locale === "ko" ? "사진은 5MB 이하로 선택해 주세요." : "The photo must be 5MB or smaller."; setStatus(text); onStatusChange?.(text, true); return; }
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = URL.createObjectURL(file);
    openEditor(objectUrlRef.current);
  };

  const resetGesture = () => {
    const points = [...pointersRef.current.values()];
    if (points.length === 2) {
      gestureRef.current = { centre: centre(points[0], points[1]), distance: distance(points[0], points[1]), angle: angle(points[0], points[1]) };
    } else if (points.length === 1) {
      gestureRef.current = { centre: points[0], distance: 0, angle: 0 };
    } else {
      gestureRef.current = null;
    }
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    resetGesture();
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return;
    event.preventDefault();
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = [...pointersRef.current.values()];
    const previous = gestureRef.current;
    if (!previous) { resetGesture(); return; }

    if (points.length === 1) {
      const next = points[0];
      setTransform((value) => ({ ...value, x: value.x + next.x - previous.centre.x, y: value.y + next.y - previous.centre.y }));
      gestureRef.current = { centre: next, distance: 0, angle: 0 };
      return;
    }

    if (points.length >= 2) {
      const nextCentre = centre(points[0], points[1]);
      const nextDistance = distance(points[0], points[1]);
      const nextAngle = angle(points[0], points[1]);
      const angleDelta = Math.atan2(Math.sin(nextAngle - previous.angle), Math.cos(nextAngle - previous.angle));
      setTransform((value) => ({
        x: value.x + nextCentre.x - previous.centre.x,
        y: value.y + nextCentre.y - previous.centre.y,
        zoom: clamp(value.zoom * (previous.distance ? nextDistance / previous.distance : 1), MIN_ZOOM, MAX_ZOOM),
        rotation: value.rotation + angleDelta * (180 / Math.PI),
      }));
      gestureRef.current = { centre: nextCentre, distance: nextDistance, angle: nextAngle };
    }
  };

  const handlePointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId);
    resetGesture();
  };

  const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    setTransform((value) => ({ ...value, zoom: clamp(value.zoom * (event.deltaY > 0 ? 0.94 : 1.06), MIN_ZOOM, MAX_ZOOM) }));
  };

  const saveCroppedAvatar = async () => {
    const image = editorImageRef.current;
    if (!editorUrl || !image?.complete || !image.naturalWidth) return;
    setIsUploading(true);
    setStatus(onDraftChange ? "Preparing photo…" : "Saving photo…");

    try {
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Unable to prepare the image.");

      context.fillStyle = "#eef3fb";
      context.fillRect(0, 0, canvas.width, canvas.height);
      const previewSize = previewRef.current?.clientWidth || PREVIEW_SIZE;
      const outputRatio = canvas.width / previewSize;
      const coverScale = Math.max(previewSize / image.naturalWidth, previewSize / image.naturalHeight);
      context.translate(canvas.width / 2 + transform.x * outputRatio, canvas.height / 2 + transform.y * outputRatio);
      context.rotate(transform.rotation * (Math.PI / 180));
      context.scale(coverScale * outputRatio * transform.zoom, coverScale * outputRatio * transform.zoom);
      context.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
      if (!blob) throw new Error("Unable to prepare the image.");
      if (onDraftChange) {
        onDraftChange({ blob, url: URL.createObjectURL(blob) });
      } else {
        setAvatarUrl(await persistProfilePhoto(blob));
      }
      closeEditor();
      const text = onDraftChange ? (locale === "ko" ? "사진이 준비됐어요. 변경사항 저장을 눌러 적용하세요." : "Photo ready. Save changes to apply it.") : "Photo updated successfully.";
      setStatus(text); onStatusChange?.(text);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Unable to save the photo."; setStatus(text); setEditorError(text); onStatusChange?.(text, true);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={presentation === "editor" ? "profile-photo-control" : `profile-photo-card profile-photo-card--${presentation}`}>
      {presentation !== "preview" ? <input id={inputId} ref={inputRef} className="profile-photo-input" type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={selectPhoto} /> : null}
      <div className="profile-avatar-wrap">
        {presentation === "preview" ? <div className="profile-avatar" aria-hidden="true">{visibleAvatarUrl ? <img src={visibleAvatarUrl} alt="" /> : <span className="profile-avatar-placeholder"><i className="ms ms-person" /></span>}</div> : <button className="profile-avatar" type="button" aria-label={locale === "ko" ? "프로필 사진 변경" : "Change profile photo"} onClick={() => visibleAvatarUrl ? openEditor(visibleAvatarUrl) : inputRef.current?.click()}>
          {visibleAvatarUrl ? <img src={visibleAvatarUrl} alt="Your profile" /> : <span className="profile-avatar-placeholder">{presentation === "editor" ? avatarFallback.initial : <i className="ms ms-person" />}</span>}
        </button>}
        {presentation !== "preview" ? <IconButton className="profile-camera-button" disabled={isUploading} aria-label={locale === "ko" ? "새 프로필 사진 업로드" : "Upload a new profile photo"} onClick={() => inputRef.current?.click()}><i className="ms ms-photo-camera" aria-hidden="true" /></IconButton> : null}
      </div>
      <div className="profile-photo-details">
        {presentation === "editor" ? <Button variant="secondary" size="sm" className="profile-photo-change" disabled={isUploading} onClick={() => inputRef.current?.click()}>{locale === "ko" ? "사진 변경" : "Change photo"}</Button> : <>
        <div className="profile-photo-identity"><strong>{displayName || avatarFallback.initial}</strong><span className="ui-pill ui-pill--warning">{locale === "ko" ? "회원" : "Member"}</span></div>
        {presentation === "standard" && email ? <p className="profile-photo-email">{email}</p> : null}
        {locationLabel && <p className="profile-photo-location"><i className="ms ms-location-on" aria-hidden="true" /> {locationLabel}</p>}
        {joinedLabel ? <p className="profile-member-since"><i className="ms ms-calendar-today" aria-hidden="true" /> {locale === "ko" ? "가입" : "Joined"} {joinedLabel}</p> : null}
        {presentation === "standard" ? <p className="profile-photo-help">JPG, GIF, PNG or WEBP · Max 5MB</p> : null}
        </>}
        {status && <p className="profile-upload-status" role="status">{status}</p>}
      </div>

      {editorUrl && createPortal(
        <DialogOverlay className="avatar-editor-backdrop" aria-label={locale === "ko" ? "프로필 사진 조정" : "Adjust profile photo"} isDismissible={!isUploading} onClose={() => { if (!isUploading) closeEditor(); }}>
          <section ref={dialogRef} className="avatar-editor">
            <div className="avatar-editor-heading"><h2>{locale === "ko" ? "프로필 사진 조정" : "Adjust profile photo"}</h2><button type="button" disabled={isUploading} aria-label={locale === "ko" ? "사진 편집기 닫기" : "Close photo editor"} onClick={closeEditor}><i className="ms ms-close" /></button></div>
            <div
              ref={previewRef}
              className="avatar-editor-preview"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerEnd}
              onPointerCancel={handlePointerEnd}
              onWheel={handleWheel}
            >
              <img ref={editorImageRef} crossOrigin="anonymous" src={editorUrl} alt={locale === "ko" ? "프로필 사진 미리보기" : "Profile photo preview"} draggable={false} onLoad={() => setImageReady(true)} onError={() => { setImageReady(false); setEditorError(locale === "ko" ? "사진을 불러오지 못했습니다. 다른 사진을 선택해 주세요." : "Unable to load this photo. Please choose another image."); }} style={{ transform: `translate3d(${transform.x}px, ${transform.y}px, 0) rotate(${transform.rotation}deg) scale(${transform.zoom})` }} />
              <span className="avatar-editor-frame" aria-hidden="true" />
            </div>
            <p className="avatar-editor-hint"><i className="ms ms-touch-app" /> {locale === "ko" ? "드래그로 이동 · 두 손가락으로 확대·회전" : "Drag to move · pinch to zoom · twist to rotate"}</p>
            <p className="avatar-editor-hint">{locale === "ko" ? "바깥을 누르면 닫힙니다." : "Tap outside to close."}</p>
            {editorError ? <p className="avatar-editor-error" role="alert">{editorError}</p> : null}
            <div className="avatar-editor-actions"><Button variant="secondary" disabled={isUploading} onClick={closeEditor}>{locale === "ko" ? "취소" : "Cancel"}</Button><Button variant="primary" disabled={isUploading || !imageReady} onClick={() => void saveCroppedAvatar()}>{isUploading ? (locale === "ko" ? "준비 중…" : "Preparing…") : onDraftChange ? (locale === "ko" ? "이 사진 사용" : "Use this photo") : (locale === "ko" ? "사진 저장" : "Save photo")}</Button></div>
          </section>
        </DialogOverlay>, document.body
      )}
    </div>
  );
}
