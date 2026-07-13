"use client";

import { ChangeEvent, PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent, useEffect, useRef, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { getAvatarFallback } from "@/lib/avatar-fallback";

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const PREVIEW_SIZE = 300;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

type Transform = { x: number; y: number; zoom: number; rotation: number };
type Point = { x: number; y: number };

const distance = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);
const angle = (a: Point, b: Point) => Math.atan2(b.y - a.y, b.x - a.x);
const centre = (a: Point, b: Point) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function ProfilePhotoUploader({ initialPath, displayName, memberSince }: { initialPath?: string | null; displayName?: string | null; memberSince?: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const editorImageRef = useRef<HTMLImageElement>(null);
  const pointersRef = useRef(new Map<number, Point>());
  const gestureRef = useRef<{ centre: Point; distance: number; angle: number } | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [editorUrl, setEditorUrl] = useState<string | null>(null);
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, zoom: 1, rotation: 0 });
  const [status, setStatus] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const avatarFallback = getAvatarFallback(displayName);

  useEffect(() => {
    if (!initialPath) return;
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    void supabase.storage.from("profile-avatars").createSignedUrl(initialPath, 3600).then(({ data }) => setAvatarUrl(data?.signedUrl ?? null));
  }, [initialPath]);

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

  const openEditor = (url: string) => {
    setEditorUrl(url);
    setTransform({ x: 0, y: 0, zoom: 1, rotation: 0 });
    setStatus("");
  };

  const selectPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { setStatus("Please select an image file."); return; }
    if (file.size > MAX_FILE_SIZE) { setStatus("The photo must be 2MB or smaller."); return; }
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
    setStatus("Saving photo…");

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

      const supabase = createBrowserSupabaseClient();
      if (!supabase) throw new Error("Supabase is not configured.");
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error("Please sign in again.");
      const path = `${userData.user.id}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage.from("profile-avatars").upload(path, blob, { cacheControl: "3600", contentType: "image/jpeg", upsert: true });
      if (uploadError) throw uploadError;
      const { error: metadataError } = await supabase.auth.updateUser({ data: { avatar_path: path } });
      if (metadataError) throw metadataError;
      const { data: signed } = await supabase.storage.from("profile-avatars").createSignedUrl(path, 3600);
      const updatedUrl = signed?.signedUrl ? `${signed.signedUrl}&v=${Date.now()}` : null;
      setAvatarUrl(updatedUrl);
      window.dispatchEvent(new CustomEvent("profile-avatar-updated", { detail: updatedUrl }));
      closeEditor();
      setStatus("Photo updated successfully.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save the photo.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="profile-photo-card">
      <input ref={inputRef} className="profile-photo-input" type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={selectPhoto} />
      <div className="profile-avatar-wrap">
        <button className="profile-avatar" type="button" aria-label={avatarUrl ? "Adjust profile photo" : "Upload profile photo"} onClick={() => avatarUrl ? openEditor(avatarUrl) : inputRef.current?.click()}>
          {avatarUrl ? <img src={avatarUrl} alt="Your profile" /> : <span className="profile-avatar-placeholder"><i className="fa-regular fa-user" /></span>}
        </button>
        <button className="profile-camera-button" type="button" disabled={isUploading} aria-label="Upload a new profile photo" onClick={() => inputRef.current?.click()}><i className="fa-solid fa-camera" /></button>
      </div>
      <div className="profile-photo-identity">
        <strong>{displayName || avatarFallback.initial}</strong>
        <button type="button" aria-label="Change profile photo" onClick={() => inputRef.current?.click()}><i className="fa-solid fa-pen" /></button>
      </div>
      {memberSince && <p className="profile-member-since">Member since {memberSince}</p>}
      <p className="profile-photo-help">JPG, GIF, PNG or WEBP · Max 2MB</p>
      {status && <p className="profile-upload-status" role="status">{status}</p>}

      {editorUrl && (
        <div className="avatar-editor-backdrop" role="dialog" aria-modal="true" aria-label="Adjust profile photo" onPointerDown={(event) => event.target === event.currentTarget && closeEditor()}>
          <section className="avatar-editor">
            <div className="avatar-editor-heading"><h2>Adjust profile photo</h2><button type="button" aria-label="Close photo editor" onClick={closeEditor}><i className="fa-solid fa-xmark" /></button></div>
            <div
              ref={previewRef}
              className="avatar-editor-preview"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerEnd}
              onPointerCancel={handlePointerEnd}
              onWheel={handleWheel}
            >
              <img ref={editorImageRef} src={editorUrl} alt="Profile photo preview" draggable={false} style={{ transform: `translate3d(${transform.x}px, ${transform.y}px, 0) rotate(${transform.rotation}deg) scale(${transform.zoom})` }} />
              <span className="avatar-editor-frame" aria-hidden="true" />
            </div>
            <p className="avatar-editor-hint"><i className="fa-solid fa-hand-pointer" /> Drag to move · pinch to zoom · twist to rotate</p>
            <div className="avatar-editor-actions"><button className="profile-outline-button" type="button" onClick={closeEditor}>Cancel</button><button className="profile-primary-button" type="button" disabled={isUploading} onClick={() => void saveCroppedAvatar()}>{isUploading ? "Saving…" : "Save photo"}</button></div>
          </section>
        </div>
      )}
    </div>
  );
}
