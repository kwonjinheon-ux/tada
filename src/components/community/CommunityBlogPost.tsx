"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ListingSafetyActions } from "@/components/market/ListingSafetyActions";
import { CommunityPostComments } from "@/components/community/CommunityPostComments";
import { Avatar } from "@/components/ui/Avatar";
import { useLanguage } from "@/components/LanguageProvider";
import { communityPostTypeLabelKeys, type CommunityPost } from "@/data/community-posts";

function safeHtml(value: string) { const allowed = new Set(["p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li", "blockquote", "code", "pre"]); return value.replace(/<\/?([a-z0-9]+)(?:\s[^>]*)?>/gi, (tag, name: string) => allowed.has(name.toLowerCase()) ? (tag.startsWith("</") ? `</${name.toLowerCase()}>` : `<${name.toLowerCase()}>`) : ""); }

export function CommunityBlogPost({ post, showTypeBadge }: { post: CommunityPost; showTypeBadge: boolean }) {
  const { t } = useLanguage(); const [activeImage, setActiveImage] = useState(0); const [commentsOpen, setCommentsOpen] = useState(false); const [hasOpenedComments, setHasOpenedComments] = useState(false);
  const images = post.images?.length ? post.images : post.image ? [{ src: post.image, alt: post.imageAlt ?? post.title }] : [];
  const count = post.responseCount ?? 0; const showImage = (next: number) => setActiveImage((next + images.length) % images.length);
  return <article className={`community-blog-post community-post-card-${post.type}`}>
    <div className="community-blog-post-heading"><div className="community-blog-title-row">{showTypeBadge ? <span className={`community-post-badge community-post-badge-${post.type}`}>{t(communityPostTypeLabelKeys[post.type])}</span> : null}<h2><Link href={`/community/${post.id}`}>{post.title}</Link></h2></div><div className="community-blog-author-row"><div className="community-post-meta"><span><i className="fa-solid fa-location-dot" aria-hidden="true" />{post.location}</span>{post.eventDate ? <span><i className="fa-regular fa-calendar" aria-hidden="true" />{post.eventDate}</span> : null}{post.timeAgo ? <span><i className="fa-regular fa-clock" aria-hidden="true" />{post.timeAgo}</span> : null}</div><span className="community-blog-author"><Avatar name="Community member" className="community-blog-author-avatar" initials="double" /><span>Community member</span></span></div></div>
    <div className="community-blog-post-content" dangerouslySetInnerHTML={{ __html: safeHtml(post.excerpt) }} />
    {images.length ? <div className="community-blog-gallery"><div className="community-blog-main-image"><Image key={images[activeImage].src} className="community-blog-main-photo" src={images[activeImage].src} alt={images[activeImage].alt} fill sizes="(max-width: 767px) 100vw, 720px" />{images.length > 1 ? <><button className="community-blog-gallery-arrow is-previous" type="button" aria-label="Previous image" onClick={() => showImage(activeImage - 1)}><i className="fa-solid fa-chevron-left" aria-hidden="true" /></button><button className="community-blog-gallery-arrow is-next" type="button" aria-label="Next image" onClick={() => showImage(activeImage + 1)}><i className="fa-solid fa-chevron-right" aria-hidden="true" /></button><span className="community-blog-image-count">{activeImage + 1} / {images.length}</span></> : null}</div></div> : null}
    <div className="community-blog-post-footer"><button type="button" className="listing-comment-text-button" aria-expanded={commentsOpen} onClick={() => { setHasOpenedComments(true); setCommentsOpen((open) => !open); }}><i className={`fa-regular ${commentsOpen ? "fa-comment-dots" : "fa-comment"}`} aria-hidden="true" /> {commentsOpen ? "Hide comments" : `Show comments (${count})`}</button><div><ListingSafetyActions listingId={post.id} sellerId={null} sellerProfileVariant iconOnly space="community" /><Link href={`/community/${post.id}`}>Open post <i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link></div></div>
    <div className={`community-blog-comments-panel ${commentsOpen ? "is-open" : ""}`}><div>{hasOpenedComments ? <CommunityPostComments postId={post.id} /> : null}</div></div>
  </article>;
}
