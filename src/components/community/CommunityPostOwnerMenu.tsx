"use client";

import { useEffect, useRef, useState } from "react";
import { IconButton } from "@/components/ui/IconButton";
import { useLanguage } from "@/components/LanguageProvider";

export function CommunityPostOwnerMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => { if (!menuRef.current?.contains(event.target as Node)) setIsOpen(false); };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setIsOpen(false); };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => { document.removeEventListener("mousedown", closeOnOutsideClick); document.removeEventListener("keydown", closeOnEscape); };
  }, []);

  return <div ref={menuRef} className="community-post-owner-menu">
    <IconButton className="community-post-owner-menu-trigger" aria-label={t("communityPostOptions")} aria-haspopup="menu" aria-expanded={isOpen} onClick={() => setIsOpen((current) => !current)}><i className="fa-solid fa-ellipsis-vertical" aria-hidden="true" /></IconButton>
    {isOpen ? <div className="community-post-owner-menu-popover" role="menu" aria-label={t("communityPostOptions")}><button type="button" role="menuitem" onClick={() => { setIsOpen(false); onEdit(); }}><i className="fa-regular fa-pen-to-square" aria-hidden="true" />{t("communityEditPostHeading")}</button><button className="is-danger" type="button" role="menuitem" onClick={() => { setIsOpen(false); onDelete(); }}><i className="fa-regular fa-trash-can" aria-hidden="true" />{t("communityDeletePostAction")}</button></div> : null}
  </div>;
}
