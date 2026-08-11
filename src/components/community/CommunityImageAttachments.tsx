"use client";

import { useEffect, useRef, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { isAcceptedMarketListingImage, normalizeMarketListingImage } from "@/lib/media/market-listing-image";

type Attachment = { path: string; url: string; name: string };
export function CommunityImageAttachments({ onChange }: { onChange: (paths: string[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [status, setStatus] = useState("");
  useEffect(() => { onChange(attachments.map((attachment) => attachment.path)); }, [attachments, onChange]);
  const add = async (files: FileList | null) => {
    const incoming = Array.from(files ?? []).filter(isAcceptedMarketListingImage).slice(0, 10 - attachments.length);
    if (!incoming.length) { setStatus("Choose PNG, JPG, or WebP images up to 5MB."); return; }
    const supabase = createBrowserSupabaseClient(); if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser(); if (!user) { setStatus("Sign in before adding images."); return; }
    setStatus("Uploading images…");
    const added: Attachment[] = [];
    for (const source of incoming) {
      const file = await normalizeMarketListingImage(source); const path = `${user.id}/attachments/${crypto.randomUUID()}.webp`;
      const { error } = await supabase.storage.from("community-post-images").upload(path, file, { contentType: file.type, upsert: false });
      if (!error) added.push({ path, url: URL.createObjectURL(file), name: source.name });
    }
    setAttachments((current) => [...current, ...added]); setStatus(added.length ? "Images will be attached when you publish." : "Images could not be uploaded.");
  };
  const remove = async (attachment: Attachment) => { const supabase = createBrowserSupabaseClient(); await supabase?.storage.from("community-post-images").remove([attachment.path]); URL.revokeObjectURL(attachment.url); setAttachments((current) => current.filter((item) => item.path !== attachment.path)); };
  return <fieldset className="photo-fieldset"><legend>Images</legend><input ref={inputRef} className="post-photo-input" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => void add(event.target.files)} /><div className="post-photo-grid">{attachments.map((attachment) => <div className="post-photo-card" key={attachment.path}><div className="post-photo-slot"><img src={attachment.url} alt="" /><button className="post-photo-remove" type="button" aria-label={`Remove ${attachment.name}`} onClick={() => void remove(attachment)}><i className="fa-solid fa-xmark" aria-hidden="true" /></button></div></div>)}{attachments.length < 10 ? <button className={`post-photo-upload ${attachments.length ? "" : "is-initial"}`} type="button" onClick={() => inputRef.current?.click()}><i className="fa-solid fa-camera" aria-hidden="true" /><span>Add images</span></button> : null}</div>{status ? <p className="post-field-hint" role="status">{status}</p> : null}</fieldset>;
}
