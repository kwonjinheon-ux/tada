"use client";

import { ImageGallery } from "@/components/ui/ImageGallery";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ListingComments } from "@/components/market/ListingComments";
import { CommunityPostActions } from "@/components/community/CommunityPostActions";
import { CommunityPostAuthor } from "@/components/community/CommunityPostAuthor";
import { CommunityPostOwnerMenu } from "@/components/community/CommunityPostOwnerMenu";
import { CommunityCategoryPosts } from "@/components/community/CommunityCategoryPosts";
import { CommunityDesktopLayout } from "@/components/community/CommunityDesktopLayout";
import type { CommunityCategory } from "@/components/community/CommunityFilterSidebar";
import { HtmlEditor } from "@/components/ui/HtmlEditor";
import { Button } from "@/components/ui/Button";
import { DialogOverlay } from "@/components/ui/DialogOverlay";
import { useLanguage } from "@/components/LanguageProvider";
import { communityPostTypeLabelKeys, type CommunityPostType } from "@/data/community-posts";

export type CommunityPostDetail = { id: string; type: CommunityPostType; title: string; body: string; location: string; createdAt: string; authorName: string | null; authorAvatarUrl: string | null; viewCount: number; score: number; myVote: -1 | 0 | 1; shareCount: number; responseCount: number; isOwner: boolean; isSaved: boolean; images: { src: string; alt: string }[] };

export function CommunityPostDetailClient({ post, relatedCategory, initialAction }: { post: CommunityPostDetail; relatedCategory?: Exclude<CommunityCategory, "all">; initialAction?: "edit" | "delete" }) {
  const { t } = useLanguage();
  const router = useRouter();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(initialAction === "delete");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(initialAction === "edit");
  const [editTitle, setEditTitle] = useState(post.title);
  const [editBody, setEditBody] = useState(post.body);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [viewCount, setViewCount] = useState(post.viewCount);
  const hasRecordedView = useRef(false);
  useEffect(() => {
    if (hasRecordedView.current) return;
    hasRecordedView.current = true;
    void fetch(`/api/community/posts/${post.id}/view`, { method: "POST" })
      .then((response) => response.ok ? response.json() as Promise<{ viewCount?: number }> : null)
      .then((result) => { if (typeof result?.viewCount === "number") setViewCount(result.viewCount); })
      .catch(() => undefined);
  }, [post.id]);
  const deletePost = async () => { if (isDeleting) return; setIsDeleting(true); setDeleteError(null); try { const response = await fetch(`/api/community/posts/${post.id}`, { method: "DELETE" }); const payload = await response.json().catch(() => null) as { error?: string } | null; if (!response.ok) throw new Error(payload?.error || t("communityUnableToDelete")); router.push("/community"); router.refresh(); } catch (error) { setDeleteError(error instanceof Error ? error.message : t("communityUnableToDelete")); setIsDeleting(false); } };
  const openEditDialog = () => { setEditTitle(post.title); setEditBody(post.body); setEditError(null); setIsEditDialogOpen(true); };
  const savePost = async () => { if (isSaving) return; setIsSaving(true); setEditError(null); try { const response = await fetch(`/api/community/posts/${post.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: editTitle, body: editBody }) }); const payload = await response.json().catch(() => null) as { error?: string } | null; if (!response.ok) throw new Error(payload?.error || t("communityUnableToUpdate")); setIsEditDialogOpen(false); router.refresh(); } catch (error) { setEditError(error instanceof Error ? error.message : t("communityUnableToUpdate")); } finally { setIsSaving(false); } };

  return <>
    <CommunityDesktopLayout activeCategory={relatedCategory ?? "all"}>
      <div className="listing-detail-page community-detail-page community-detail-container">
      <nav className="detail-breadcrumb" aria-label="Breadcrumb"><Link href="/community">{t("community")}</Link><i className="ms ms-chevron-right" aria-hidden="true" /><span>{t(communityPostTypeLabelKeys[post.type])}</span></nav>
      <article className="ui-card community-detail-post">
        <header className="community-detail-post-header">
          <div className="community-detail-post-heading"><div className="community-detail-title-row"><h1>{post.title}</h1></div><div className="community-detail-post-meta"><span>조회수 {new Intl.NumberFormat("en-NZ").format(viewCount)}</span><span><i className="ms ms-location-on" aria-hidden="true" /> {post.location}</span><span><i className="ms ms-schedule" aria-hidden="true" /> {post.createdAt}</span></div></div>
          <div className="community-detail-author"><CommunityPostAuthor name={post.authorName} avatarUrl={post.authorAvatarUrl} className="community-detail-author-identity" avatarClassName="community-detail-author-avatar" /></div>
        </header>
        <ImageGallery images={post.images} className="community-detail-gallery" priority />
        <div className="community-detail-body" dangerouslySetInnerHTML={{ __html: post.body }} />
        <footer className="community-detail-post-footer"><div className="community-detail-post-actions"><CommunityPostActions postId={post.id} title={post.title} body={post.body} commentCount={post.responseCount} score={post.score} myVote={post.myVote} shareCount={post.shareCount} initialIsSaved={post.isSaved} isOwner={post.isOwner} /><CommunityPostOwnerMenu postId={post.id} onEdit={post.isOwner ? openEditDialog : undefined} onDelete={post.isOwner ? () => setIsDeleteDialogOpen(true) : undefined} /></div></footer>
      </article>
      <ListingComments listingId={post.id} space="community" />
      {relatedCategory ? <CommunityCategoryPosts category={relatedCategory} currentPostId={post.id} /> : null}
      </div>
    </CommunityDesktopLayout>
    {isEditDialogOpen ? <DialogOverlay className="listing-delete-backdrop" aria-labelledby="community-edit-title" onClose={() => setIsEditDialogOpen(false)} isDismissible={!isSaving}><section className="community-post-edit-dialog"><header><h2 id="community-edit-title">{t("communityEditPostHeading")}</h2><p>{t("communityEditPostDesc")}</p></header><form onSubmit={(event) => { event.preventDefault(); void savePost(); }}><div className="post-field"><label htmlFor="community-post-edit-title">{t("communityTitleLabel")}</label><input id="community-post-edit-title" value={editTitle} onChange={(event) => setEditTitle(event.target.value)} minLength={4} maxLength={120} required /></div><HtmlEditor id="community-post-edit-body" label={t("communityDetailsLabel")} value={editBody} onChange={setEditBody} placeholder={t("communityDetailsPlaceholder")} />{editError ? <p className="listing-delete-error" role="alert">{editError}</p> : null}<div className="community-post-edit-actions"><Button type="button" variant="secondary" onClick={() => setIsEditDialogOpen(false)} disabled={isSaving}>{t("cancel")}</Button><Button type="submit" disabled={isSaving}>{isSaving ? t("saving") : t("saveChanges")}</Button></div></form></section></DialogOverlay> : null}
    {isDeleteDialogOpen ? <DialogOverlay className="listing-delete-backdrop" aria-labelledby="community-delete-title" onClose={() => setIsDeleteDialogOpen(false)} isDismissible={!isDeleting}><section className="listing-delete-dialog"><div className="listing-delete-dialog-icon"><i className="ms ms-delete" aria-hidden="true" /></div><h2 id="community-delete-title">{t("communityDeletePostHeading")}</h2><p>{t("communityDeletePostWarning")}</p>{deleteError ? <p className="listing-delete-error" role="alert">{deleteError}</p> : null}<div><button type="button" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleting}>{t("cancel")}</button><button className="listing-delete-confirm" type="button" onClick={() => void deletePost()} disabled={isDeleting}>{isDeleting ? t("communityDeletingPost") : t("communityDeletePostAction")}</button></div></section></DialogOverlay> : null}
  </>;
}
