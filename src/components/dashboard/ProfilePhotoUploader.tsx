"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function ProfilePhotoUploader({ initialPath }: { initialPath?: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!initialPath) return;
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    void supabase.storage.from("profile-avatars").createSignedUrl(initialPath, 3600).then(({ data }) => setAvatarUrl(data?.signedUrl ?? null));
  }, [initialPath]);

  const uploadPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setStatus("Please select an image file."); return; }
    if (file.size > 800 * 1024) { setStatus("The photo must be 800KB or smaller."); return; }

    const supabase = createBrowserSupabaseClient();
    if (!supabase) { setStatus("Supabase is not configured."); return; }
    setIsUploading(true);
    setStatus("Uploading photo…");

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) { setStatus("Please sign in again."); setIsUploading(false); return; }

    const path = `${userData.user.id}/avatar`;
    const { error: uploadError } = await supabase.storage.from("profile-avatars").upload(path, file, { cacheControl: "3600", contentType: file.type, upsert: true });
    if (uploadError) { setStatus(uploadError.message); setIsUploading(false); return; }

    const { error: profileError } = await supabase.from("profiles").upsert({ id: userData.user.id, avatar_path: path, updated_at: new Date().toISOString() }, { onConflict: "id" });
    if (profileError) { setStatus(profileError.message); setIsUploading(false); return; }

    const { data: signed } = await supabase.storage.from("profile-avatars").createSignedUrl(path, 3600);
    setAvatarUrl(signed?.signedUrl ? `${signed.signedUrl}&v=${Date.now()}` : null);
    setStatus("Photo updated successfully.");
    setIsUploading(false);
    event.target.value = "";
  };

  return (
    <div className="profile-photo-row">
      <div className="profile-avatar">{avatarUrl ? <img src={avatarUrl} alt="Your profile" /> : <i className="fa-regular fa-user" />}</div>
      <div>
        <input ref={inputRef} className="profile-photo-input" type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={uploadPhoto} />
        <button className="profile-primary-button" type="button" disabled={isUploading} onClick={() => inputRef.current?.click()}><i className="fa-solid fa-upload" /> {isUploading ? "Uploading…" : "Upload New Photo"}</button>
        <p>JPG, GIF, PNG or WEBP. Max size of 800KB</p>
        {status && <p className="profile-upload-status" role="status">{status}</p>}
      </div>
    </div>
  );
}
