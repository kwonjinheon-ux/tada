"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { CommunityPostSaveButton } from "@/components/community/CommunityPostSaveButton";

type Vote = -1 | 0 | 1;

function isVote(value: unknown): value is Vote {
  return value === -1 || value === 0 || value === 1;
}

type CommunityPostActionsProps = {
  postId: string;
  title?: string;
  body?: string;
  commentCount?: number;
  score?: number;
  myVote?: Vote;
  shareCount?: number;
  initialIsSaved?: boolean;
  isOwner?: boolean;
  onCommentsToggle?: () => void;
  onCommentsIntent?: () => void;
  commentsOpen?: boolean;
  hideComments?: boolean;
};

export function CommunityPostActions({
  postId,
  title,
  body,
  commentCount = 0,
  score = 0,
  myVote = 0,
  shareCount = 0,
  initialIsSaved = false,
  isOwner = false,
  onCommentsToggle,
  onCommentsIntent,
  commentsOpen = false,
  hideComments = false,
}: CommunityPostActionsProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const [shared, setShared] = useState(false);
  const [currentScore, setCurrentScore] = useState(score);
  const [currentVote, setCurrentVote] = useState<Vote>(myVote);
  const [currentShareCount, setCurrentShareCount] = useState(shareCount);
  const [isVoting, setIsVoting] = useState(false);

  const share = async () => {
    const url = `${window.location.origin}/community/${postId}`;
    const excerpt = body?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 220);
    const summary = [title, excerpt, url].filter(Boolean).join("\n\n");

    try {
      await navigator.clipboard.writeText(summary);
    } catch {
      if (navigator.share) await navigator.share({ title, text: excerpt, url });
    }

    const response = await fetch(`/api/community/posts/${postId}/engagement`, { method: "POST" });
    const payload = response.ok ? await response.json() as { shareCount?: number } : null;
    if (typeof payload?.shareCount === "number") setCurrentShareCount(payload.shareCount);
    setShared(true);
    window.setTimeout(() => setShared(false), 2000);
  };

  const vote = async (value: Exclude<Vote, 0>) => {
    if (isVoting) return;

    const previousScore = currentScore;
    const previousVote = currentVote;
    const nextVote: Vote = currentVote === value ? 0 : value;

    setCurrentScore(previousScore + nextVote - previousVote);
    setCurrentVote(nextVote);
    setIsVoting(true);

    try {
      const response = await fetch(`/api/community/posts/${postId}/engagement`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "vote", value: nextVote }),
      });
      const payload = response.ok
        ? await response.json() as { score?: number; myVote?: Vote }
        : null;

      if (typeof payload?.score === "number" && isVote(payload.myVote)) {
        setCurrentScore(payload.score);
        setCurrentVote(payload.myVote);
      } else {
        setCurrentScore(previousScore);
        setCurrentVote(previousVote);

        if (response.status === 401) {
          router.push(
            `/login?redirectTo=${encodeURIComponent(`${window.location.pathname}${window.location.search}`)}`,
          );
        }
      }
    } catch {
      setCurrentScore(previousScore);
      setCurrentVote(previousVote);
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <div className="community-post-actions" onClick={(event) => event.stopPropagation()}>
      {!isOwner ? <CommunityPostSaveButton postId={postId} initialIsSaved={initialIsSaved} /> : null}
      <span className="community-vote-control">
        <button
          type="button"
          className={currentVote === 1 ? "is-selected is-upvote" : ""}
          aria-label="Upvote post"
          aria-pressed={currentVote === 1}
          onClick={() => void vote(1)}
          disabled={isVoting}
        >
          <i className="fa-solid fa-arrow-up" aria-hidden="true" />
        </button>
        <span>{currentScore}</span>
        <button
          type="button"
          className={currentVote === -1 ? "is-selected is-downvote" : ""}
          aria-label="Downvote post"
          aria-pressed={currentVote === -1}
          onClick={() => void vote(-1)}
          disabled={isVoting}
        >
          <i className="fa-solid fa-arrow-down" aria-hidden="true" />
        </button>
      </span>
      {!hideComments && (onCommentsToggle ? (
        <button
          type="button"
          aria-label={commentsOpen ? t("communityHideComments") : t("communityOpenComments")}
          aria-expanded={commentsOpen}
          onPointerEnter={onCommentsIntent}
          onFocus={onCommentsIntent}
          onTouchStart={onCommentsIntent}
          onClick={() => {
            onCommentsIntent?.();
            onCommentsToggle();
          }}
        >
          <i className="fa-regular fa-comment" aria-hidden="true" />
          <span>{commentCount}</span>
        </button>
      ) : (
        <Link
          href={`/community/${postId}#community-comments-title`}
          aria-label={t("communityOpenComments")}
          onPointerEnter={onCommentsIntent}
          onFocus={onCommentsIntent}
          onTouchStart={onCommentsIntent}
        >
          <i className="fa-regular fa-comment" aria-hidden="true" />
          <span>{commentCount}</span>
        </Link>
      ))}
      <span className="community-post-share-count" aria-label={`${currentShareCount} shares`}>
        <i className="fa-solid fa-retweet" aria-hidden="true" />
        <span>{currentShareCount}</span>
      </span>
      <button type="button" aria-label={t("communitySharePost")} onClick={() => void share()}>
        <i className={`fa-solid ${shared ? "fa-check" : "fa-share"}`} aria-hidden="true" />
        <span>{shared ? t("communityCopied") : t("communityShare")}</span>
      </button>
    </div>
  );
}
