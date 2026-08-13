"use client";

import Link from "next/link";
import { useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { CommunityPostSaveButton } from "@/components/community/CommunityPostSaveButton";

export function CommunityPostActions({ postId, title, body, commentCount = 0, score = 0, myVote = 0, shareCount = 0, initialIsSaved = false, onCommentsToggle, onCommentsIntent, commentsOpen = false, hideComments = false }: { postId: string; title?: string; body?: string; commentCount?: number; score?: number; myVote?: -1 | 0 | 1; shareCount?: number; initialIsSaved?: boolean; onCommentsToggle?: () => void; onCommentsIntent?: () => void; commentsOpen?: boolean; hideComments?: boolean }) {
  const { t } = useLanguage();
  const [shared, setShared] = useState(false);
  const [currentScore, setCurrentScore] = useState(score);
  const [currentVote, setCurrentVote] = useState(myVote);
  const [currentShareCount, setCurrentShareCount] = useState(shareCount);
  const [isVoting, setIsVoting] = useState(false);
  const share = async () => { const url = `${window.location.origin}/community/${postId}`; const excerpt = body?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 220); const summary = [title, excerpt, url].filter(Boolean).join("\n\n"); try { await navigator.clipboard.writeText(summary); } catch { if (navigator.share) await navigator.share({ title, text: excerpt, url }); } const response = await fetch(`/api/community/posts/${postId}/engagement`, { method: "POST" }); const payload = response.ok ? await response.json() as { shareCount?: number } : null; if (typeof payload?.shareCount === "number") setCurrentShareCount(payload.shareCount); setShared(true); window.setTimeout(() => setShared(false), 2000); };
  const vote = async (value: -1 | 1) => { if (isVoting) return; const nextVote = currentVote === value ? 0 : value; setIsVoting(true); try { const response = await fetch(`/api/community/posts/${postId}/engagement`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "vote", value: nextVote }) }); const payload = response.ok ? await response.json() as { score?: number; myVote?: -1 | 0 | 1 } : null; if (typeof payload?.score === "number" && (payload.myVote === -1 || payload.myVote === 0 || payload.myVote === 1)) { setCurrentScore(payload.score); setCurrentVote(payload.myVote); } } finally { setIsVoting(false); } };
  return <div className="community-post-actions" onClick={(event) => event.stopPropagation()}>
    <CommunityPostSaveButton postId={postId} initialIsSaved={initialIsSaved} />
    <span className="community-vote-control"><button type="button" className={currentVote === 1 ? "is-selected" : ""} aria-label="Upvote post" onClick={() => void vote(1)} disabled={isVoting}><i className="fa-solid fa-arrow-up" aria-hidden="true" /></button><span>{currentScore}</span><button type="button" className={currentVote === -1 ? "is-selected is-downvote" : ""} aria-label="Downvote post" onClick={() => void vote(-1)} disabled={isVoting}><i className="fa-solid fa-arrow-down" aria-hidden="true" /></button></span>
    {!hideComments ? (onCommentsToggle ? <button type="button" aria-label={commentsOpen ? t("communityHideComments") : t("communityOpenComments")} aria-expanded={commentsOpen} onPointerEnter={onCommentsIntent} onFocus={onCommentsIntent} onTouchStart={onCommentsIntent} onClick={() => { onCommentsIntent?.(); onCommentsToggle(); }}><i className="fa-regular fa-comment" aria-hidden="true" /><span>{commentCount}</span></button> : <Link href={`/community/${postId}#community-comments-title`} aria-label={t("communityOpenComments")} onPointerEnter={onCommentsIntent} onFocus={onCommentsIntent} onTouchStart={onCommentsIntent}><i className="fa-regular fa-comment" aria-hidden="true" /><span>{commentCount}</span></Link>) : null}
    <span className="community-post-share-count" aria-label={`${currentShareCount} shares`}><i className="fa-solid fa-retweet" aria-hidden="true" /><span>{currentShareCount}</span></span>
    <button type="button" aria-label={t("communitySharePost")} onClick={() => void share()}><i className={`fa-solid ${shared ? "fa-check" : "fa-share"}`} aria-hidden="true" /><span>{shared ? t("communityCopied") : t("communityShare")}</span></button>
  </div>;
}
