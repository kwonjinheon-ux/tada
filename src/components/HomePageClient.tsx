"use client";

import Link from "next/link";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { PageContainer } from "@/components/layout/PageContainer";
import type { Listing } from "@/data/listings";

type Journey = {
  title: string;
  description: string;
  href: string;
  icon: string;
  comingSoon?: boolean;
};

const journeys: Journey[] = [
  {
    title: "Market",
    description: "Buy and sell nearby",
    href: "/market",
    // Keep this in step with the Market entry in MarketFilterSidebar.
    icon: "fa-store",
  },
  {
    title: "Community",
    description: "Connect nearby",
    href: "/community",
    icon: "fa-users",
  },
  {
    title: "Services",
    description: "Book local help",
    href: "/services",
    icon: "fa-screwdriver-wrench",
    comingSoon: true,
  },
  {
    title: "Jobs",
    description: "Find local work",
    href: "/jobs",
    icon: "fa-briefcase",
    comingSoon: true,
  },
];

const marketShortcuts = [
  { label: "Second Hands", href: "/market/secondhands", icon: "fa-store" },
  { label: "Garage Sale", href: "/market/garage-sales", icon: "fa-warehouse" },
  { label: "Moving Sale", href: "/market/moving-sales", icon: "fa-truck-ramp-box" },
  { label: "$2 Deals", href: "/market/2dollarshop", icon: "fa-coins" },
  { label: "Group Buy", href: "/market/groupbuy", icon: "fa-people-group" },
];

const trustItems = [
  { icon: "fa-tag", title: "Free to list", description: "List an item in minutes" },
  { icon: "fa-people-group", title: "Made for locals", description: "Useful things happen nearby" },
  { icon: "fa-shield-halved", title: "Safer together", description: "Trust guides every deal" },
  { icon: "fa-bolt", title: "Simple by design", description: "Find what you need faster" },
];

function JourneyCard({ journey }: { journey: Journey }) {
  return (
    <Link className="home-journey-card ui-card" href={journey.href}>
      <i className={`fa-solid ${journey.icon}`} aria-hidden="true" />
      <div className="home-journey-copy">
        <div className="home-journey-title-row">
          <h2>{journey.title}</h2>
          {journey.comingSoon ? <span className="ui-pill">Soon</span> : null}
        </div>
        <p>{journey.description}</p>
      </div>
      <i className="fa-solid fa-chevron-right home-journey-arrow" aria-hidden="true" />
    </Link>
  );
}

type HomeListingRailProps = {
  id: string;
  title: string;
  titleIcon: string;
  eyebrow?: string | null;
  listings: Listing[];
  savedListingIds: string[];
};

function HomeListingRail({ id, title, titleIcon, eyebrow, listings, savedListingIds }: HomeListingRailProps) {
  if (!listings.length) return null;

  return (
    <section className="home-listing-rail" aria-labelledby={id}>
      <div className="home-listing-heading">
        <div>
          {eyebrow ? <p className="home-eyebrow"><i className="fa-solid fa-location-dot" aria-hidden="true" /> {eyebrow}</p> : null}
          <div className="home-listing-title">
            <i className={`fa-solid ${titleIcon}`} aria-hidden="true" />
            <h2 id={id}>{title}</h2>
          </div>
        </div>
        <Link href="/market">See all <i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link>
      </div>

      <div className="home-listing-grid">
        {listings.map((listing, index) => (
          <ProductCard
            imageSizes="(max-width: 767px) 240px, (min-width: 1280px) 320px, 33vw"
            initialIsSaved={savedListingIds.includes(listing.id)}
            key={listing.id}
            listing={listing}
            priority={index < 2}
          />
        ))}
      </div>
    </section>
  );
}

type HomePageClientProps = {
  locationLabel?: string | null;
  nearbyListings?: Listing[];
  justListedListings?: Listing[];
  savedListingIds?: string[];
};

export function HomePageClient({
  locationLabel = null,
  nearbyListings = [],
  justListedListings = [],
  savedListingIds = [],
}: HomePageClientProps) {
  return (
    <>
      <main className="market-home">
        <PageContainer className="home-page-content">
          <section className="home-hero" aria-labelledby="home-hero-title">
            <div className="home-hero-copy">
              <p className="home-hero-kicker"><i className="fa-solid fa-location-dot" aria-hidden="true" /> Your local everyday app</p>
              <h1 id="home-hero-title">Everything local,<br /><span>one Tada</span> away.</h1>
              <p className="home-hero-intro">Buy, sell and connect with people and useful services in your community.</p>
              <div className="home-hero-actions">
                <Link className="ui-button ui-button--primary ui-button--pill home-hero-primary" href="/market"><i className="fa-solid fa-store" aria-hidden="true" /> Explore Market <i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link>
                <Link className="home-hero-secondary" href="/market/create"><i className="fa-solid fa-plus" aria-hidden="true" /> Post an item</Link>
              </div>
            </div>

            <div className="home-hero-illustration" aria-hidden="true">
              <div className="home-hero-illustration-orbit home-hero-illustration-orbit--one" />
              <div className="home-hero-illustration-orbit home-hero-illustration-orbit--two" />
              <div className="home-hero-illustration-card home-hero-illustration-card--market"><i className="fa-solid fa-store" /></div>
              <div className="home-hero-illustration-card home-hero-illustration-card--community"><i className="fa-solid fa-users" /></div>
              <div className="home-hero-illustration-card home-hero-illustration-card--home"><i className="fa-solid fa-house" /></div>
              <i className="fa-solid fa-location-dot home-hero-illustration-pin" />
            </div>
          </section>

          <section className="home-journey-section" aria-labelledby="home-journey-title">
            <header className="home-section-heading">
              <p>Explore Tada</p>
              <h2 id="home-journey-title">One place for local life</h2>
            </header>
            <div className="home-journey-grid" aria-label="Explore Tada">
              {journeys.map((journey) => <JourneyCard journey={journey} key={journey.title} />)}
            </div>
          </section>

          <section className="home-market-shortcuts-section" aria-labelledby="home-market-shortcuts-title">
            <header className="home-section-heading home-section-heading--inline">
              <div><p>Browse Market</p><h2 id="home-market-shortcuts-title">What are you looking for?</h2></div>
              <Link href="/market">View Market <i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link>
            </header>
            <div className="home-market-shortcuts">
              {marketShortcuts.map((shortcut) => (
                <Link className="home-market-shortcut ui-card" href={shortcut.href} key={shortcut.href}>
                  <i className={`fa-solid ${shortcut.icon}`} aria-hidden="true" />
                  <span>{shortcut.label}</span>
                  <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </section>

          <section className="home-listing-rails" aria-label="Marketplace discoveries">
            <HomeListingRail
              eyebrow={locationLabel}
              id="nearby-title"
              listings={nearbyListings}
              savedListingIds={savedListingIds}
              title="Explore near you"
              titleIcon="fa-location-dot"
            />
            <HomeListingRail
              id="just-listed-title"
              listings={justListedListings}
              savedListingIds={savedListingIds}
              title="Just listed"
              titleIcon="fa-clock"
            />
          </section>

          <section className="home-sponsor ui-card" aria-labelledby="home-sponsor-title">
            <div className="home-sponsor-copy">
              <p>Sponsored</p>
              <h2 id="home-sponsor-title">Move with ease.</h2>
              <span>Trusted local movers for your next move, from pickup to delivery.</span>
              <Link href="/market"><span>Learn more</span> <i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link>
            </div>
            <div className="home-sponsor-visual" aria-hidden="true">
              <div className="home-sponsor-van"><i className="fa-solid fa-truck-fast" /></div>
              <div className="home-sponsor-box home-sponsor-box--one" />
              <div className="home-sponsor-box home-sponsor-box--two" />
            </div>
          </section>

          <section className="home-trust-section ui-panel" aria-labelledby="home-trust-title">
            <header className="home-section-heading">
              <p>Tada, for everyday life</p>
              <h2 id="home-trust-title">Made to feel simple and local</h2>
            </header>
            <div className="home-trust-grid">
              {trustItems.map((item) => (
                <article className="home-trust-item" key={item.title}>
                  <i className={`fa-solid ${item.icon}`} aria-hidden="true" />
                  <div><h3>{item.title}</h3><p>{item.description}</p></div>
                </article>
              ))}
            </div>
          </section>
        </PageContainer>
      </main>
      <Footer />
    </>
  );
}
