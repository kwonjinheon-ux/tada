"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { Button } from "@/components/ui/Button";

/** One registration entry point, using the existing product and service flows. */
export function NewListingMenu() {
  const { locale } = useLanguage();
  const ko = locale === "ko";
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeEscape);
    };
  }, [open]);

  return <div className="owned-listings-create" ref={root}>
    <Button aria-label={ko ? "새로 등록" : "Create new"} aria-expanded={open} aria-controls="owned-listings-create-menu" onClick={() => setOpen((value) => !value)}>
      <i className="ms ms-add" aria-hidden="true" /><span className="owned-listings-create-label-full">{ko ? "새로 등록" : "Create new"}</span><span className="owned-listings-create-label-short">{ko ? "등록" : "Create"}</span><i className="ms ms-expand-more" aria-hidden="true" />
    </Button>
    {open ? <div className="owned-listings-create-menu ui-panel menu-motion" id="owned-listings-create-menu">
      <Link href="/market/create" onClick={() => setOpen(false)}><i className="ms ms-shopping-bag" aria-hidden="true" />{ko ? "상품 등록" : "List an item"}</Link>
      <Link href="/services/create" onClick={() => setOpen(false)}><i className="ms ms-build" aria-hidden="true" />{ko ? "서비스 등록" : "List a service"}</Link>
    </div> : null}
  </div>;
}
