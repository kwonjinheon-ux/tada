"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { CommunityPostSaveButton } from "@/components/community/CommunityPostSaveButton";
import { CommunityVoteArrow } from "@/components/community/CommunityVoteArrow";

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

    // Only a copy or a completed share sheet counts: a blocked clipboard, a
    // missing share API or a dismissed sheet must not report success.
    let didShare = false;
    try {
      await navigator.clipboard.writeText(summary);
      didShare = true;
    } catch {
      try {
        if (navigator.share) {
          await navigator.share({ title, text: excerpt, url });
          didShare = true;
        }
      } catch {
        // The viewer dismissed the share sheet.
      }
    }
    if (!didShare) return;

    try {
      const response = await fetch(`/api/community/posts/${postId}/engagement`, { method: "POST" });
      const payload = response.ok ? await response.json() as { shareCount?: number } : null;
      if (typeof payload?.shareCount === "number") setCurrentShareCount(payload.shareCount);
    } catch {
      // The link is already shared, so a failed counter update is not worth surfacing.
    }
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
        // The feed cards and the detail page both render this score from the
        // server, so drop the cached payloads still holding the pre-vote count.
        router.refresh();
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
          className={`is-upvote ${currentVote === 1 ? "is-selected" : ""}`.trim()}
          aria-label="Upvote post"
          aria-pressed={currentVote === 1}
          onClick={() => void vote(1)}
          disabled={isVoting}
        >
          <CommunityVoteArrow direction="up" />
        </button>
        <span>{currentScore}</span>
        <button
          type="button"
          className={`is-downvote ${currentVote === -1 ? "is-selected" : ""}`.trim()}
          aria-label="Downvote post"
          aria-pressed={currentVote === -1}
          onClick={() => void vote(-1)}
          disabled={isVoting}
        >
          <CommunityVoteArrow direction="down" />
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
          <i className="ms ms-chat-bubble" aria-hidden="true" />
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
          <i className="ms ms-chat-bubble" aria-hidden="true" />
          <span>{commentCount}</span>
        </Link>
      ))}
      <span className="community-post-share-count" aria-label={`${currentShareCount} shares`}>
        <i className="ms ms-repeat" aria-hidden="true" />
        <span>{currentShareCount}</span>
      </span>
      <button type="button" aria-label={t("communitySharePost")} onClick={() => void share()}>
        <i className={`ms ${shared ? "ms-check" : "ms-share"}`} aria-hidden="true" />
        <span>{shared ? t("communityCopied") : t("communityShare")}</span>
      </button>
    </div>
  );
}
