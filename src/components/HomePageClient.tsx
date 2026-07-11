"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Footer } from "@/components/Footer";

const categories = [
  ["category-blue", "fa-microchip", "Electronics"],
  ["category-purple", "fa-couch", "Furniture"],
  ["category-pink", "fa-shirt", "Clothing"],
  ["category-orange", "fa-car-side", "Cars"],
  ["category-green", "fa-building", "Property"],
  ["category-indigo", "fa-book-open", "Books"],
  ["category-red", "fa-basketball", "Sports"],
  ["category-mint", "fa-seedling", "Garden"],
  ["category-amber", "fa-baby", "Baby & Kids"],
  ["category-slate", "fa-screwdriver-wrench", "Tools"],
  ["category-violet", "fa-briefcase", "Services"],
];

export function HomePageClient() {
  const [isTaDa, setIsTaDa] = useState(false);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsTaDa(false);
    window.requestAnimationFrame(() => setIsTaDa(true));
  };

  return (
    <>
      <main className="market-home">
        <section className="market-hero" aria-labelledby="hero-title">
          <h1 id="hero-title">Ta-da! Here it is!</h1>
          <p>The modern marketplace for second-hand treasures, dream careers, and luxury living. Discover what&apos;s next for you today.</p>

          <form className="hero-search" action="#" role="search" onSubmit={submitSearch}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path d="m16 16 4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <input type="search" placeholder="Search for anything..." />
            <button className={isTaDa ? "is-ta-da" : ""} type="submit" onAnimationEnd={() => setIsTaDa(false)}>
              Search
            </button>
          </form>

          <div className="hero-quick-links">
            <Link href="/market">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 6h10M7 12h10M7 18h10" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
                <path d="M4 6h.01M4 12h.01M4 18h.01" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
              Listings
            </Link>
            <Link href="/post-ad">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
                <path d="M12 8v8M8 12h8" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
              </svg>
              Post Ad
            </Link>
          </div>
        </section>

        <section className="categories-section" aria-labelledby="categories-title">
          <div className="section-heading">
            <h2 id="categories-title">Explore Categories</h2>
            <p>Find exactly what you&apos;re looking for across our diverse marketplace</p>
          </div>

          <div className="category-grid">
            {categories.map(([tone, icon, label]) => (
              <Link className={`category-card ${tone}`} href="/market" key={label}>
                <i className={`fa-solid ${icon} category-icon`} aria-hidden="true" />
                <span>{label}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="promo-band" aria-label="Sponsored promotion">
          <div className="promo-visual" aria-hidden="true">
            <div className="promo-browser">
              <div />
              <div />
              <div />
            </div>
          </div>
          <div className="promo-copy">
            <span>Sponsored</span>
            <h2>Upgrade Your Workspace Today</h2>
            <p>Experience ultimate productivity with our new ergonomic collection. Designed for comfort, built for performance.</p>
            <Link href="#">Learn More</Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
