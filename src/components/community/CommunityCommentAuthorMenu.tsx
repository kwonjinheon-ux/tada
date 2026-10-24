"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { useLanguage } from "@/components/LanguageProvider";

export function CommunityCommentAuthorMenu({ authorId, name, avatarUrl, avatarClassName = "listing-comment-avatar", menuClassName = "community-comment-author-menu" }: { authorId: string; name: string; avatarUrl: string | null; avatarClassName?: string; menuClassName?: string }) {
  const { locale } = useLanguage();
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const ko = locale === "ko";
  const profileHref = `/market/sellers/${authorId}`;
  const postsHref = `/community/members/${authorId}`;

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
      <Avatar src={avatarUrl} name={name} className={avatarClassName} initials="double" />
    </button>
    {open ? <div className="community-comment-author-popover" role="menu">
      <Link href={profileHref} role="menuitem" onClick={() => setOpen(false)}><i className="ms ms-person" aria-hidden="true" />{ko ? "프로필 보기" : "View profile"}</Link>
      <Link href={postsHref} role="menuitem" onClick={() => setOpen(false)}><i className="ms ms-forum" aria-hidden="true" />{ko ? "다른 글 보기" : "View other posts"}</Link>
    </div> : null}
  </div>;
}
