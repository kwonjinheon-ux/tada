"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

export type ListingDetail = {
  id: string;
  title: string;
  price: string;
  location: string;
  description: string;
  condition: string;
  tradeMethod: string;
  meetingPlace: string | null;
  createdAt: string;
  status: "available" | "pending" | "sold";
  images: Array<{ src: string; alt: string }>;
};

const statusLabel = {
  available: "Available",
  pending: "Pending",
  sold: "Sold",
} as const;

function descriptionParagraphs(description: string) {
  const plainText = description
    .replace(/<br\s*\/?>(\r?\n)?/gi, "\n")
    .replace(/<\/?p[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .trim();

  return plainText.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean);
}

export function ListingDetailClient({ listing }: { listing: ListingDetail }) {
  const [activeImage, setActiveImage] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const paragraphs = useMemo(() => descriptionParagraphs(listing.description), [listing.description]);
  const image = listing.images[activeImage] ?? listing.images[0];

  return (
    <main className="listing-detail-page">
      <Link className="listing-detail-back" href="/market">
        <i className="fa-solid fa-arrow-left" aria-hidden="true" />
        Back to listings
      </Link>

      <div className="listing-detail-layout">
        <section className="listing-detail-gallery" aria-label={`${listing.title} photos`}>
          <div className="listing-detail-main-image">
            <Image src={image.src} alt={image.alt} fill priority sizes="(max-width: 900px) 100vw, 68vw" />
            <span className="listing-detail-image-count"><i className="fa-regular fa-images" aria-hidden="true" /> {listing.images.length}</span>
          </div>
          {listing.images.length > 1 ? (
            <div className="listing-detail-thumbnails" aria-label="Choose photo">
              {listing.images.map((photo, index) => (
                <button className={index === activeImage ? "is-active" : ""} type="button" key={photo.src} onClick={() => setActiveImage(index)} aria-label={`Show photo ${index + 1}`} aria-pressed={index === activeImage}>
                  <Image src={photo.src} alt="" fill sizes="96px" />
                </button>
              ))}
            </div>
          ) : null}
        </section>

        <aside className="listing-detail-summary">
          <div className="listing-detail-heading">
            <div>
              <div className="listing-detail-status-row"><span className={`listing-status status-${listing.status}`}>{statusLabel[listing.status]}</span><span>{listing.createdAt}</span></div>
              <h1>{listing.title}</h1>
            </div>
            <button className={`listing-detail-save ${isSaved ? "is-saved" : ""}`} type="button" aria-label={isSaved ? "Remove from saved items" : "Save listing"} aria-pressed={isSaved} onClick={() => setIsSaved((current) => !current)}>
              <i className={`${isSaved ? "fa-solid" : "fa-regular"} fa-heart`} aria-hidden="true" />
            </button>
          </div>
          <strong className="listing-detail-price">{listing.price}</strong>
          <p className="listing-detail-location"><i className="fa-solid fa-location-dot" aria-hidden="true" /> {listing.location}</p>

          <div className="listing-detail-actions">
            <button type="button" className="listing-detail-message"><i className="fa-regular fa-message" aria-hidden="true" /> Message seller</button>
            <button type="button" className="listing-detail-offer">Make an offer</button>
          </div>

          <dl className="listing-detail-facts">
            <div><dt>Condition</dt><dd>{listing.condition}</dd></div>
            <div><dt>Delivery</dt><dd>{listing.tradeMethod}</dd></div>
            {listing.meetingPlace ? <div><dt>Meet at</dt><dd>{listing.meetingPlace}</dd></div> : null}
          </dl>

          <div className="listing-detail-seller">
            <span className="listing-detail-seller-avatar">T</span>
            <div><strong>Tada seller</strong><span>Local marketplace member</span></div>
          </div>
        </aside>
      </div>

      <section className="listing-detail-description">
        <h2>About this item</h2>
        {paragraphs.length ? paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>) : <p>The seller has not added further details yet.</p>}
      </section>
    </main>
  );
}
