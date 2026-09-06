"use client";

import { ImageLightbox } from "@/components/ui/ImageGallery";
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
  if (!item) return null;
  return <ImageLightbox images={items.map((entry) => entry.image)} activeIndex={activeIndex} onSelect={onSelect} onClose={onClose} caption={<div className="bargain-gallery-caption"><strong>{formatMarketPrice(item.priceCents)}</strong><p>{item.description}</p></div>} />;
}
