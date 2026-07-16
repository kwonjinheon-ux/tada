"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Listing } from "@/data/listings";

type ProductCardProps = {
  listing: Listing;
  priority?: boolean;
};

type HeartParticle = {
  id: string;
  x: number;
  y: number;
  delay: number;
  duration: number;
  size: number;
  rotation: number;
  color: string;
};

const heartColors = ["#ff3b6b", "#ff5d8f", "#ff8a5b", "#ffbd4a", "#e94683"];

function createHeartParticles() {
  return Array.from({ length: 12 }, (_, index): HeartParticle => {
    const angle = (Math.PI * 2 * index) / 12 + (Math.random() - 0.5) * 0.45;
    const distance = 34 + Math.random() * 34;
    return {
      id: `${Date.now()}-${index}-${Math.random()}`,
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance - 10 - Math.random() * 18,
      delay: Math.random() * 80,
      duration: 620 + Math.random() * 300,
      size: 11 + Math.random() * 10,
      rotation: -48 + Math.random() * 96,
      color: heartColors[Math.floor(Math.random() * heartColors.length)],
    };
  });
}

export function ProductCard({ listing, priority = false }: ProductCardProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [isPopping, setIsPopping] = useState(false);
  const [heartParticles, setHeartParticles] = useState<HeartParticle[]>([]);
  const burstTimer = useRef<number | null>(null);
  const statusLabel = listing.status.charAt(0).toUpperCase() + listing.status.slice(1);

  useEffect(() => () => {
    if (burstTimer.current) window.clearTimeout(burstTimer.current);
  }, []);

  const toggleSaved = () => {
    setIsSaved((current) => !current);
    setIsPopping(false);
    setHeartParticles(createHeartParticles());
    window.requestAnimationFrame(() => setIsPopping(true));
    if (burstTimer.current) window.clearTimeout(burstTimer.current);
    burstTimer.current = window.setTimeout(() => setHeartParticles([]), 1_050);
  };

  return (
    <article className={`product-card ${listing.status === "sold" ? "is-sold" : ""}`}>
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
        onClick={toggleSaved}
        onAnimationEnd={(event) => {
          if (event.currentTarget === event.target) {
            setIsPopping(false);
          }
        }}
      >
        <i className={`${isSaved ? "fa-solid" : "fa-regular"} fa-heart`} aria-hidden="true" />
        <span className="save-heart-particles" aria-hidden="true">
          {heartParticles.map((particle) => (
            <span
              className="save-heart-particle"
              key={particle.id}
              style={{
                "--heart-x": `${particle.x}px`,
                "--heart-y": `${particle.y}px`,
                "--heart-delay": `${particle.delay}ms`,
                "--heart-duration": `${particle.duration}ms`,
                "--heart-size": `${particle.size}px`,
                "--heart-rotation": `${particle.rotation}deg`,
                "--heart-color": particle.color,
              } as CSSProperties}
            >
              <i className="fa-solid fa-heart" />
            </span>
          ))}
        </span>
      </button>
    </article>
  );
}
