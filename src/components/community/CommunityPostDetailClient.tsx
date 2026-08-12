"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ListingComments } from "@/components/market/ListingComments";
import { ListingSafetyActions } from "@/components/market/ListingSafetyActions";
import { CommunityPostActions } from "@/components/community/CommunityPostActions";
import { CommunityPostAuthor } from "@/components/community/CommunityPostAuthor";
import { CommunityPostOwnerMenu } from "@/components/community/CommunityPostOwnerMenu";
import { PageContainer } from "@/components/layout/PageContainer";
import { HtmlEditor } from "@/components/ui/HtmlEditor";
import { Button } from "@/components/ui/Button";
import { DialogOverlay, PopupBackdrop } from "@/components/ui/DialogOverlay";
import type { CommunityPostType } from "@/data/community-posts";

export type CommunityPostDetail = { id: string; type: CommunityPostType; title: string; body: string; location: string; createdAt: string; authorName: string; authorAvatarUrl: string | null; viewCount: number; isOwner: boolean; images: { src: string; alt: string }[] };

export function CommunityPostDetailClient({ post }: { post: CommunityPostDetail }) {
  const router = useRouter();
  const [activeImage, setActiveImage] = useState(0);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(post.title);
  const [editBody, setEditBody] = useState(post.body);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  useEffect(() => { void fetch(`/api/community/posts/${post.id}/view`, { method: "POST" }); }, [post.id]);
  const swipeStartX = useRef<number | null>(null);
  const image = post.images[activeImage];
  const showImage = (index: number) => setActiveImage((index + post.images.length) % post.images.length);
  const deletePost = async () => { if (isDeleting) return; setIsDeleting(true); setDeleteError(null); try { const response = await fetch(`/api/community/posts/${post.id}`, { method: "DELETE" }); const payload = await response.json().catch(() => null) as { error?: string } | null; if (!response.ok) throw new Error(payload?.error || "Unable to delete this post."); router.push("/community"); router.refresh(); } catch (error) { setDeleteError(error instanceof Error ? error.message : "Unable to delete this post."); setIsDeleting(false); } };
  const openEditDialog = () => { setEditTitle(post.title); setEditBody(post.body); setEditError(null); setIsEditDialogOpen(true); };
  const savePost = async () => { if (isSaving) return; setIsSaving(true); setEditError(null); try { const response = await fetch(`/api/community/posts/${post.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: editTitle, body: editBody }) }); const payload = await response.json().catch(() => null) as { error?: string } | null; if (!response.ok) throw new Error(payload?.error || "Unable to update this post."); setIsEditDialogOpen(false); router.refresh(); } catch (error) { setEditError(error instanceof Error ? error.message : "Unable to update this post."); } finally { setIsSaving(false); } };

  return <main className="listing-detail-page community-detail-page">
    <PageContainer className="community-detail-container">
      <nav className="community-detail-breadcrumb" aria-label="Breadcrumb"><Link href="/community">Community</Link><i className="fa-solid fa-chevron-right" aria-hidden="true" /><span>{post.type}</span></nav>
      <article className="ui-card community-detail-post">
        <header className="community-detail-post-header">
          <div className="community-detail-post-heading"><div className="community-detail-title-row"><span className={`community-post-badge community-post-badge-${post.type}`}>{post.type}</span><h1>{post.title}</h1></div><div className="community-detail-post-meta"><span><i className="fa-regular fa-eye" aria-hidden="true" /> {post.viewCount}</span><span><i className="fa-solid fa-location-dot" aria-hidden="true" /> {post.location}</span><span><i className="fa-regular fa-clock" aria-hidden="true" /> {post.createdAt}</span></div></div>
          <div className="community-detail-author"><CommunityPostAuthor name={post.authorName} avatarUrl={post.authorAvatarUrl} className="community-detail-author-identity" avatarClassName="community-detail-author-avatar" /></div>
        </header>
        {image ? <section className="listing-detail-gallery community-detail-gallery" aria-label={`${post.title} images`}><div className="listing-detail-main-image" role="button" tabIndex={0} aria-label={`Open photo ${activeImage + 1} of ${post.images.length} in gallery`} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setIsGalleryOpen(true); } }} onPointerDown={(event) => { swipeStartX.current = event.clientX; }} onPointerUp={(event) => { const distance = swipeStartX.current === null ? 0 : event.clientX - swipeStartX.current; swipeStartX.current = null; if (Math.abs(distance) < 12) setIsGalleryOpen(true); else if (Math.abs(distance) >= 42 && post.images.length > 1) showImage(activeImage + (distance < 0 ? 1 : -1)); }} onPointerCancel={() => { swipeStartX.current = null; }}><Image className="listing-detail-main-backdrop" src={image.src} alt="" fill aria-hidden="true" sizes="(max-width: 767px) 100vw, 960px" /><Image key={image.src} className="listing-detail-main-photo is-entering-from-next" src={image.src} alt={image.alt} fill priority sizes="(max-width: 767px) 100vw, 960px" />{post.images.length > 1 ? <><button className="listing-detail-gallery-arrow is-previous" type="button" aria-label="Previous image" onClick={(event) => { event.stopPropagation(); showImage(activeImage - 1); }}><i className="fa-solid fa-chevron-left" aria-hidden="true" /></button><button className="listing-detail-gallery-arrow is-next" type="button" aria-label="Next image" onClick={(event) => { event.stopPropagation(); showImage(activeImage + 1); }}><i className="fa-solid fa-chevron-right" aria-hidden="true" /></button></> : null}<span className="listing-detail-image-count"><i className="fa-regular fa-images" aria-hidden="true" /> {activeImage + 1} / {post.images.length}</span></div>{post.images.length > 1 ? <div className="listing-detail-thumbnails" aria-label="Choose photo">{post.images.map((photo, index) => <button className={index === activeImage ? "is-active" : ""} type="button" key={photo.src} onClick={() => showImage(index)} aria-label={`Show photo ${index + 1}`} aria-pressed={index === activeImage}><Image src={photo.src} alt="" fill sizes="96px" /></button>)}</div> : null}</section> : null}
        <div className="community-detail-body" dangerouslySetInnerHTML={{ __html: post.body }} />
        <footer className="community-detail-post-footer"><div className="community-detail-post-actions"><CommunityPostActions postId={post.id} compact />{post.isOwner ? <CommunityPostOwnerMenu onEdit={openEditDialog} onDelete={() => setIsDeleteDialogOpen(true)} /> : null}</div><div><ListingSafetyActions listingId={post.id} sellerId={null} sellerProfileVariant iconOnly space="community" /><Link href="/community">More community posts <i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link></div></footer>
      </article>
      <ListingComments listingId={post.id} space="community" />
    </PageContainer>
    {isGalleryOpen && image ? <PopupBackdrop className="listing-gallery-lightbox" role="dialog" aria-modal="true" aria-label={`${post.title} photo gallery`} onClose={() => setIsGalleryOpen(false)}><Image className="listing-gallery-lightbox-backdrop" src={image.src} alt="" fill aria-hidden="true" sizes="100vw" onClick={() => setIsGalleryOpen(false)} /><button className="listing-gallery-lightbox-close" type="button" aria-label="Close photo gallery" onClick={() => setIsGalleryOpen(false)}><i className="fa-solid fa-xmark" aria-hidden="true" /></button><div className="listing-gallery-lightbox-stage"><Image className="listing-gallery-lightbox-photo" src={image.src} alt={image.alt} fill priority sizes="100vw" /></div>{post.images.length > 1 ? <><button className="listing-gallery-lightbox-arrow is-previous" type="button" aria-label="Previous photo" onClick={() => showImage(activeImage - 1)}><i className="fa-solid fa-chevron-left" aria-hidden="true" /></button><button className="listing-gallery-lightbox-arrow is-next" type="button" aria-label="Next photo" onClick={() => showImage(activeImage + 1)}><i className="fa-solid fa-chevron-right" aria-hidden="true" /></button></> : null}<span className="listing-gallery-lightbox-count">{activeImage + 1} / {post.images.length}</span></PopupBackdrop> : null}
    {isEditDialogOpen ? <DialogOverlay className="listing-delete-backdrop" aria-labelledby="community-edit-title" onClose={() => setIsEditDialogOpen(false)} isDismissible={!isSaving}><section className="community-post-edit-dialog"><header><h2 id="community-edit-title">Edit post</h2><p>Update the title and details shared with your community.</p></header><form onSubmit={(event) => { event.preventDefault(); void savePost(); }}><div className="post-field"><label htmlFor="community-post-edit-title">Title</label><input id="community-post-edit-title" value={editTitle} onChange={(event) => setEditTitle(event.target.value)} minLength={4} maxLength={120} required /></div><HtmlEditor id="community-post-edit-body" label="Details" value={editBody} onChange={setEditBody} placeholder="Include the important details for your neighbours." />{editError ? <p className="listing-delete-error" role="alert">{editError}</p> : null}<div className="community-post-edit-actions"><Button type="button" variant="secondary" onClick={() => setIsEditDialogOpen(false)} disabled={isSaving}>Cancel</Button><Button type="submit" disabled={isSaving}>{isSaving ? "Saving..." : "Save changes"}</Button></div></form></section></DialogOverlay> : null}
    {isDeleteDialogOpen ? <DialogOverlay className="listing-delete-backdrop" aria-labelledby="community-delete-title" onClose={() => setIsDeleteDialogOpen(false)} isDismissible={!isDeleting}><section className="listing-delete-dialog"><div className="listing-delete-dialog-icon"><i className="fa-solid fa-trash-can" aria-hidden="true" /></div><h2 id="community-delete-title">Delete this post?</h2><p>This cannot be undone. The post, its images, and comments will be permanently removed.</p>{deleteError ? <p className="listing-delete-error" role="alert">{deleteError}</p> : null}<div><button type="button" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleting}>Cancel</button><button className="listing-delete-confirm" type="button" onClick={() => void deletePost()} disabled={isDeleting}>{isDeleting ? "Deleting..." : "Delete post"}</button></div></section></DialogOverlay> : null}
  </main>;
}
