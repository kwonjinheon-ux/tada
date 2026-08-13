"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { CommunityPostActions } from "@/components/community/CommunityPostActions";
import { CommunityPostComments } from "@/components/community/CommunityPostComments";
import { CommunityPostAuthor } from "@/components/community/CommunityPostAuthor";
import { CommunityPostOwnerMenu } from "@/components/community/CommunityPostOwnerMenu";
import { useLanguage } from "@/components/LanguageProvider";
import { communityPostTypeLabelKeys, type CommunityPost } from "@/data/community-posts";
import { prefetchComments } from "@/lib/comment-cache";

function safeHtml(value: string) { const allowed = new Set(["p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li", "blockquote", "code", "pre"]); return value.replace(/<\/?([a-z0-9]+)(?:\s[^>]*)?>/gi, (tag, name: string) => allowed.has(name.toLowerCase()) ? (tag.startsWith("</") ? `</${name.toLowerCase()}>` : `<${name.toLowerCase()}>`) : ""); }

export function CommunityBlogPost({ post, showTypeBadge, mutedTypeBadge = false }: { post: CommunityPost; showTypeBadge: boolean; mutedTypeBadge?: boolean }) {
  const { t } = useLanguage(); const [activeImage, setActiveImage] = useState(0); const [commentsOpen, setCommentsOpen] = useState(false); const [hasOpenedComments, setHasOpenedComments] = useState(false); const [viewCount, setViewCount] = useState(post.viewCount ?? 0); const articleRef = useRef<HTMLElement>(null); const hasRecordedView = useRef(false); const gallerySwipeStart = useRef<{ x: number; y: number } | null>(null);
  const images = post.images?.length ? post.images : post.image ? [{ src: post.image, alt: post.imageAlt ?? post.title }] : [];
  const count = post.responseCount ?? 0; const showImage = (next: number) => setActiveImage((next + images.length) % images.length); const hasPrefetchedComments = useRef(false); const prefetchPostComments = useCallback(() => { if (!count || hasPrefetchedComments.current) return; hasPrefetchedComments.current = true; void prefetchComments(post.id, "community"); }, [count, post.id]);
  useEffect(() => {
    const article = articleRef.current;
    if (!article || hasRecordedView.current) return;
    let timer: number | null = null;
    const recordView = () => { void fetch(`/api/community/posts/${post.id}/view`, { method: "POST" }).then((response) => response.ok ? response.json() as Promise<{ viewCount?: number }> : null).then((result) => { if (typeof result?.viewCount === "number") setViewCount(result.viewCount); hasRecordedView.current = true; }).catch(() => undefined); };
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting && entry.intersectionRatio >= 0.5 && !timer && !hasRecordedView.current) timer = window.setTimeout(recordView, 3000); else if ((!entry.isIntersecting || entry.intersectionRatio < 0.5) && timer) { window.clearTimeout(timer); timer = null; } }, { threshold: [0, 0.5] });
    observer.observe(article);
    return () => { observer.disconnect(); if (timer) window.clearTimeout(timer); };
  }, [post.id]);
  useEffect(() => {
    const article = articleRef.current;
    if (!article || !count || hasPrefetchedComments.current) return;
    let cancelIdleWork: () => void = () => {};
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || entry.intersectionRatio < 0.5) return;
      observer.disconnect();
      const idleWindow = window as Window & { requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number; cancelIdleCallback?: (handle: number) => void };
      if (idleWindow.requestIdleCallback && idleWindow.cancelIdleCallback) {
        const idleId = idleWindow.requestIdleCallback(prefetchPostComments, { timeout: 1200 });
        cancelIdleWork = () => idleWindow.cancelIdleCallback?.(idleId);
      } else {
        const timeoutId = window.setTimeout(prefetchPostComments, 250);
        cancelIdleWork = () => window.clearTimeout(timeoutId);
      }
    }, { threshold: [0, 0.5] });
    observer.observe(article);
    return () => { observer.disconnect(); cancelIdleWork(); };
  }, [count, prefetchPostComments]);
  return <article ref={articleRef} className={`community-blog-post community-post-card-${post.type}`}>
    <div className="community-blog-post-heading"><div className="community-blog-title-row">{showTypeBadge ? <span className={`community-post-badge community-post-badge-${post.type} ${mutedTypeBadge ? "is-muted" : ""}`}>{t(communityPostTypeLabelKeys[post.type])}</span> : null}<h2><Link href={`/community/${post.id}`}>{post.title}</Link></h2></div><div className="community-blog-author-row"><div className="community-post-meta"><span><i className="fa-regular fa-eye" aria-hidden="true" />{new Intl.NumberFormat("en-NZ").format(viewCount)}</span><span><i className="fa-solid fa-location-dot" aria-hidden="true" />{post.location}</span>{post.eventDate ? <span><i className="fa-regular fa-calendar" aria-hidden="true" />{post.eventDate}</span> : null}{post.timeAgo ? <span><i className="fa-regular fa-clock" aria-hidden="true" />{post.timeAgo}</span> : null}</div><CommunityPostAuthor name={post.authorName} avatarUrl={post.authorAvatarUrl} className="community-blog-author" avatarClassName="community-blog-author-avatar" /></div></div>
    <div className="community-blog-post-content" dangerouslySetInnerHTML={{ __html: safeHtml(post.excerpt) }} />
    {images.length ? <div className="community-blog-gallery"><div className="community-blog-main-image" onTouchStart={(event) => { if ((event.target as HTMLElement).closest("button")) return; const touch = event.touches[0]; if (touch) gallerySwipeStart.current = { x: touch.clientX, y: touch.clientY }; }} onTouchEnd={(event) => { const start = gallerySwipeStart.current; gallerySwipeStart.current = null; const touch = event.changedTouches[0]; if (!start || !touch) return; const deltaX = touch.clientX - start.x; const deltaY = touch.clientY - start.y; if (Math.abs(deltaX) < 42 || Math.abs(deltaX) <= Math.abs(deltaY)) return; showImage(activeImage + (deltaX < 0 ? 1 : -1)); }} onTouchCancel={() => { gallerySwipeStart.current = null; }}><Image className="community-blog-main-backdrop" src={images[activeImage].src} alt="" fill aria-hidden="true" sizes="(max-width: 767px) 100vw, 720px" /><Image key={images[activeImage].src} className="community-blog-main-photo" src={images[activeImage].src} alt={images[activeImage].alt} fill sizes="(max-width: 767px) 100vw, 720px" />{images.length > 1 ? <><button className="community-blog-gallery-arrow is-previous" type="button" aria-label="Previous image" onClick={() => showImage(activeImage - 1)}><i className="fa-solid fa-chevron-left" aria-hidden="true" /></button><button className="community-blog-gallery-arrow is-next" type="button" aria-label="Next image" onClick={() => showImage(activeImage + 1)}><i className="fa-solid fa-chevron-right" aria-hidden="true" /></button><span className="community-blog-image-count">{activeImage + 1} / {images.length}</span></> : null}</div></div> : null}
    <div className="community-blog-post-footer"><div><CommunityPostActions postId={post.id} title={post.title} body={post.excerpt} commentCount={count} score={post.score} myVote={post.myVote} shareCount={post.shareCount} initialIsSaved={post.isSaved} commentsOpen={commentsOpen} onCommentsIntent={prefetchPostComments} onCommentsToggle={() => { prefetchPostComments(); setHasOpenedComments(true); setCommentsOpen((open) => !open); }} /></div><div><CommunityPostOwnerMenu postId={post.id} onEdit={post.isOwner ? () => window.location.assign(`/community/${post.id}?action=edit`) : undefined} onDelete={post.isOwner ? () => window.location.assign(`/community/${post.id}?action=delete`) : undefined} /></div></div>
    <div className={`community-blog-comments-panel ${commentsOpen ? "is-open" : ""}`}><div>{hasOpenedComments ? <CommunityPostComments postId={post.id} /> : null}</div></div>
  </article>;
}
