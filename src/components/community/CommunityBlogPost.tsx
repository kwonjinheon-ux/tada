"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { CommunityPostComments } from "@/components/community/CommunityPostComments";
import { communityPostTypeLabelKeys, type CommunityPost } from "@/data/community-posts";

function safeHtml(value: string) {
  const allowed = new Set(["p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li", "blockquote", "code", "pre"]);
  return value.replace(/<\/?([a-z0-9]+)(?:\s[^>]*)?>/gi, (tag, name: string) => allowed.has(name.toLowerCase()) ? (tag.startsWith("</") ? `</${name.toLowerCase()}>` : `<${name.toLowerCase()}>`) : "");
}

export function CommunityBlogPost({ post, showTypeBadge }: { post: CommunityPost; showTypeBadge: boolean }) {
  const { t } = useLanguage();
  const [activeImage, setActiveImage] = useState(0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const images = post.images?.length ? post.images : post.image ? [{ src: post.image, alt: post.imageAlt ?? post.title }] : [];
  const responseCount = post.responseCount ?? 0;

  return <article className={`community-blog-post community-post-card-${post.type}`}>
    <div className="community-blog-post-heading">
      {showTypeBadge ? <span className={`community-post-badge community-post-badge-${post.type}`}>{t(communityPostTypeLabelKeys[post.type])}</span> : null}
      <h2><Link href={`/community/${post.id}`}>{post.title}</Link></h2>
      <div className="community-post-meta"><span><i className="fa-solid fa-location-dot" aria-hidden="true" />{post.location}</span>{post.eventDate ? <span><i className="fa-regular fa-calendar" aria-hidden="true" />{post.eventDate}</span> : null}{post.timeAgo ? <span><i className="fa-regular fa-clock" aria-hidden="true" />{post.timeAgo}</span> : null}</div>
    </div>
    <div className="community-blog-post-content" dangerouslySetInnerHTML={{ __html: safeHtml(post.excerpt) }} />
    {images.length ? <div className="community-blog-gallery"><div className="community-blog-main-image"><Image src={images[activeImage].src} alt={images[activeImage].alt} fill sizes="(max-width: 767px) 100vw, 720px" /></div>{images.length > 1 ? <div className="community-blog-thumbnails" aria-label="Post images">{images.map((image, index) => <button type="button" key={image.src} className={activeImage === index ? "is-active" : ""} onClick={() => setActiveImage(index)} aria-label={`Show image ${index + 1}`}><Image src={image.src} alt="" fill sizes="72px" /></button>)}</div> : null}</div> : null}
    <div className="community-blog-post-footer"><button type="button" className="listing-comment-text-button" aria-expanded={commentsOpen} onClick={() => setCommentsOpen((open) => !open)}><i className={`fa-regular ${commentsOpen ? "fa-comment-dots" : "fa-comment"}`} aria-hidden="true" /> {commentsOpen ? "Hide comments" : `Show comments${responseCount ? ` (${responseCount})` : ""}`}</button><Link href={`/community/${post.id}`}>Open post <i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link></div>
    {commentsOpen ? <CommunityPostComments postId={post.id} /> : null}
  </article>;
}
