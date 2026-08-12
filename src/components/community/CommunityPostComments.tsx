"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";

type Comment = { id: string; authorId: string; authorName: string; authorAvatarUrl?: string | null; body: string; createdAt: string };

function relativeTime(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`;
}

export function CommunityPostComments({ postId }: { postId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/community/posts/${postId}/comments`, { cache: "no-store" });
    const payload = await response.json().catch(() => null) as { comments?: Comment[]; error?: string } | null;
    if (!response.ok) throw new Error(payload?.error || "Unable to load comments right now.");
    setComments(payload?.comments ?? []);
  }, [postId]);

  useEffect(() => { void load().catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load comments right now.")).finally(() => setIsLoading(false)); }, [load]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || isSubmitting) return;
    setIsSubmitting(true); setError(null);
    try {
      const response = await fetch(`/api/community/posts/${postId}/comments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body }) });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || "Unable to post your comment right now.");
      setDraft("");
      await load();
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "Unable to post your comment right now."); }
    finally { setIsSubmitting(false); }
  };

  return <section className="listing-comments" aria-labelledby="community-comments-title">
    <div className="listing-comments-heading"><h2 id="community-comments-title">Comments</h2><span>{comments.length} {comments.length === 1 ? "comment" : "comments"}</span></div>
    <form className="listing-comments-composer" onSubmit={submit}><div className="listing-comments-composer-avatar"><i className="fa-regular fa-user" aria-hidden="true" /></div><div><textarea value={draft} maxLength={2000} placeholder="Ask a question or leave a comment..." onChange={(event) => setDraft(event.target.value)} /><div className="listing-comments-composer-footer"><span>{draft.length}/2000</span><button type="submit" disabled={isSubmitting || !draft.trim()}>{isSubmitting ? "Posting..." : "Post"}</button></div></div></form>
    {error ? <p className="listing-comments-error" role="alert">{error}</p> : null}
    {isLoading ? <div className="listing-comments-skeleton" aria-label="Loading comments"><span /><span /><span /></div> : comments.length ? <div className="listing-comments-list">{comments.map((comment) => <article className="listing-comment depth-0" key={comment.id}><Avatar src={comment.authorAvatarUrl} name={comment.authorName} className="listing-comment-avatar" initials="double" /><div className="listing-comment-content"><div className="listing-comment-author-row"><strong>{comment.authorName}</strong><time dateTime={comment.createdAt}>{relativeTime(comment.createdAt)}</time></div><p>{comment.body}</p></div></article>)}</div> : null}
  </section>;
}
