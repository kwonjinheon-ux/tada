"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { type CommunityPost } from "@/data/community-posts";
import { CommunityPostAuthor } from "@/components/community/CommunityPostAuthor";
import { CommunityPostBadge } from "@/components/community/CommunityPostBadge";
import { CommunityPostSaveButton } from "@/components/community/CommunityPostSaveButton";
import { CommentCountBadge } from "@/components/ui/CommentCountBadge";
import { DialogOverlay } from "@/components/ui/DialogOverlay";

export function CommunityPostCard({ post, showTypeBadge = true, mutedTypeBadge = false, href }: { post: CommunityPost; showTypeBadge?: boolean; mutedTypeBadge?: boolean; href?: string }) {
  const [activeImage, setActiveImage] = useState(0);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const responseCount = post.responseCount ?? 0;
  const countTone = responseCount <= 10 ? "low" : responseCount <= 20 ? "medium" : responseCount <= 30 ? "high" : "hot";
  const featuredImage = post.images?.[0] ?? (post.image ? { src: post.image, alt: post.imageAlt ?? "" } : null);
  const galleryImages = post.images?.length ? post.images : featuredImage ? [featuredImage] : [];
  const galleryImage = galleryImages[activeImage];
  const showImage = useCallback((index: number) => setActiveImage((index + galleryImages.length) % galleryImages.length), [galleryImages.length]);
  const closeGalleryWhenClickingOutsidePhoto = (event: MouseEvent<HTMLDivElement>) => {
    const stage = event.currentTarget;
    const photo = stage.querySelector<HTMLImageElement>(".listing-gallery-lightbox-photo");
    if (!photo?.naturalWidth || !photo.naturalHeight) {
      setIsGalleryOpen(false);
      return;
    }
    const stageBounds = stage.getBoundingClientRect();
    const stageRatio = stageBounds.width / stageBounds.height;
    const imageRatio = photo.naturalWidth / photo.naturalHeight;
    const imageWidth = imageRatio > stageRatio ? stageBounds.width : stageBounds.height * imageRatio;
    const imageHeight = imageRatio > stageRatio ? stageBounds.width / imageRatio : stageBounds.height;
    const left = stageBounds.left + (stageBounds.width - imageWidth) / 2;
    const top = stageBounds.top + (stageBounds.height - imageHeight) / 2;
    const clickedInsidePhoto = event.clientX >= left && event.clientX <= left + imageWidth && event.clientY >= top && event.clientY <= top + imageHeight;
    if (!clickedInsidePhoto) setIsGalleryOpen(false);
  };

  useEffect(() => {
    if (!isGalleryOpen) return;
    document.body.classList.add("listing-gallery-open");
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsGalleryOpen(false);
      if (galleryImages.length > 1 && event.key === "ArrowLeft") showImage(activeImage - 1);
      if (galleryImages.length > 1 && event.key === "ArrowRight") showImage(activeImage + 1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("listing-gallery-open");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeImage, galleryImages.length, isGalleryOpen, showImage]);

  return (
    <article className={`community-post-card community-post-card-${post.type} ${featuredImage ? "" : "community-post-card-no-media"}`}>
      <div className="community-post-card-link">
        {featuredImage ? <button className="community-post-media" type="button" aria-label={`Open ${post.title} photo gallery`} onClick={() => { setActiveImage(0); setIsGalleryOpen(true); }}><img src={post.thumbnail ?? featuredImage.src} alt={featuredImage.alt} width={200} height={200} loading="lazy" decoding="async" /></button> : null}
        <Link className="community-post-body-link" href={href ?? `/community/${post.id}`} aria-label={`Open ${post.title}`} onClick={() => { void fetch(`/api/community/posts/${post.id}/view`, { method: "POST", keepalive: true }); }}>
          <div className="community-post-body">
          <div className="community-post-title-row">
            {showTypeBadge ? <CommunityPostBadge type={post.type} muted={mutedTypeBadge} /> : null}
            <h2>{post.title}<CommentCountBadge count={responseCount} className={`community-post-comment-count is-${countTone}`} /></h2>
          </div>
          <div className="community-post-meta">
            <span className="community-post-vote-summary" aria-label={`${post.score ?? 0} votes`}><i className="fa-solid fa-arrow-up" aria-hidden="true" />{new Intl.NumberFormat("en-NZ").format(post.score ?? 0)}<i className="fa-solid fa-arrow-down" aria-hidden="true" /></span>
            <span><i className="fa-regular fa-eye" aria-hidden="true" />{new Intl.NumberFormat("en-NZ").format(post.viewCount ?? 0)}</span>
            <span><i className="fa-solid fa-location-dot" aria-hidden="true" />{post.location}</span>
            {post.eventDate ? <span><i className="fa-regular fa-calendar" aria-hidden="true" />{post.eventDate}</span> : null}
            {post.timeAgo ? <span><i className="fa-regular fa-clock" aria-hidden="true" />{post.timeAgo}</span> : null}
            <CommunityPostAuthor name={post.authorName} avatarUrl={post.authorAvatarUrl} className="community-post-author" avatarClassName="community-post-author-avatar" />
          </div>
          </div>
        </Link>
        {!post.isOwner ? <CommunityPostSaveButton postId={post.id} initialIsSaved={post.isSaved} className="community-post-card-save" redirectTo={href ?? `/community/${post.id}`} /> : null}
      </div>
      {isGalleryOpen && galleryImage ? <DialogOverlay className="listing-gallery-lightbox" aria-label={`${post.title} photo gallery`} onClose={() => setIsGalleryOpen(false)} dismissHint="Click outside to close">
        <img className="listing-gallery-lightbox-backdrop" src={galleryImage.src} alt="" aria-hidden="true" />
        <button className="listing-gallery-lightbox-close" type="button" aria-label="Close photo gallery" onClick={() => setIsGalleryOpen(false)}><i className="fa-solid fa-xmark" aria-hidden="true" /></button>
        <div className="listing-gallery-lightbox-stage" onClick={closeGalleryWhenClickingOutsidePhoto}>
          <img className="listing-gallery-lightbox-photo" src={galleryImage.src} alt={galleryImage.alt} />
        </div>
        {galleryImages.length > 1 ? <><button className="listing-gallery-lightbox-arrow is-previous" type="button" aria-label="Previous photo" onClick={() => showImage(activeImage - 1)}><i className="fa-solid fa-chevron-left" aria-hidden="true" /></button><button className="listing-gallery-lightbox-arrow is-next" type="button" aria-label="Next photo" onClick={() => showImage(activeImage + 1)}><i className="fa-solid fa-chevron-right" aria-hidden="true" /></button><span className="listing-gallery-lightbox-count">{activeImage + 1} / {galleryImages.length}</span></> : null}
      </DialogOverlay> : null}
    </article>
  );
}
