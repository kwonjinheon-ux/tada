"use client";

import Link from "next/link";
import { useState } from "react";

export function CommunityPostActions({ postId, commentCount = 0, compact = false, onCommentsToggle, commentsOpen = false, hideComments = false }: { postId: string; commentCount?: number; compact?: boolean; onCommentsToggle?: () => void; commentsOpen?: boolean; hideComments?: boolean }) {
  const [vote, setVote] = useState<-1 | 0 | 1>(0);
  const [shared, setShared] = useState(false);
  const score = vote;
  const share = async () => { const url = `${window.location.origin}/community/${postId}`; try { await navigator.clipboard.writeText(url); } catch { if (navigator.share) await navigator.share({ url }); } setShared(true); window.setTimeout(() => setShared(false), 2000); };
  return <div className={`community-post-actions ${compact ? "is-compact" : ""}`} onClick={(event) => event.stopPropagation()}>
    <span className="community-vote-control"><button type="button" className={vote === 1 ? "is-selected" : ""} aria-label="Upvote post" onClick={() => setVote((value) => value === 1 ? 0 : 1)}><i className="fa-solid fa-arrow-up" aria-hidden="true" /></button><span aria-label={`${score} votes`}>{score}</span><button type="button" className={vote === -1 ? "is-selected is-downvote" : ""} aria-label="Downvote post" onClick={() => setVote((value) => value === -1 ? 0 : -1)}><i className="fa-solid fa-arrow-down" aria-hidden="true" /></button></span>
    {!hideComments ? (onCommentsToggle ? <button type="button" aria-label={commentsOpen ? "Hide comments" : "Open comments"} aria-expanded={commentsOpen} onClick={onCommentsToggle}><i className="fa-regular fa-comment" aria-hidden="true" /><span>{commentCount}</span></button> : <Link href={`/community/${postId}#community-comments-title`} aria-label="Open comments"><i className="fa-regular fa-comment" aria-hidden="true" /><span>{commentCount}</span></Link>) : null}
    <button type="button" aria-label="Repost"><i className="fa-solid fa-retweet" aria-hidden="true" /></button>
    <button type="button" aria-label="Share post" onClick={() => void share()}><i className={`fa-solid ${shared ? "fa-check" : "fa-share"}`} aria-hidden="true" /><span>{shared ? "Copied" : "Share"}</span></button>
  </div>;
}
