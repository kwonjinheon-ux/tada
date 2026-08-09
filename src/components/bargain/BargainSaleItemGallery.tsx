"use client";

import Image from "next/image";
import { useCallback, useEffect } from "react";
import { DialogOverlay } from "@/components/ui/DialogOverlay";
import { formatMarketPrice } from "@/lib/market/format-price";

type GalleryItem = {
  id: string;
  title: string;
  description: string;
  priceCents: number;
  image: { src: string; alt: string };
};

type BargainSaleItemGalleryProps = {
  activeIndex: number;
  items: GalleryItem[];
  onClose: () => void;
  onSelect: (index: number) => void;
};

export function BargainSaleItemGallery({ activeIndex, items, onClose, onSelect }: BargainSaleItemGalleryProps) {
  const item = items[activeIndex];
  const showItem = useCallback((index: number) => onSelect((index + items.length) % items.length), [items.length, onSelect]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") showItem(activeIndex - 1);
      if (event.key === "ArrowRight") showItem(activeIndex + 1);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, onClose, showItem]);

  if (!item) return null;

  return <DialogOverlay className="bargain-sale-item-gallery" onClose={onClose} aria-label={`${item.title} photo gallery`} dismissHint="Click outside to close">
    <section className="bargain-sale-item-gallery-panel">
      <button className="bargain-sale-item-gallery-close" type="button" aria-label="Close photo gallery" onClick={onClose}><i className="fa-solid fa-xmark" aria-hidden="true" /></button>
      <div className="bargain-sale-item-gallery-stage">
        <Image key={item.id} src={item.image.src} alt={item.image.alt} fill priority unoptimized sizes="100vw" />
      </div>
      <div className="bargain-sale-item-gallery-copy">
        <div><h2>{item.title}</h2><strong>{formatMarketPrice(item.priceCents)}</strong></div>
        <p>{item.description}</p>
      </div>
      {items.length > 1 ? <>
        <button className="bargain-sale-item-gallery-arrow is-previous" type="button" aria-label="Previous item" onClick={() => showItem(activeIndex - 1)}><i className="fa-solid fa-chevron-left" aria-hidden="true" /></button>
        <button className="bargain-sale-item-gallery-arrow is-next" type="button" aria-label="Next item" onClick={() => showItem(activeIndex + 1)}><i className="fa-solid fa-chevron-right" aria-hidden="true" /></button>
      </> : null}
      <span className="bargain-sale-item-gallery-count">{activeIndex + 1} / {items.length}</span>
    </section>
  </DialogOverlay>;
}
