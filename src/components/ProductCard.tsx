"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { memo, useEffect, useRef, useState } from "react";
import { marketWishlistResponseSchema } from "@/contracts/api";
import type { Listing } from "@/data/listings";
import { createHeartParticles, SaveHeartBurst, saveFeedbackClasses, type HeartParticle } from "@/components/SaveHeartBurst";
import { readApiResponse } from "@/lib/api/client";
import { useLanguage } from "@/components/LanguageProvider";

function commentCountTier(count: number) {
  if (count > 30) return "red";
  if (count > 20) return "blue";
  if (count > 10) return "green";
  return "yellow";
}

type ProductCardProps = {
  listing: Listing;
  priority?: boolean;
  initialIsSaved?: boolean;
};

function ProductCardComponent({ listing, priority = false, initialIsSaved = false }: ProductCardProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const [isSaved, setIsSaved] = useState(initialIsSaved);
  const [isPopping, setIsPopping] = useState(false);
  const [heartParticles, setHeartParticles] = useState<HeartParticle[]>([]);
  const [imageFailed, setImageFailed] = useState(false);
  const burstTimer = useRef<number | null>(null);
  const popTimer = useRef<number | null>(null);
  const hasPrefetchedDetail = useRef(false);
  const statusLabel = listing.status === "sold" ? t("soldOut") : listing.status === "pending" ? t("pending") : t("available");

  useEffect(() => () => {
    if (burstTimer.current) window.clearTimeout(burstTimer.current);
    if (popTimer.current) window.clearTimeout(popTimer.current);
  }, []);

  useEffect(() => {
    setImageFailed(false);
  }, [listing.image]);

  const toggleSaved = async () => {
    const nextSaved = !isSaved;
    setIsSaved(nextSaved);
    setIsPopping(false);
    setHeartParticles(createHeartParticles());
    window.requestAnimationFrame(() => setIsPopping(true));
    if (burstTimer.current) window.clearTimeout(burstTimer.current);
    if (popTimer.current) window.clearTimeout(popTimer.current);
    popTimer.current = window.setTimeout(() => setIsPopping(false), 440);
    burstTimer.current = window.setTimeout(() => setHeartParticles([]), 1_050);
    try {
      const response = await fetch("/api/market/wishlist", {
        method: nextSaved ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: listing.id }),
      });
      if (response.status === 401) {
        router.push(`/login?redirectTo=${encodeURIComponent("/market")}`);
        return;
      }
      const result = await readApiResponse(response, marketWishlistResponseSchema);
      if (result.error || result.data.saved !== nextSaved) setIsSaved(!nextSaved);
    } catch {
      setIsSaved(!nextSaved);
    }
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
      aria-label={`${t("viewListing")}: ${listing.title}`}
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
        {imageFailed ? (
          <div className="product-image-unavailable" role="img" aria-label={`${listing.title}: ${t("imageUnavailable")}`}>
            <i className="fa-regular fa-image" aria-hidden="true" />
          </div>
        ) : (
          <Image
            src={listing.image}
            alt={listing.imageAlt}
            fill
            priority={priority}
            quality={70}
            sizes="(max-width: 767px) 160px, (min-width: 1200px) 240px, 45vw"
            onError={() => setImageFailed(true)}
          />
        )}
        {listing.badge ? (
          <span
            className={`product-badge ${listing.badge === "Promotion" ? "promo" : "new"}`}
            aria-label={listing.badge === "Promotion" ? t("promotion") : t("newlyListed")}
          >
            <span className="product-badge-label">{listing.badge === "Promotion" ? t("promotion") : t("newlyListed")}</span>
            {listing.badge === "Newly Listed" ? <span className="product-badge-mobile-label" aria-hidden="true">N</span> : null}
          </span>
        ) : null}
        {listing.status === "sold" ? <span className="product-sold-out">{t("soldOut")}</span> : null}
      </div>
      <div className="product-body">
        <div className="product-title-row">
          <h2>{listing.title}</h2>
          {listing.commentCount ? <span className={`product-comment-count is-${commentCountTier(listing.commentCount)}`} aria-label={`${listing.commentCount} comments`}>{listing.commentCount}</span> : null}
        </div>
        <div className="price-row">
          <strong>{listing.price}</strong>
          <span className={`listing-status status-${listing.status}`}>{statusLabel}</span>
        </div>
        <p>
          <i className="fa-solid fa-location-dot" aria-hidden="true" />
          {listing.location}
        </p>
      </div>
      <button
        className={`save-button ${saveFeedbackClasses.root} ${isSaved ? saveFeedbackClasses.saved : ""} ${isPopping ? saveFeedbackClasses.popping : ""}`}
        type="button"
        aria-label={`${t("saveListing")}: ${listing.title}`}
        aria-pressed={isSaved}
        onClick={(event) => {
          event.stopPropagation();
          void toggleSaved();
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

export const ProductCard = memo(ProductCardComponent);
ProductCard.displayName = "ProductCard";
