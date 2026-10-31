"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { useLanguage } from "@/components/LanguageProvider";

type AuthorMenuProps = {
  authorId: string;
  name: string;
  avatarUrl: string | null;
  avatarClassName?: string;
  menuClassName?: string;
  /** What the avatar button wraps. Defaults to the avatar; the market passes its
   *  own, which carries the seller's online ring. */
  trigger?: ReactNode;
  /** "View other …" link. Community points at the member's posts; the market at
   *  the seller's listings. */
  otherHref?: string;
  otherLabel?: string;
  otherIcon?: string;
  /** Rows after the links (report, block). Receives `close` so a row can dismiss the menu. */
  extraItems?: (close: () => void) => ReactNode;
};

/** The avatar-button menu shared by Community and the Market: tap a member's
 *  photo, get a small menu that grows out of it. */
export function CommunityCommentAuthorMenu({ authorId, name, avatarUrl, avatarClassName = "listing-comment-avatar", menuClassName = "community-comment-author-menu", trigger, otherHref, otherLabel, otherIcon = "ms-forum", extraItems }: AuthorMenuProps) {
  const { locale } = useLanguage();
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const ko = locale === "ko";
  const profileHref = `/market/sellers/${authorId}`;
  const postsHref = otherHref ?? `/community/members/${authorId}`;
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return <div ref={menuRef} className={menuClassName}>
    <button type="button" className="community-comment-author-trigger" aria-label={ko ? `${name} 프로필 메뉴 열기` : `Open ${name}'s profile menu`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
      {trigger ?? <Avatar src={avatarUrl} name={name} className={avatarClassName} initials="double" />}
    </button>
    {open ? <div className="community-comment-author-popover menu-motion" role="menu">
      <Link href={profileHref} role="menuitem" onClick={close}><i className="ms ms-person" aria-hidden="true" />{ko ? "프로필 보기" : "View profile"}</Link>
      <Link href={postsHref} role="menuitem" onClick={close}><i className={`ms ${otherIcon}`} aria-hidden="true" />{otherLabel ?? (ko ? "다른 글 보기" : "View other posts")}</Link>
      {extraItems?.(close)}
    </div> : null}
  </div>;
}
