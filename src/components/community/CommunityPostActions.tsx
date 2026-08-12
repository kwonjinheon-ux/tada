import Link from "next/link";

export function CommunityPostActions({ postId, commentCount = 0, compact = false }: { postId: string; commentCount?: number; compact?: boolean }) {
  return <div className={`community-post-actions ${compact ? "is-compact" : ""}`} onClick={(event) => event.stopPropagation()}>
    <button type="button" aria-label="Upvote post"><i className="fa-solid fa-arrow-up" aria-hidden="true" /><span>0</span><i className="fa-solid fa-arrow-down" aria-hidden="true" /></button>
    <Link href={`/community/${postId}#community-comments-title`} aria-label="Open comments"><i className="fa-regular fa-comment" aria-hidden="true" /><span>{commentCount}</span></Link>
    <button type="button" aria-label="Repost"><i className="fa-solid fa-retweet" aria-hidden="true" /></button>
    <button type="button" aria-label="Share post" onClick={() => { if (typeof navigator !== "undefined" && navigator.share) void navigator.share({ url: `${window.location.origin}/community/${postId}` }); else void navigator.clipboard?.writeText(`${window.location.origin}/community/${postId}`); }}><i className="fa-solid fa-share" aria-hidden="true" /><span>Share</span></button>
  </div>;
}
