"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { DialogOverlay } from "@/components/ui/DialogOverlay";
import { useLanguage } from "@/components/LanguageProvider";

export type GalleryImage = { src: string; alt: string };

export function ImageLightbox({ images, activeIndex, onSelect, onClose, caption }: {
  images: GalleryImage[]; activeIndex: number; onSelect: (index: number) => void; onClose: () => void; caption?: ReactNode;
}) {
  const { locale } = useLanguage();
  const closeRef = useRef<HTMLButtonElement>(null);
  const callbacks = useRef({ onClose, onSelect, activeIndex });
  callbacks.current = { onClose, onSelect, activeIndex };
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      const current = callbacks.current;
      if (event.key === "Escape") current.onClose();
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault();
        current.onSelect((current.activeIndex + (event.key === "ArrowRight" ? 1 : -1) + images.length) % images.length);
      }
      if (event.key === "Tab") {
        const buttons = closeRef.current?.parentElement?.querySelectorAll<HTMLButtonElement>("button");
        if (!buttons?.length) return;
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", keydown);
    return () => { document.body.style.overflow = overflow; window.removeEventListener("keydown", keydown); previous?.focus(); };
  }, [images.length]);
  const image = images[activeIndex] ?? images[0];
  if (!image) return null;
  return createPortal(<DialogOverlay className="listing-gallery-lightbox shared-image-lightbox" onClose={onClose} aria-label={image.alt}>
    <Image className="listing-gallery-lightbox-backdrop" src={image.src} alt="" fill sizes="100vw" aria-hidden="true" onClick={onClose} />
    <button ref={closeRef} className="listing-gallery-lightbox-close" type="button" aria-label={locale === "ko" ? "사진 닫기" : "Close photo"} onClick={onClose}><i className="ms ms-close" aria-hidden="true" /></button>
    <div className="listing-gallery-lightbox-stage" onClick={(event) => {
      const photo = event.currentTarget.querySelector("img");
      if (!photo?.naturalWidth) { onClose(); return; }
      const box = event.currentTarget.getBoundingClientRect();
      const scale = Math.min(box.width / photo.naturalWidth, box.height / photo.naturalHeight);
      const width = photo.naturalWidth * scale, height = photo.naturalHeight * scale;
      if (Math.abs(event.clientX - box.left - box.width / 2) > width / 2 || Math.abs(event.clientY - box.top - box.height / 2) > height / 2) onClose();
    }}><Image className="listing-gallery-lightbox-photo" src={image.src} alt={image.alt} fill sizes="100vw" /></div>
    {images.length > 1 ? <>{[-1, 1].map((direction) => <button key={direction} className={`listing-gallery-lightbox-arrow ${direction < 0 ? "is-previous" : "is-next"}`} type="button" aria-label={direction < 0 ? "Previous photo" : "Next photo"} onClick={() => onSelect((activeIndex + direction + images.length) % images.length)}><i className={direction < 0 ? "ms ms-chevron-left" : "ms ms-chevron-right"} aria-hidden="true" /></button>)}</> : null}
    {caption}
    <span className="listing-gallery-lightbox-count">{activeIndex + 1} / {images.length}<br />{locale === "ko" ? "사진 바깥을 누르면 닫힙니다" : "Click outside the photo to close"}</span>
  </DialogOverlay>, document.body);
}

export function ImageGallery({ images, className = "", priority = false }: { images: GalleryImage[]; className?: string; priority?: boolean }) {
  const [selected, setSelected] = useState(0);
  const [open, setOpen] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const active = Math.min(selected, Math.max(0, images.length - 1));
  const image = images[active];
  if (!image) return null;
  return <section className={`listing-detail-gallery shared-image-gallery ${className}`} aria-label={image.alt}>
    <div className="listing-detail-main-image">
      <Image className="listing-detail-main-backdrop" src={image.src} alt="" fill sizes="(max-width: 767px) 100vw, 960px" aria-hidden="true" />
      <button className="shared-image-gallery-open" type="button" aria-label="Enlarge photo" onClick={() => { if (!swiped.current) setOpen(true); swiped.current = false; }} onPointerDown={(event) => { swiped.current = false; start.current = { x: event.clientX, y: event.clientY }; }} onPointerCancel={() => { start.current = null; }} onPointerUp={(event) => {
        const origin = start.current; start.current = null;
        if (origin && Math.abs(event.clientX - origin.x) > 42 && Math.abs(event.clientX - origin.x) > Math.abs(event.clientY - origin.y)) { swiped.current = true; setSelected((active + (event.clientX < origin.x ? 1 : -1) + images.length) % images.length); }
      }}><Image className="listing-detail-main-photo" src={image.src} alt={image.alt} fill priority={priority} sizes="(max-width: 767px) 100vw, 960px" /></button>
      <span className="listing-detail-image-count"><i className="ms ms-photo-library" aria-hidden="true" /> {active + 1} / {images.length}</span>
      {images.length > 1 ? [-1, 1].map((direction) => <button key={direction} type="button" className={`listing-detail-gallery-arrow ${direction < 0 ? "is-previous" : "is-next"}`} aria-label={direction < 0 ? "Previous photo" : "Next photo"} onClick={() => setSelected((active + direction + images.length) % images.length)}><i className={direction < 0 ? "ms ms-chevron-left" : "ms ms-chevron-right"} aria-hidden="true" /></button>) : null}
    </div>
    {images.length > 1 ? <div className="listing-detail-thumbnails">{images.map((photo, index) => <button key={`${photo.src}-${index}`} type="button" className={index === active ? "is-active" : ""} aria-label={`Show photo ${index + 1}`} aria-pressed={index === active} onClick={() => setSelected(index)}><Image src={photo.src} alt="" fill sizes="96px" /></button>)}</div> : null}
    {open ? <ImageLightbox images={images} activeIndex={active} onSelect={setSelected} onClose={() => setOpen(false)} /> : null}
  </section>;
}
