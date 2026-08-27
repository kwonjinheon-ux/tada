"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { memo, useEffect, useRef, useState } from "react";
import { marketWishlistResponseSchema } from "@/contracts/api";
import type { Listing } from "@/data/listings";
import { SaveHeartIcon, saveFeedbackClasses, useSaveHeartFeedback } from "@/components/SaveHeartBurst";
import { CommentCountBadge } from "@/components/ui/CommentCountBadge";
import { readApiResponse } from "@/lib/api/client";
import { useLanguage } from "@/components/LanguageProvider";
import { TextOnlyMedia } from "@/components/ui/TextOnlyMedia";
import { MARKET_LISTING_PLACEHOLDER_IMAGE } from "@/lib/market/listing-image";

// Comment-count badge — parked for reuse on a different category later.
// function commentCountTier(count: number) {
//   if (count > 30) return "red";
//   if (count > 20) return "blue";
//   if (count > 10) return "green";
//   return "yellow";
// }

type ProductCardProps = {
  listing: Listing;
  priority?: boolean;
  initialIsSaved?: boolean;
  imageSizes?: string;
  listingHref?: string;
  persistSave?: boolean;
  wishlistEndpoint?: string;
  isPreview?: boolean;
  className?: string;
};

function ProductCardComponent({ listing, priority = false, initialIsSaved = false, imageSizes = "(max-width: 767px) 160px, (min-width: 1200px) 240px, 45vw", listingHref, persistSave = true, wishlistEndpoint = "/api/market/wishlist", isPreview = false, className = "" }: ProductCardProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const [isSaved, setIsSaved] = useState(initialIsSaved);
  const { heartParticles, isPopping, play: playSaveFeedback, stopPopping } = useSaveHeartFeedback();
  const [imageFailed, setImageFailed] = useState(false);
  const isTextOnly = listing.image === MARKET_LISTING_PLACEHOLDER_IMAGE;
  const hasPrefetchedDetail = useRef(false);
  const statusLabel = listing.status === "sold" ? t("soldOut") : listing.status === "pending" ? t("pending") : t("available");
  const saleBadge = listing.bargainType === "garage-sale"
    ? { label: "Garage Sale", className: "garage-sale" }
    : listing.bargainType === "moving-sale"
      ? { label: "Moving Sale", className: "moving-sale" }
      : null;

  useEffect(() => {
    setImageFailed(false);
  }, [listing.image]);

  const toggleSaved = async () => {
    const nextSaved = !isSaved;
    setIsSaved(nextSaved);
    playSaveFeedback();
    if (!persistSave) return;
    try {
      const response = await fetch(wishlistEndpoint, {
        method: nextSaved ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: listing.id }),
      });
      if (response.status === 401) {
        router.push(`/login?redirectTo=${encodeURIComponent(listingHref ?? "/market")}`);
        return;
      }
      const result = await readApiResponse(response, marketWishlistResponseSchema);
      if (result.error || result.data.saved !== nextSaved) setIsSaved(!nextSaved);
    } catch {
      setIsSaved(!nextSaved);
    }
  };

  const detailPath = listingHref ?? `/market/${listing.id}`;
  const prefetchListing = () => {
    if (isPreview) return;
    if (hasPrefetchedDetail.current) return;
    hasPrefetchedDetail.current = true;
    router.prefetch(detailPath);
  };
  const openListing = () => {
    if (isPreview) return;
    prefetchListing();
    router.push(detailPath);
  };

  return (
    <article
      className={`product-card product-card-link ${listing.status === "sold" ? "is-sold" : ""} ${className}`}
      role={isPreview ? undefined : "link"}
      tabIndex={isPreview ? undefined : 0}
      aria-label={isPreview ? undefined : `${t("viewListing")}: ${listing.title}`}
      onClick={isPreview ? undefined : openListing}
      onPointerEnter={isPreview ? undefined : prefetchListing}
      onTouchStart={isPreview ? undefined : prefetchListing}
      onFocus={isPreview ? undefined : prefetchListing}
      onKeyDown={(event) => {
        if (isPreview) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openListing();
        }
      }}
    >
      <div className="product-media">
        {isTextOnly || imageFailed ? (
          <TextOnlyMedia className="product-media-text-only" />
        ) : (
          <Image
            src={listing.image}
            alt={listing.imageAlt}
            fill
            priority={priority}
            quality={70}
            sizes={imageSizes}
            unoptimized={isPreview}
            onError={() => setImageFailed(true)}
          />
        )}
        {saleBadge ? (
          <span className={`product-badge sale-type-badge ${saleBadge.className}`}>
            <span className="product-badge-label">{saleBadge.label}</span>
          </span>
        ) : listing.badge ? (
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
        {/* Comment-count badge — parked for reuse on a different category later.
        <div className="product-title-row">
          <h2>{listing.title}</h2>
          {listing.commentCount ? <span className={`product-comment-count is-${commentCountTier(listing.commentCount)}`} aria-label={`${listing.commentCount} comments`}>{listing.commentCount}</span> : null}
        </div>
        */}
        <div className="product-title-row"><h2>{listing.title}<CommentCountBadge count={listing.commentCount} className={`product-comment-count ${listing.commentCount && listing.commentCount <= 10 ? "is-low" : ""}`} /></h2></div>
        <div className="price-row">
          {saleBadge && listing.eventDateRange ? <strong className="product-event-date"><i className="ms ms-calendar-today" aria-hidden="true" />{listing.eventDateRange}</strong> : <strong>{listing.price}</strong>}
          <span className={`listing-status status-${listing.status}`}>{statusLabel}</span>
        </div>
        <p>
          <i className="ms ms-location-on" aria-hidden="true" />
          {listing.location}
        </p>
      </div>
      {!isPreview && !listing.isOwner ? <button
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
            stopPopping();
          }
        }}
      >
        <SaveHeartIcon isSaved={isSaved} particles={heartParticles} />
      </button> : null}
    </article>
  );
}

export const ProductCard = memo(ProductCardComponent);
ProductCard.displayName = "ProductCard";
