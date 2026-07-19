"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

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

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "T";
}

function CommentAvatar({ comment }: { comment: ListingComment }) {
  return comment.authorAvatarUrl ? <img className="listing-comment-avatar" src={comment.authorAvatarUrl} alt="" /> : <span className="listing-comment-avatar">{initials(comment.authorName)}</span>;
}

export function ListingComments({ listingId }: { listingId: string }) {
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

  const loadComments = useCallback(async () => {
    try {
      const response = await fetch(`/api/market/listings/${listingId}/comments`, { cache: "no-store" });
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
  }, [listingId]);

  useEffect(() => { void loadComments(); }, [loadComments]);

  const commentsByParent = useMemo(() => {
    const groups = new Map<string | null, ListingComment[]>();
    for (const comment of comments) {
      const group = groups.get(comment.parentId) ?? [];
      group.push(comment);
      groups.set(comment.parentId, group);
    }
    for (const [parentId, group] of groups) {
      group.sort((left, right) => parentId === null
        ? right.score - left.score || new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
        : new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
    }
    return groups;
  }, [comments]);

  const rootComments = commentsByParent.get(null) ?? [];
  const activeRootCount = rootComments.filter((comment) => !comment.deletedAt).length;

  const submitComment = async (event: FormEvent<HTMLFormElement>, parentId: string | null = null) => {
    event.preventDefault();
    const body = parentId ? replyDraft.trim() : draft.trim();
    if (!body || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/market/listings/${listingId}/comments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body, parentId }) });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (response.status === 401) throw new Error("Please log in to post a comment.");
      if (!response.ok) throw new Error(payload?.error || "Unable to post your comment right now.");
      if (parentId) {
        setReplyDraft("");
        setReplyTo(null);
      } else setDraft("");
      await loadComments();
    } catch (submitError) {
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
      const response = await fetch(`/api/market/comments/${comment.id}/vote`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ value: targetValue }) });
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
      const response = await fetch(`/api/market/comments/${comment.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body }) });
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
      const response = await fetch(`/api/market/comments/${comment.id}`, { method: "DELETE" });
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

    return <article className={`listing-comment depth-${comment.depth}`} key={comment.id}>
      <CommentAvatar comment={comment} />
      <div className="listing-comment-content">
        <div className="listing-comment-author-row"><strong>{comment.authorName}</strong><time dateTime={comment.createdAt}>{relativeTime(comment.createdAt)}</time>{comment.updatedAt !== comment.createdAt && !comment.deletedAt ? <span className="listing-comment-edited">Edited</span> : null}</div>
        {isEditing ? <div className="listing-comment-edit"><textarea value={editDraft} maxLength={2000} onChange={(event) => setEditDraft(event.target.value)} aria-label="Edit comment" /><div><button className="listing-comment-text-button" type="button" onClick={() => void saveEdit(comment)} disabled={busyCommentId === comment.id}>Save</button><button className="listing-comment-text-button is-muted" type="button" onClick={() => setEditingId(null)}>Cancel</button></div></div> : <p className={comment.deletedAt ? "is-deleted" : ""}>{comment.deletedAt ? "This comment was deleted." : comment.body}</p>}
        {!comment.deletedAt ? <div className="listing-comment-tools"><button type="button" className={comment.myVote === 1 ? "is-selected" : ""} onClick={() => void vote(comment, 1)} disabled={busyCommentId === comment.id} aria-label="Upvote comment"><i className="fa-solid fa-arrow-up" aria-hidden="true" /> <span>{comment.score}</span></button><button type="button" className={comment.myVote === -1 ? "is-selected is-downvote" : ""} onClick={() => void vote(comment, -1)} disabled={busyCommentId === comment.id} aria-label="Downvote comment"><i className="fa-solid fa-arrow-down" aria-hidden="true" /></button>{canReply ? <button type="button" className="listing-comment-text-button" onClick={() => { setReplyTo(comment); setReplyDraft(""); }}>Reply</button> : null}{isOwner ? <><button type="button" className="listing-comment-text-button" onClick={() => { setEditingId(comment.id); setEditDraft(comment.body); }}>Edit</button><button type="button" className="listing-comment-text-button is-danger" onClick={() => void deleteComment(comment)}>Delete</button></> : null}</div> : null}
        {isReplying ? <form className="listing-comment-reply-form" onSubmit={(event) => void submitComment(event, comment.id)}><textarea value={replyDraft} maxLength={2000} placeholder={`Reply to ${comment.authorName}`} onChange={(event) => setReplyDraft(event.target.value)} autoFocus /><div><button className="listing-comment-cancel-button" type="button" onClick={() => setReplyTo(null)}>Cancel</button><button className="listing-comment-post-button" type="submit" disabled={isSubmitting || !replyDraft.trim()}>{isSubmitting ? "Posting..." : "Reply"}</button></div></form> : null}
        {children.length ? <div className="listing-comment-children">{children.map(renderComment)}</div> : null}
      </div>
    </article>;
  };

  return <section className="listing-comments" aria-labelledby="listing-comments-title">
    <div className="listing-comments-heading"><h2 id="listing-comments-title">Q&amp;A &amp; Comments</h2><span>{activeRootCount} {activeRootCount === 1 ? "comment" : "comments"}</span></div>
    <form className="listing-comments-composer" onSubmit={(event) => void submitComment(event)}><div className="listing-comments-composer-avatar"><i className="fa-regular fa-user" aria-hidden="true" /></div><div><textarea value={draft} maxLength={2000} placeholder="Ask a question or leave a comment..." onChange={(event) => setDraft(event.target.value)} /><div className="listing-comments-composer-footer"><span>{draft.length}/2000</span><button type="submit" disabled={isSubmitting || !draft.trim()}>{isSubmitting ? "Posting..." : "Post"}</button></div></div></form>
    {error ? <p className="listing-comments-error" role="alert">{error}</p> : null}
    {isLoading ? <div className="listing-comments-skeleton" aria-label="Loading comments"><span /><span /><span /></div> : rootComments.length ? <div className="listing-comments-list">{rootComments.map(renderComment)}</div> : null}
  </section>;
}
