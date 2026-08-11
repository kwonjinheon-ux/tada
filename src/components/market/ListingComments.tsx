"use client";

import { type CSSProperties, FormEvent, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { descriptionTextScale } from "@/components/ui/TextSizeSection";

// Draws the reply-thread connector as smooth SVG curves from the parent
// comment's avatar centre to each reply's avatar centre, measured from the
// live DOM so it stays correct regardless of how tall each comment's text
// happens to render (unlike a fixed-offset CSS approximation).
function CommentThreadConnector({ signature }: { signature: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [paths, setPaths] = useState<string[]>([]);

  useLayoutEffect(() => {
    const svg = svgRef.current;
    const container = svg?.parentElement;
    if (!svg || !container) return;

    const measure = () => {
      const containerRect = container.getBoundingClientRect();
      const parentAvatar = container.closest(".listing-comment")?.querySelector<HTMLElement>(":scope > .listing-comment-avatar");
      const childAvatars = container.querySelectorAll<HTMLElement>(":scope > .listing-comment > .listing-comment-avatar");
      if (!parentAvatar || !childAvatars.length) {
        setPaths([]);
        return;
      }

      const parentRect = parentAvatar.getBoundingClientRect();
      const originX = parentRect.left + parentRect.width / 2 - containerRect.left;
      const originY = parentRect.top + parentRect.height / 2 - containerRect.top;

      setPaths(Array.from(childAvatars).map((avatar) => {
        const rect = avatar.getBoundingClientRect();
        // Enters the reply avatar at its left-centre, not its middle — the
        // line should touch the edge of the circle, not cut through it.
        const x = rect.left - containerRect.left;
        const y = rect.top + rect.height / 2 - containerRect.top;
        const radius = Math.max(0, Math.min(14, Math.abs(y - originY), Math.abs(x - originX)));
        const cornerY = y - radius;
        const cornerX = originX + radius;
        // Straight down, a single rounded corner, then straight across — not a
        // full curve along the whole run.
        return `M ${originX} ${originY} L ${originX} ${cornerY} Q ${originX} ${y} ${cornerX} ${y} L ${x} ${y}`;
      }));
    };

    measure();
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(container);
    window.addEventListener("resize", measure);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [signature]);

  return <svg ref={svgRef} className="listing-comment-connector" aria-hidden="true" focusable="false">
    {paths.map((d, index) => <path key={index} d={d} />)}
  </svg>;
}

type ListingComment = {
  id: string;
  parentId: string | null;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  depth: number;
  body: string;
  score: number;
  myVote: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  isPending?: boolean;
};

type CommentsResponse = { comments: ListingComment[]; currentUserId: string | null; error?: string };

function relativeTime(value: string) {
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days}d ago` : new Intl.DateTimeFormat("en-NZ", { day: "numeric", month: "short" }).format(new Date(value));
}

export function ListingComments({ listingId, textSizeStep = 0, space = "market" }: { listingId: string; textSizeStep?: number; space?: "market" | "bargain" }) {
  const apiBase = `/api/${space}`;
  const [comments, setComments] = useState<ListingComment[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyCommentId, setBusyCommentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<ListingComment | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());

  const expandThread = useCallback((commentId: string) => {
    setExpandedThreads((current) => current.has(commentId) ? current : new Set(current).add(commentId));
  }, []);
  const toggleThread = (commentId: string) => {
    setExpandedThreads((current) => {
      const next = new Set(current);
      if (next.has(commentId)) next.delete(commentId); else next.add(commentId);
      return next;
    });
  };

  const loadComments = useCallback(async () => {
    try {
      const response = await fetch(`${apiBase}/listings/${listingId}/comments`, { cache: "no-store" });
      const payload = await response.json().catch(() => null) as CommentsResponse | null;
      if (!response.ok || !payload) throw new Error(payload?.error || "Unable to load comments right now.");
      setComments(payload.comments);
      setCurrentUserId(payload.currentUserId);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load comments right now.");
    } finally {
      setIsLoading(false);
    }
  }, [apiBase, listingId]);

  useEffect(() => { void loadComments(); }, [loadComments]);

  const commentsByParent = useMemo(() => {
    const groups = new Map<string | null, ListingComment[]>();
    for (const comment of comments) {
      const group = groups.get(comment.parentId) ?? [];
      group.push(comment);
      groups.set(comment.parentId, group);
    }
    for (const group of groups.values()) {
      group.sort((left, right) => right.score - left.score || new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
    }
    return groups;
  }, [comments]);

  const rootComments = commentsByParent.get(null) ?? [];
  const activeCommentCount = comments.filter((comment) => !comment.deletedAt).length;

  const submitComment = async (event: FormEvent<HTMLFormElement>, parentId: string | null = null) => {
    event.preventDefault();
    const body = parentId ? replyDraft.trim() : draft.trim();
    if (!body || isSubmitting) return;

    const parent = parentId ? comments.find((comment) => comment.id === parentId) : null;
    const optimisticComment: ListingComment = {
      id: `pending-${typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Date.now()}`,
      parentId,
      authorId: currentUserId ?? "pending-user",
      authorName: "You",
      authorAvatarUrl: null,
      depth: parent ? parent.depth + 1 : 0,
      body,
      score: 0,
      myVote: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      isPending: true,
    };

    // Render immediately; the server response is reconciled in the background.
    setComments((current) => [...current, optimisticComment]);
    if (parentId) {
      expandThread(parentId);
      setReplyDraft("");
      setReplyTo(null);
    } else {
      setDraft("");
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`${apiBase}/listings/${listingId}/comments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body, parentId }) });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (response.status === 401) throw new Error("Please log in to post a comment.");
      if (!response.ok) throw new Error(payload?.error || "Unable to post your comment right now.");
      void loadComments();
    } catch (submitError) {
      setComments((current) => current.filter((comment) => comment.id !== optimisticComment.id));
      if (parentId) {
        setReplyTo(parent ?? null);
        setReplyDraft(body);
      } else {
        setDraft(body);
      }
      setError(submitError instanceof Error ? submitError.message : "Unable to post your comment right now.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const vote = async (comment: ListingComment, value: -1 | 1) => {
    if (!currentUserId) {
      setError("Please log in to vote on a comment.");
      return;
    }
    if (busyCommentId) return;
    setBusyCommentId(comment.id);
    try {
      const targetValue = comment.myVote === value ? 0 : value;
      const response = await fetch(`${apiBase}/comments/${comment.id}/vote`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ value: targetValue }) });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || "Unable to record your vote.");
      await loadComments();
    } catch (voteError) {
      setError(voteError instanceof Error ? voteError.message : "Unable to record your vote.");
    } finally {
      setBusyCommentId(null);
    }
  };

  const saveEdit = async (comment: ListingComment) => {
    const body = editDraft.trim();
    if (!body || busyCommentId) return;
    setBusyCommentId(comment.id);
    try {
      const response = await fetch(`${apiBase}/comments/${comment.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body }) });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || "Unable to update this comment.");
      setEditingId(null);
      await loadComments();
    } catch (editError) {
      setError(editError instanceof Error ? editError.message : "Unable to update this comment.");
    } finally {
      setBusyCommentId(null);
    }
  };

  const deleteComment = async (comment: ListingComment) => {
    if (!window.confirm("Delete this comment? Replies will remain visible.")) return;
    setBusyCommentId(comment.id);
    try {
      const response = await fetch(`${apiBase}/comments/${comment.id}`, { method: "DELETE" });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || "Unable to delete this comment.");
      await loadComments();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete this comment.");
    } finally {
      setBusyCommentId(null);
    }
  };

  const renderComment = (comment: ListingComment) => {
    const children = commentsByParent.get(comment.id) ?? [];
    const isOwner = comment.authorId === currentUserId;
    const canReply = !comment.deletedAt && comment.depth < 2;
    const isEditing = editingId === comment.id;
    const isReplying = replyTo?.id === comment.id;
    const isThreadOpen = expandedThreads.has(comment.id);

    return <article className={`listing-comment depth-${comment.depth}`} key={comment.id}>
      <Avatar src={comment.authorAvatarUrl} name={comment.authorName} className="listing-comment-avatar" initials="double" />
      <div className="listing-comment-content">
        <div className="listing-comment-author-row"><strong>{comment.authorName}</strong><time dateTime={comment.createdAt}>{relativeTime(comment.createdAt)}</time>{comment.updatedAt !== comment.createdAt && !comment.deletedAt ? <span className="listing-comment-edited">Edited</span> : null}</div>
        {isEditing ? <div className="listing-comment-edit"><textarea value={editDraft} maxLength={2000} onChange={(event) => setEditDraft(event.target.value)} aria-label="Edit comment" /><div><button className="listing-comment-text-button" type="button" onClick={() => void saveEdit(comment)} disabled={busyCommentId === comment.id}>Save</button><button className="listing-comment-text-button is-muted" type="button" onClick={() => setEditingId(null)}>Cancel</button></div></div> : <p className={comment.deletedAt ? "is-deleted" : ""}>{comment.deletedAt ? "This comment was deleted." : comment.body}</p>}
        {!comment.deletedAt ? <div className="listing-comment-tools"><button type="button" className={comment.myVote === 1 ? "is-selected" : ""} onClick={() => void vote(comment, 1)} disabled={busyCommentId === comment.id} aria-label="Upvote comment"><i className="fa-solid fa-arrow-up" aria-hidden="true" /> <span>{comment.score}</span></button><button type="button" className={comment.myVote === -1 ? "is-selected is-downvote" : ""} onClick={() => void vote(comment, -1)} disabled={busyCommentId === comment.id} aria-label="Downvote comment"><i className="fa-solid fa-arrow-down" aria-hidden="true" /></button>{canReply ? <button type="button" className="listing-comment-text-button" onClick={() => { setReplyTo(comment); setReplyDraft(""); expandThread(comment.id); }}>Reply</button> : null}{isOwner ? <><button type="button" className="listing-comment-text-button" onClick={() => { setEditingId(comment.id); setEditDraft(comment.body); }}>Edit</button><button type="button" className="listing-comment-text-button is-danger" onClick={() => void deleteComment(comment)}>Delete</button></> : null}</div> : null}
        {isReplying ? <form className="listing-comment-reply-form" onSubmit={(event) => void submitComment(event, comment.id)}><textarea value={replyDraft} maxLength={2000} placeholder={`Reply to ${comment.authorName}`} onChange={(event) => setReplyDraft(event.target.value)} autoFocus /><div><button className="listing-comment-cancel-button" type="button" onClick={() => setReplyTo(null)}>Cancel</button><button className="listing-comment-post-button" type="submit" disabled={isSubmitting || !replyDraft.trim()}>{isSubmitting ? "Posting..." : "Reply"}</button></div></form> : null}
        {children.length ? <button type="button" className="listing-comment-thread-toggle" aria-expanded={isThreadOpen} onClick={() => toggleThread(comment.id)}>
          <i className={`fa-solid ${isThreadOpen ? "fa-chevron-up" : "fa-chevron-down"}`} aria-hidden="true" />
          {isThreadOpen ? "Hide replies" : `${children.length} ${children.length === 1 ? "reply" : "replies"}`}
        </button> : null}
        {children.length && isThreadOpen ? <div className="listing-comment-children">
          <CommentThreadConnector signature={children.map((child) => child.id).join(",")} />
          {children.map(renderComment)}
        </div> : null}
      </div>
    </article>;
  };

  return <section className="listing-comments" aria-labelledby="listing-comments-title" style={{ "--text-scale": descriptionTextScale(textSizeStep) } as CSSProperties}>
    <div className="listing-comments-heading"><h2 id="listing-comments-title">Comments</h2><span>{activeCommentCount} {activeCommentCount === 1 ? "comment" : "comments"}</span></div>
    <form className="listing-comments-composer" onSubmit={(event) => void submitComment(event)}><div className="listing-comments-composer-avatar"><i className="fa-regular fa-user" aria-hidden="true" /></div><div><textarea value={draft} maxLength={2000} placeholder="Ask a question or leave a comment..." onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} /><div className="listing-comments-composer-footer"><span>{draft.length}/2000</span><button type="submit" disabled={isSubmitting || !draft.trim()}>{isSubmitting ? "Posting..." : "Post"}</button></div></div></form>
    {error ? <p className="listing-comments-error" role="alert">{error}</p> : null}
    {isLoading ? <div className="listing-comments-skeleton" aria-label="Loading comments"><span /><span /><span /></div> : rootComments.length ? <div className="listing-comments-list">{rootComments.map(renderComment)}</div> : null}
  </section>;
}
