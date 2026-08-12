"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { TextSizeSection } from "@/components/ui/TextSizeSection";
import { ListingComments } from "@/components/market/ListingComments";
import type { CommunityPostType } from "@/data/community-posts";

export type CommunityPostDetail = { id: string; type: CommunityPostType; title: string; body: string; location: string; createdAt: string; images: { src: string; alt: string }[] };

export function CommunityPostDetailClient({ post }: { post: CommunityPostDetail }) {
  const [activeImage, setActiveImage] = useState(0);
  const image = post.images[activeImage];
  return <main className="listing-detail-page community-detail-page">
    <div className="listing-detail-back-row"><Link className="listing-detail-back" href="/community"><i className="fa-solid fa-arrow-left" aria-hidden="true" /> Back to community</Link></div>
    <div className="listing-detail-layout">
      {image ? <section className="listing-detail-gallery" aria-label={`${post.title} images`}><div className="listing-detail-main-image"><Image className="listing-detail-main-photo" src={image.src} alt={image.alt} fill priority sizes="(max-width: 900px) 100vw, 68vw" />{post.images.length > 1 ? <><button className="listing-detail-gallery-arrow is-previous" type="button" aria-label="Previous image" onClick={() => setActiveImage((current) => (current - 1 + post.images.length) % post.images.length)}><i className="fa-solid fa-chevron-left" aria-hidden="true" /></button><button className="listing-detail-gallery-arrow is-next" type="button" aria-label="Next image" onClick={() => setActiveImage((current) => (current + 1) % post.images.length)}><i className="fa-solid fa-chevron-right" aria-hidden="true" /></button></> : null}<span className="listing-detail-image-count"><i className="fa-regular fa-images" aria-hidden="true" /> {post.images.length}</span></div>{post.images.length > 1 ? <div className="listing-detail-thumbnails" aria-label="Choose image">{post.images.map((photo, index) => <button className={index === activeImage ? "is-active" : ""} type="button" key={photo.src} onClick={() => setActiveImage(index)} aria-label={`Show image ${index + 1}`} aria-pressed={index === activeImage}><Image src={photo.src} alt="" fill sizes="96px" /></button>)}</div> : null}</section> : <section className="listing-detail-gallery community-detail-placeholder" aria-hidden="true"><i className="fa-regular fa-file-lines" /></section>}
      <aside className="listing-detail-summary"><div className="listing-detail-heading"><div><div className="listing-detail-status-row"><span className={`community-post-badge community-post-badge-${post.type}`}>{post.type}</span><span>{post.createdAt}</span></div><h1>{post.title}</h1></div></div><p className="listing-detail-location"><i className="fa-solid fa-location-dot" aria-hidden="true" /> {post.location}</p></aside>
    </div>
    <TextSizeSection className="listing-detail-description" title="Details"><div className="community-detail-body" dangerouslySetInnerHTML={{ __html: post.body }} /></TextSizeSection>
    <ListingComments listingId={post.id} space="community" />
  </main>;
}
