"use client";

import { useEffect, useRef, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { isAcceptedMarketListingImage, normalizeMarketListingImage } from "@/lib/media/market-listing-image";
import { useLanguage } from "@/components/LanguageProvider";

type Attachment = { path: string; url: string; name: string };
export function CommunityImageAttachments({ onChange }: { onChange: (paths: string[]) => void }) {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [status, setStatus] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  useEffect(() => { onChange(attachments.map((attachment) => attachment.path)); }, [attachments, onChange]);
  const add = async (files: FileList | null) => {
    const incoming = Array.from(files ?? []).filter(isAcceptedMarketListingImage).slice(0, 10 - attachments.length);
    if (!incoming.length) { setStatus(t("communityImageTypeHint")); return; }
    const supabase = createBrowserSupabaseClient(); if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser(); if (!user) { setStatus(t("communitySignInForImages")); return; }
    setStatus(t("communityUploadingImages"));
    const added: Attachment[] = [];
    for (const source of incoming) {
      const file = await normalizeMarketListingImage(source); const path = `${user.id}/attachments/${crypto.randomUUID()}.webp`;
      const { error } = await supabase.storage.from("community-post-images").upload(path, file, { contentType: file.type, upsert: false });
      if (!error) added.push({ path, url: URL.createObjectURL(file), name: source.name });
    }
    setAttachments((current) => [...current, ...added]); setStatus(added.length ? t("communityImagesReady") : t("communityImagesFailed"));
  };
  const remove = async (attachment: Attachment) => { const supabase = createBrowserSupabaseClient(); await supabase?.storage.from("community-post-images").remove([attachment.path]); URL.revokeObjectURL(attachment.url); setAttachments((current) => current.filter((item) => item.path !== attachment.path)); };
  return <fieldset className={`photo-fieldset ${isDragging ? "is-dragging" : ""}`} onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={(event) => { event.preventDefault(); setIsDragging(false); void add(event.dataTransfer.files); }}><legend>{t("communityImagesLegend")}</legend><input ref={inputRef} className="post-photo-input" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => { void add(event.target.files); event.currentTarget.value = ""; }} /><div className="post-photo-grid">{attachments.map((attachment) => <div className="post-photo-card" key={attachment.path}><div className="post-photo-slot"><img src={attachment.url} alt="" /><button className="post-photo-remove" type="button" aria-label={`Remove ${attachment.name}`} onClick={() => void remove(attachment)}><i className="ms ms-close" aria-hidden="true" /></button></div></div>)}{attachments.length < 10 ? <button className={`post-photo-upload ${attachments.length ? "" : "is-initial"}`} type="button" onClick={() => inputRef.current?.click()}><i className="ms ms-photo-camera" aria-hidden="true" /><span>{t("communityAddImages")}</span></button> : null}</div><p className="post-upload-hint"><strong>{t("communityImageTypeHint")}</strong></p>{status ? <p className="post-field-hint" role="status">{status}</p> : null}</fieldset>;
}
