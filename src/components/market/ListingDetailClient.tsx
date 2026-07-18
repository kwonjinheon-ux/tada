"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createHeartParticles, SaveHeartBurst, type HeartParticle } from "@/components/SaveHeartBurst";

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
  seller: { name: string; avatarUrl: string | null };
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
  const [isPopping, setIsPopping] = useState(false);
  const [heartParticles, setHeartParticles] = useState<HeartParticle[]>([]);
  const burstTimer = useRef<number | null>(null);
  const swipeStartX = useRef<number | null>(null);
  const paragraphs = useMemo(() => descriptionParagraphs(listing.description), [listing.description]);
  const image = listing.images[activeImage] ?? listing.images[0];

  useEffect(() => () => {
    if (burstTimer.current) window.clearTimeout(burstTimer.current);
  }, []);

  const showImage = (index: number) => setActiveImage((index + listing.images.length) % listing.images.length);
  const saveListing = () => {
    setIsSaved((current) => !current);
    setIsPopping(false);
    setHeartParticles(createHeartParticles());
    window.requestAnimationFrame(() => setIsPopping(true));
    if (burstTimer.current) window.clearTimeout(burstTimer.current);
    burstTimer.current = window.setTimeout(() => setHeartParticles([]), 1_050);
  };

  const shareListing = async () => {
    const shareData = { title: listing.title, text: `${listing.title} - ${listing.price}`, url: window.location.href };
    if (navigator.share) {
      await navigator.share(shareData);
      return;
    }
    await navigator.clipboard?.writeText(window.location.href);
  };

  return (
    <main className="listing-detail-page">
      <Link className="listing-detail-back" href="/market">
        <i className="fa-solid fa-arrow-left" aria-hidden="true" />
        Back to listings
      </Link>

      <div className="listing-detail-layout">
        <section className="listing-detail-gallery" aria-label={`${listing.title} photos`}>
          <div className="listing-detail-main-image" onPointerDown={(event) => { swipeStartX.current = event.clientX; }} onPointerUp={(event) => {
            if (swipeStartX.current === null || listing.images.length < 2) return;
            const distance = event.clientX - swipeStartX.current;
            swipeStartX.current = null;
            if (Math.abs(distance) < 42) return;
            showImage(activeImage + (distance < 0 ? 1 : -1));
          }} onPointerCancel={() => { swipeStartX.current = null; }}>
            <Image src={image.src} alt={image.alt} fill priority sizes="(max-width: 900px) 100vw, 68vw" />
            <span className="listing-detail-mobile-badge listing-detail-mobile-only">Newly listed</span>
            <div className="listing-detail-mobile-image-actions listing-detail-mobile-only">
              <button type="button" aria-label="Share listing" onClick={() => void shareListing()}><i className="fa-solid fa-arrow-up-from-bracket" aria-hidden="true" /></button>
              <button className={`save-button ${isSaved ? "is-saved" : ""} ${isPopping ? "is-popping" : ""}`} type="button" aria-label={isSaved ? "Remove from saved items" : "Save listing"} aria-pressed={isSaved} onClick={saveListing} onAnimationEnd={(event) => { if (event.currentTarget === event.target) setIsPopping(false); }}><i className={`${isSaved ? "fa-solid" : "fa-regular"} fa-heart`} aria-hidden="true" /><SaveHeartBurst particles={heartParticles} /></button>
            </div>
            {listing.images.length > 1 ? <><button className="listing-detail-gallery-arrow is-previous" type="button" aria-label="Previous photo" onClick={() => showImage(activeImage - 1)}><i className="fa-solid fa-chevron-left" aria-hidden="true" /></button><button className="listing-detail-gallery-arrow is-next" type="button" aria-label="Next photo" onClick={() => showImage(activeImage + 1)}><i className="fa-solid fa-chevron-right" aria-hidden="true" /></button></> : null}
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
            <button className={`listing-detail-save ${isSaved ? "is-saved" : ""}`} type="button" aria-label={isSaved ? "Remove from saved items" : "Save listing"} aria-pressed={isSaved} onClick={saveListing}>
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
            {listing.seller.avatarUrl ? <img className="listing-detail-seller-avatar" src={listing.seller.avatarUrl} alt="" /> : <span className="listing-detail-seller-avatar">{listing.seller.name.charAt(0).toUpperCase()}</span>}
            <div><strong>{listing.seller.name}</strong><span>Local marketplace member</span></div>
          </div>
        </aside>
      </div>

      <section className="listing-detail-mobile-meta listing-detail-mobile-only">
        <div className="listing-detail-mobile-dots" aria-label={`Photo ${activeImage + 1} of ${listing.images.length}`}>{listing.images.map((photo, index) => <span className={index === activeImage ? "is-active" : ""} key={photo.src} />)}</div>
        <h1>{listing.title}</h1>
        <div className="listing-detail-mobile-price-row"><strong>{listing.price}</strong><span className={`listing-status status-${listing.status}`}>{statusLabel[listing.status]}</span></div>
        <div className="listing-detail-mobile-location-row"><span><i className="fa-solid fa-location-dot" aria-hidden="true" /> {listing.location}</span><span>{listing.createdAt}</span><span><i className="fa-regular fa-eye" aria-hidden="true" /> 24</span></div>
      </section>

      <section className="listing-detail-description">
        <h2>About this item</h2>
        {paragraphs.length ? paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>) : <p>The seller has not added further details yet.</p>}
      </section>

      <section className="listing-detail-mobile-seller listing-detail-mobile-only">
        {listing.seller.avatarUrl ? <img className="listing-detail-mobile-seller-avatar" src={listing.seller.avatarUrl} alt="" /> : <span className="listing-detail-mobile-seller-avatar">{listing.seller.name.charAt(0).toUpperCase()}</span>}<div><strong>{listing.seller.name}</strong><span><i className="fa-solid fa-star" aria-hidden="true" /> 5.0 seller rating</span><small><i className="fa-regular fa-clock" aria-hidden="true" /> Local member</small></div><button type="button">View profile</button>
      </section>
      <Link className="listing-detail-mobile-safety listing-detail-mobile-only" href="/market"><i className="fa-solid fa-shield-heart" aria-hidden="true" /><span><strong>Safe trading tips</strong><small>Meet in a public place and check the item before buying.</small></span><i className="fa-solid fa-chevron-right" aria-hidden="true" /></Link>

      <div className="listing-detail-mobile-actions listing-detail-mobile-only"><button type="button" className="listing-detail-offer"><i className="fa-regular fa-message" aria-hidden="true" /> Message</button><button type="button" className="listing-detail-message">Make an offer</button></div>
    </main>
  );
}
