"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createHeartParticles, SaveHeartBurst, type HeartParticle } from "@/components/SaveHeartBurst";
import { ListingComments } from "@/components/market/ListingComments";

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
  viewCount: number;
  images: Array<{ src: string; alt: string }>;
  seller: { id: string | null; name: string; avatarUrl: string | null; ratingAverage: number; ratingCount: number };
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

export function ListingDetailClient({ listing, initialIsSaved = false }: { listing: ListingDetail; initialIsSaved?: boolean }) {
  const router = useRouter();
  const [activeImage, setActiveImage] = useState(0);
  const [imageTransition, setImageTransition] = useState<"next" | "previous">("next");
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [viewCount, setViewCount] = useState(listing.viewCount);
  const [isSaved, setIsSaved] = useState(initialIsSaved);
  const [isPopping, setIsPopping] = useState(false);
  const [heartParticles, setHeartParticles] = useState<HeartParticle[]>([]);
  const [isOpeningMessage, setIsOpeningMessage] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  const burstTimer = useRef<number | null>(null);
  const swipeStartX = useRef<number | null>(null);
  const paragraphs = useMemo(() => descriptionParagraphs(listing.description), [listing.description]);
  const image = listing.images[activeImage] ?? listing.images[0];
  const ratingLabel = listing.seller.ratingCount
    ? `${listing.seller.ratingAverage.toFixed(1)} seller rating (${listing.seller.ratingCount})`
    : "No ratings yet";

  useEffect(() => {
    document.body.classList.add("listing-detail-screen");
    return () => document.body.classList.remove("listing-detail-screen");
  }, []);

  useEffect(() => {
    if (!isGalleryOpen) return;
    document.body.classList.add("listing-gallery-open");
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsGalleryOpen(false);
      if (event.key === "ArrowRight" && listing.images.length > 1) {
        setImageTransition("next");
        setActiveImage((current) => (current + 1) % listing.images.length);
      }
      if (event.key === "ArrowLeft" && listing.images.length > 1) {
        setImageTransition("previous");
        setActiveImage((current) => (current - 1 + listing.images.length) % listing.images.length);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("listing-gallery-open");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isGalleryOpen, listing.images.length]);

  useEffect(() => () => {
    if (burstTimer.current) window.clearTimeout(burstTimer.current);
  }, []);

  useEffect(() => {
    router.prefetch("/market/dashboard/messages");
  }, [router]);

  useEffect(() => {
    void fetch(`/api/market/listings/${listing.id}/view`, { method: "POST", cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<{ viewCount?: number }> : null)
      .then((payload) => { if (typeof payload?.viewCount === "number") setViewCount(payload.viewCount); })
      .catch(() => undefined);
  }, [listing.id]);

  useEffect(() => {
    let isCurrent = true;
    void fetch(`/api/market/wishlist?listingId=${encodeURIComponent(listing.id)}`)
      .then((response) => response.ok ? response.json() as Promise<{ saved?: boolean }> : null)
      .then((payload) => { if (isCurrent && payload) setIsSaved(Boolean(payload.saved)); })
      .catch(() => undefined);
    return () => { isCurrent = false; };
  }, [listing.id]);

  const showImage = (index: number) => {
    const nextImage = (index + listing.images.length) % listing.images.length;
    if (nextImage === activeImage) return;
    setImageTransition(index > activeImage ? "next" : "previous");
    setActiveImage(nextImage);
  };
  const saveListing = async () => {
    const nextSaved = !isSaved;
    setIsSaved(nextSaved);
    setIsPopping(false);
    setHeartParticles(createHeartParticles());
    window.requestAnimationFrame(() => setIsPopping(true));
    if (burstTimer.current) window.clearTimeout(burstTimer.current);
    burstTimer.current = window.setTimeout(() => setHeartParticles([]), 1_050);
    try {
      const response = await fetch("/api/market/wishlist", {
        method: nextSaved ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: listing.id }),
      });
      if (response.status === 401) {
        router.push(`/login?redirectTo=${encodeURIComponent(`/market/${listing.id}`)}`);
        return;
      }
      if (!response.ok) setIsSaved(!nextSaved);
    } catch {
      setIsSaved(!nextSaved);
    }
  };

  const shareListing = async () => {
    const shareData = { title: listing.title, text: `${listing.title} - ${listing.price}`, url: window.location.href };
    if (navigator.share) {
      await navigator.share(shareData);
      return;
    }
    await navigator.clipboard?.writeText(window.location.href);
  };

  const openConversation = async () => {
    if (isOpeningMessage) return;
    setIsOpeningMessage(true);
    setMessageError(null);
    try {
      const response = await fetch("/api/market/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: listing.id }),
      });
      const payload = await response.json().catch(() => null) as { conversationId?: string; error?: string } | null;
      if (response.status === 401) {
        router.push(`/login?redirectTo=${encodeURIComponent(`/market/${listing.id}`)}`);
        return;
      }
      if (!response.ok || !payload?.conversationId) {
        setMessageError(payload?.error ?? "Unable to open a conversation right now.");
        return;
      }
      router.prefetch(`/market/dashboard/messages?conversation=${payload.conversationId}`);
      router.push(`/market/dashboard/messages?conversation=${payload.conversationId}`);
    } catch {
      setMessageError("Unable to reach messaging right now. Please try again.");
    } finally {
      setIsOpeningMessage(false);
    }
  };

  const prepareMessaging = () => router.prefetch("/market/dashboard/messages");

  return (
    <main className="listing-detail-page">
      <Link className="listing-detail-back" href="/market">
        <i className="fa-solid fa-arrow-left" aria-hidden="true" />
        Back to listings
      </Link>

      <div className="listing-detail-layout">
        <section className="listing-detail-gallery" aria-label={`${listing.title} photos`}>
          <div className="listing-detail-main-image" role="button" tabIndex={0} aria-label={`Open photo ${activeImage + 1} of ${listing.images.length} in gallery`} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setIsGalleryOpen(true); } }} onPointerDown={(event) => { swipeStartX.current = event.clientX; }} onPointerUp={(event) => {
            if ((event.target as HTMLElement).closest("button")) return;
            if (swipeStartX.current === null) return;
            const distance = event.clientX - swipeStartX.current;
            swipeStartX.current = null;
            if (Math.abs(distance) < 12) {
              setIsGalleryOpen(true);
              return;
            }
            if (Math.abs(distance) < 42 || listing.images.length < 2) return;
            showImage(activeImage + (distance < 0 ? 1 : -1));
          }} onPointerCancel={() => { swipeStartX.current = null; }}>
            <Image className="listing-detail-main-backdrop" src={image.src} alt="" fill aria-hidden="true" sizes="(max-width: 900px) 100vw, 68vw" />
            <Image key={`${image.src}-${activeImage}`} className={`listing-detail-main-photo is-entering-from-${imageTransition}`} src={image.src} alt={image.alt} fill priority sizes="(max-width: 900px) 100vw, 68vw" />
            <span className="listing-detail-mobile-badge listing-detail-mobile-only">Newly listed</span>
            {listing.images.length > 1 ? <><button className="listing-detail-gallery-arrow is-previous" type="button" aria-label="Previous photo" onClick={(event) => { event.stopPropagation(); showImage(activeImage - 1); }}><i className="fa-solid fa-chevron-left" aria-hidden="true" /></button><button className="listing-detail-gallery-arrow is-next" type="button" aria-label="Next photo" onClick={(event) => { event.stopPropagation(); showImage(activeImage + 1); }}><i className="fa-solid fa-chevron-right" aria-hidden="true" /></button></> : null}
            <span className="listing-detail-image-count"><i className="fa-regular fa-images" aria-hidden="true" /> {listing.images.length}</span>
          </div>
          {listing.images.length > 1 ? (
            <div className="listing-detail-thumbnails" aria-label="Choose photo">
              {listing.images.map((photo, index) => (
                <button className={index === activeImage ? "is-active" : ""} type="button" key={photo.src} onClick={() => showImage(index)} aria-label={`Show photo ${index + 1}`} aria-pressed={index === activeImage}>
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
            <button className={`listing-detail-save save-button ${isSaved ? "is-saved" : ""} ${isPopping ? "is-popping" : ""}`} type="button" aria-label={isSaved ? "Remove from saved items" : "Save listing"} aria-pressed={isSaved} onClick={() => void saveListing()} onAnimationEnd={(event) => { if (event.currentTarget === event.target) setIsPopping(false); }}>
              <i className={`${isSaved ? "fa-solid" : "fa-regular"} fa-heart`} aria-hidden="true" />
              <SaveHeartBurst particles={heartParticles} />
            </button>
          </div>
          <strong className="listing-detail-price">{listing.price}</strong>
          <p className="listing-detail-location"><i className="fa-solid fa-location-dot" aria-hidden="true" /> {listing.location}</p>

          <div className="listing-detail-actions">
            <button type="button" className="listing-detail-message" onPointerEnter={prepareMessaging} onFocus={prepareMessaging} onClick={() => void openConversation()} disabled={isOpeningMessage}><i className="fa-regular fa-message" aria-hidden="true" /> {isOpeningMessage ? "Opening chat..." : "Message"}</button>
            <button type="button" className="listing-detail-offer">Make an offer</button>
          </div>
          {messageError ? <p className="listing-detail-message-error" role="alert">{messageError}</p> : null}

          <dl className="listing-detail-facts">
            <div><dt>Condition</dt><dd>{listing.condition}</dd></div>
            <div><dt>Delivery</dt><dd>{listing.tradeMethod}</dd></div>
            {listing.meetingPlace ? <div><dt>Meet at</dt><dd>{listing.meetingPlace}</dd></div> : null}
          </dl>

          <div className="listing-detail-seller">
            {listing.seller.avatarUrl ? <img className="listing-detail-seller-avatar" src={listing.seller.avatarUrl} alt="" /> : <span className="listing-detail-seller-avatar">{listing.seller.name.charAt(0).toUpperCase()}</span>}
            <div><strong>{listing.seller.name}</strong><span>{ratingLabel}</span></div>
          </div>
        </aside>
      </div>

      {isGalleryOpen ? <div className="listing-gallery-lightbox" role="dialog" aria-modal="true" aria-label={`${listing.title} photo gallery`}>
        <Image className="listing-gallery-lightbox-backdrop" src={image.src} alt="" fill aria-hidden="true" sizes="100vw" />
        <button className="listing-gallery-lightbox-close" type="button" aria-label="Close photo gallery" onClick={() => setIsGalleryOpen(false)}><i className="fa-solid fa-xmark" aria-hidden="true" /></button>
        <div className="listing-gallery-lightbox-stage">
          <Image key={`lightbox-${image.src}-${activeImage}`} className="listing-gallery-lightbox-photo" src={image.src} alt={image.alt} fill priority sizes="100vw" />
        </div>
        {listing.images.length > 1 ? <><button className="listing-gallery-lightbox-arrow is-previous" type="button" aria-label="Previous photo" onClick={() => showImage(activeImage - 1)}><i className="fa-solid fa-chevron-left" aria-hidden="true" /></button><button className="listing-gallery-lightbox-arrow is-next" type="button" aria-label="Next photo" onClick={() => showImage(activeImage + 1)}><i className="fa-solid fa-chevron-right" aria-hidden="true" /></button></> : null}
        <span className="listing-gallery-lightbox-count">{activeImage + 1} / {listing.images.length}</span>
      </div> : null}

      <section className="listing-detail-mobile-meta listing-detail-mobile-only">
        <div className="listing-detail-mobile-dots" aria-label={`Photo ${activeImage + 1} of ${listing.images.length}`}>{listing.images.map((photo, index) => <span className={index === activeImage ? "is-active" : ""} key={photo.src} />)}</div>
        <h1>{listing.title}</h1>
        <div className="listing-detail-mobile-price-row"><strong>{listing.price}</strong><span className={`listing-status status-${listing.status}`}>{statusLabel[listing.status]}</span></div>
        <div className="listing-detail-mobile-location-row"><span><i className="fa-solid fa-location-dot" aria-hidden="true" /> {listing.location}</span><div className="listing-detail-mobile-stats"><span><i className="fa-regular fa-eye" aria-hidden="true" /> {new Intl.NumberFormat("en-NZ").format(viewCount)}</span><time>{listing.createdAt}</time></div></div>
      </section>

      <section className="listing-detail-description">
        <h2>About this item</h2>
        {paragraphs.length ? paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>) : <p>The seller has not added further details yet.</p>}
      </section>

      <section className="listing-detail-mobile-seller listing-detail-mobile-only">
        {listing.seller.avatarUrl ? <img className="listing-detail-mobile-seller-avatar" src={listing.seller.avatarUrl} alt="" /> : <span className="listing-detail-mobile-seller-avatar">{listing.seller.name.charAt(0).toUpperCase()}</span>}<div><strong>{listing.seller.name}</strong><span><i className="fa-solid fa-star" aria-hidden="true" /> {ratingLabel}</span><small><i className="fa-regular fa-clock" aria-hidden="true" /> Local member</small></div>{listing.seller.id ? <Link href={`/market/sellers/${listing.seller.id}`}>View profile</Link> : null}
      </section>

      <ListingComments listingId={listing.id} />

      <Link className="listing-detail-mobile-safety listing-detail-mobile-only" href="/market"><i className="fa-solid fa-shield-heart" aria-hidden="true" /><span><strong>Safe trading tips</strong><small>Meet in a public place and check the item before buying.</small></span><i className="fa-solid fa-chevron-right" aria-hidden="true" /></Link>

      <div className="listing-detail-mobile-actions listing-detail-mobile-only"><button type="button" className="listing-detail-message">Make an offer</button><button type="button" className="listing-detail-offer" onPointerDown={prepareMessaging} onFocus={prepareMessaging} onClick={() => void openConversation()} disabled={isOpeningMessage}><i className="fa-regular fa-message" aria-hidden="true" /> {isOpeningMessage ? "Opening..." : "Message"}</button><button type="button" className="listing-detail-mobile-action-icon" aria-label="Share listing" onClick={() => void shareListing()}><i className="fa-solid fa-arrow-up-from-bracket" aria-hidden="true" /></button><button className={`listing-detail-mobile-action-icon save-button ${isSaved ? "is-saved" : ""} ${isPopping ? "is-popping" : ""}`} type="button" aria-label={isSaved ? "Remove from saved items" : "Save listing"} aria-pressed={isSaved} onClick={() => void saveListing()} onAnimationEnd={(event) => { if (event.currentTarget === event.target) setIsPopping(false); }}><i className={`${isSaved ? "fa-solid" : "fa-regular"} fa-heart`} aria-hidden="true" /><SaveHeartBurst particles={heartParticles} /></button></div>
    </main>
  );
}
