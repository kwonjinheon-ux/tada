"use client";

import Link from "next/link";
import { useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";

export function CommunityPostActions({ postId, commentCount = 0, onCommentsToggle, commentsOpen = false, hideComments = false }: { postId: string; commentCount?: number; onCommentsToggle?: () => void; commentsOpen?: boolean; hideComments?: boolean }) {
  const { t } = useLanguage();
  const [shared, setShared] = useState(false);
  const share = async () => { const url = `${window.location.origin}/community/${postId}`; try { await navigator.clipboard.writeText(url); } catch { if (navigator.share) await navigator.share({ url }); } setShared(true); window.setTimeout(() => setShared(false), 2000); };
  return <div className="community-post-actions" onClick={(event) => event.stopPropagation()}>
    <button type="button" aria-label="Upvote post"><i className="fa-solid fa-arrow-up" aria-hidden="true" /><span>0</span><i className="fa-solid fa-arrow-down" aria-hidden="true" /></button>
    {!hideComments ? (onCommentsToggle ? <button type="button" aria-label={commentsOpen ? t("communityHideComments") : t("communityOpenComments")} aria-expanded={commentsOpen} onClick={onCommentsToggle}><i className="fa-regular fa-comment" aria-hidden="true" /><span>{commentCount}</span></button> : <Link href={`/community/${postId}#community-comments-title`} aria-label={t("communityOpenComments")}><i className="fa-regular fa-comment" aria-hidden="true" /><span>{commentCount}</span></Link>) : null}
    <button type="button" aria-label="Repost"><i className="fa-solid fa-retweet" aria-hidden="true" /></button>
    <button type="button" aria-label={t("communitySharePost")} onClick={() => void share()}><i className={`fa-solid ${shared ? "fa-check" : "fa-share"}`} aria-hidden="true" /><span>{shared ? t("communityCopied") : t("communityShare")}</span></button>
  </div>;
}
