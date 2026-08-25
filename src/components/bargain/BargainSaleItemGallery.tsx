"use client";

import Image from "next/image";
import { useCallback, useEffect, useState, type MouseEvent } from "react";
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
  const [direction, setDirection] = useState<"next" | "previous">("next");
  const showItem = useCallback((index: number, nextDirection: "next" | "previous") => {
    setDirection(nextDirection);
    onSelect((index + items.length) % items.length);
  }, [items.length, onSelect]);

  const closeWhenClickingOutsidePhoto = (event: MouseEvent<HTMLDivElement>) => {
    const stage = event.currentTarget;
    const photo = stage.querySelector<HTMLImageElement>(".listing-gallery-lightbox-photo");

    if (!photo?.naturalWidth || !photo.naturalHeight) {
      onClose();
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

    if (!clickedInsidePhoto) onClose();
  };

  useEffect(() => {
    document.body.classList.add("listing-gallery-open");
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") showItem(activeIndex - 1, "previous");
      if (event.key === "ArrowRight") showItem(activeIndex + 1, "next");
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.classList.remove("listing-gallery-open");
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeIndex, onClose, showItem]);

  if (!item) return null;

  return <DialogOverlay className="listing-gallery-lightbox bargain-sale-item-gallery" onClose={onClose} aria-label={`${item.title} photo gallery`}>
    <Image className="listing-gallery-lightbox-backdrop" src={item.image.src} alt="" fill aria-hidden="true" unoptimized sizes="100vw" />
    <button className="listing-gallery-lightbox-close" type="button" aria-label="Close photo gallery" onClick={onClose}><i className="ti ti-x" aria-hidden="true" /></button>
    <div className="listing-gallery-lightbox-stage" onClick={closeWhenClickingOutsidePhoto}>
      <Image key={item.id} className={`listing-gallery-lightbox-photo bargain-gallery-slide-${direction}`} src={item.image.src} alt={item.image.alt} fill priority unoptimized sizes="100vw" />
    </div>
    {items.length > 1 ? <>
      <button className="listing-gallery-lightbox-arrow is-previous" type="button" aria-label="Previous item" onClick={() => showItem(activeIndex - 1, "previous")}><i className="ti ti-chevron-left" aria-hidden="true" /></button>
      <button className="listing-gallery-lightbox-arrow is-next" type="button" aria-label="Next item" onClick={() => showItem(activeIndex + 1, "next")}><i className="ti ti-chevron-right" aria-hidden="true" /></button>
    </> : null}
    <div className="bargain-gallery-caption" key={`caption-${item.id}`}>
      <strong>{formatMarketPrice(item.priceCents)}</strong>
      <p>{item.description}</p>
    </div>
    <span className="listing-gallery-lightbox-count">{activeIndex + 1} / {items.length}</span>
  </DialogOverlay>;
}
