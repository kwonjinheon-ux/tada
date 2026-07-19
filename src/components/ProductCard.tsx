"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Listing } from "@/data/listings";
import { createHeartParticles, SaveHeartBurst, type HeartParticle } from "@/components/SaveHeartBurst";

type ProductCardProps = {
  listing: Listing;
  priority?: boolean;
};

export function ProductCard({ listing, priority = false }: ProductCardProps) {
  const router = useRouter();
  const [isSaved, setIsSaved] = useState(false);
  const [isPopping, setIsPopping] = useState(false);
  const [heartParticles, setHeartParticles] = useState<HeartParticle[]>([]);
  const burstTimer = useRef<number | null>(null);
  const popTimer = useRef<number | null>(null);
  const hasPrefetchedDetail = useRef(false);
  const statusLabel = listing.status.charAt(0).toUpperCase() + listing.status.slice(1);

  useEffect(() => () => {
    if (burstTimer.current) window.clearTimeout(burstTimer.current);
    if (popTimer.current) window.clearTimeout(popTimer.current);
  }, []);

  const toggleSaved = () => {
    setIsSaved((current) => !current);
    setIsPopping(false);
    setHeartParticles(createHeartParticles());
    window.requestAnimationFrame(() => setIsPopping(true));
    if (burstTimer.current) window.clearTimeout(burstTimer.current);
    if (popTimer.current) window.clearTimeout(popTimer.current);
    popTimer.current = window.setTimeout(() => setIsPopping(false), 440);
    burstTimer.current = window.setTimeout(() => setHeartParticles([]), 1_050);
  };

  const detailPath = `/market/${listing.id}`;
  const prefetchListing = () => {
    if (hasPrefetchedDetail.current) return;
    hasPrefetchedDetail.current = true;
    router.prefetch(detailPath);
  };
  const openListing = () => {
    prefetchListing();
    router.push(detailPath);
  };

  return (
    <article
      className={`product-card product-card-link ${listing.status === "sold" ? "is-sold" : ""}`}
      role="link"
      tabIndex={0}
      aria-label={`View ${listing.title}`}
      onClick={openListing}
      onPointerEnter={prefetchListing}
      onTouchStart={prefetchListing}
      onFocus={prefetchListing}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openListing();
        }
      }}
    >
      <div className="product-media">
        <Image
          src={listing.image}
          alt={listing.imageAlt}
          fill
          priority={priority}
          quality={70}
          sizes="(max-width: 767px) 160px, (min-width: 1200px) 240px, 45vw"
        />
        {listing.badge ? (
          <span className={`product-badge ${listing.badge === "Promotion" ? "promo" : "new"}`}>
            {listing.badge}
          </span>
        ) : null}
      </div>
      <div className="product-body">
        <div className="price-row">
          <strong>{listing.price}</strong>
          <span className={`listing-status status-${listing.status}`}>{statusLabel}</span>
        </div>
        <h2>{listing.title}</h2>
        <p>
          <i className="fa-solid fa-location-dot" aria-hidden="true" />
          {listing.location}
        </p>
      </div>
      <button
        className={`save-button ${isSaved ? "is-saved" : ""} ${isPopping ? "is-popping" : ""}`}
        type="button"
        aria-label={`Save ${listing.title}`}
        aria-pressed={isSaved}
        onClick={(event) => {
          event.stopPropagation();
          toggleSaved();
        }}
        onKeyDown={(event) => event.stopPropagation()}
        onAnimationEnd={(event) => {
          if (event.currentTarget === event.target) {
            setIsPopping(false);
          }
        }}
      >
        <i className={`${isSaved ? "fa-solid" : "fa-regular"} fa-heart`} aria-hidden="true" />
        <SaveHeartBurst particles={heartParticles} />
      </button>
    </article>
  );
}
