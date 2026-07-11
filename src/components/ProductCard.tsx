"use client";

import { useState } from "react";
import type { Listing } from "@/data/listings";

type ProductCardProps = {
  listing: Listing;
};

export function ProductCard({ listing }: ProductCardProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [isPopping, setIsPopping] = useState(false);
  const statusLabel = listing.status.charAt(0).toUpperCase() + listing.status.slice(1);

  const toggleSaved = () => {
    setIsSaved((current) => !current);
    setIsPopping(false);
    window.requestAnimationFrame(() => setIsPopping(true));
  };

  return (
    <article className={`product-card ${listing.status === "sold" ? "is-sold" : ""}`}>
      <div className="product-media">
        <img src={listing.image} alt={listing.imageAlt} />
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
        onClick={toggleSaved}
        onAnimationEnd={() => setIsPopping(false)}
      >
        <i className={`${isSaved ? "fa-solid" : "fa-regular"} fa-heart`} aria-hidden="true" />
      </button>
    </article>
  );
}
