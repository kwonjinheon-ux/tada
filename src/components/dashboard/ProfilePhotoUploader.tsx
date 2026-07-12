"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { getAvatarFallback } from "@/lib/avatar-fallback";

const MAX_FILE_SIZE = 2 * 1024 * 1024;

export function ProfilePhotoUploader({ initialPath, displayName }: { initialPath?: string | null; displayName?: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [editorUrl, setEditorUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [status, setStatus] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const avatarFallback = getAvatarFallback(displayName);

  useEffect(() => {
    if (!initialPath) return;
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    void supabase.storage.from("profile-avatars").createSignedUrl(initialPath, 3600).then(({ data }) => setAvatarUrl(data?.signedUrl ?? null));
  }, [initialPath]);

  const openEditor = (url: string) => {
    setEditorUrl(url);
    setZoom(1);
    setStatus("");
  };

  const selectPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setStatus("Please select an image file."); return; }
    if (file.size > MAX_FILE_SIZE) { setStatus("The photo must be 2MB or smaller."); return; }
    openEditor(URL.createObjectURL(file));
    event.target.value = "";
  };

  const saveCroppedAvatar = async () => {
    if (!editorUrl) return;
    setIsUploading(true);
    setStatus("Saving photo…");
    const image = new Image();
    image.src = editorUrl;
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("Unable to read this image.")); });

    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext("2d");
    if (!context) { setStatus("Unable to prepare the image."); setIsUploading(false); return; }
    const crop = Math.min(image.naturalWidth, image.naturalHeight) / zoom;
    const sourceX = (image.naturalWidth - crop) / 2;
    const sourceY = (image.naturalHeight - crop) / 2;
    context.drawImage(image, sourceX, sourceY, crop, crop, 0, 0, 512, 512);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    if (!blob) { setStatus("Unable to prepare the image."); setIsUploading(false); return; }

    const supabase = createBrowserSupabaseClient();
    if (!supabase) { setStatus("Supabase is not configured."); setIsUploading(false); return; }
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) { setStatus("Please sign in again."); setIsUploading(false); return; }
    const path = `${userData.user.id}/avatar.jpg`;
    const { error: uploadError } = await supabase.storage.from("profile-avatars").upload(path, blob, { cacheControl: "3600", contentType: "image/jpeg", upsert: true });
    if (uploadError) { setStatus(uploadError.message); setIsUploading(false); return; }
    const { error: metadataError } = await supabase.auth.updateUser({ data: { avatar_path: path } });
    if (metadataError) { setStatus(metadataError.message); setIsUploading(false); return; }
    const { data: signed } = await supabase.storage.from("profile-avatars").createSignedUrl(path, 3600);
    const updatedUrl = signed?.signedUrl ? `${signed.signedUrl}&v=${Date.now()}` : null;
    setAvatarUrl(updatedUrl);
    window.dispatchEvent(new CustomEvent("profile-avatar-updated", { detail: updatedUrl }));
    setEditorUrl(null);
    setStatus("Photo updated successfully.");
    setIsUploading(false);
  };

  return (
    <div className="profile-photo-row">
      <button className="profile-avatar" type="button" aria-label="Adjust profile photo" onClick={() => avatarUrl && openEditor(avatarUrl)}>
        {avatarUrl ? <img src={avatarUrl} alt="Your profile" /> : <span className="profile-avatar-initial" style={{ backgroundColor: avatarFallback.color }}>{avatarFallback.initial}</span>}
      </button>
      <div>
        <input ref={inputRef} className="profile-photo-input" type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={selectPhoto} />
        <button className="profile-primary-button" type="button" disabled={isUploading} onClick={() => inputRef.current?.click()}><i className="fa-solid fa-upload" /> Upload New Photo</button>
        <p>JPG, GIF, PNG or WEBP. Max size of 2MB</p>
        {status && <p className="profile-upload-status" role="status">{status}</p>}
      </div>
      {editorUrl && (
        <div className="avatar-editor-backdrop" role="dialog" aria-modal="true" aria-label="Adjust profile photo">
          <section className="avatar-editor">
            <div className="avatar-editor-heading"><h2>Adjust profile photo</h2><button type="button" aria-label="Close photo editor" onClick={() => setEditorUrl(null)}><i className="fa-solid fa-xmark" /></button></div>
            <div className="avatar-editor-preview"><img src={editorUrl} alt="Profile photo preview" style={{ transform: `scale(${zoom})` }} /></div>
            <label className="avatar-zoom-control">Photo size<input type="range" min="1" max="2.5" step="0.05" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /></label>
            <div className="avatar-editor-actions"><button className="profile-outline-button" type="button" onClick={() => setEditorUrl(null)}>Cancel</button><button className="profile-primary-button" type="button" disabled={isUploading} onClick={() => void saveCroppedAvatar()}>{isUploading ? "Saving…" : "Save photo"}</button></div>
          </section>
        </div>
      )}
    </div>
  );
}
