"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/Button";
import type { Listing } from "@/data/listings";

type Journey = {
  title: string;
  description: string;
  detail: string;
  href?: string;
  art: string;
  image: string;
  comingSoon?: boolean;
};

const journeys: Journey[] = [
  {
    title: "Market",
    description: "Buy & sell near you",
    detail: "Find a local good deal",
    href: "/market",
    art: "market",
    image: "/images/home/journey-market.png",
  },
  {
    title: "Jobs",
    description: "Find your next opportunity",
    detail: "Work that fits your life",
    href: "/jobs",
    art: "jobs",
    image: "/images/home/journey-jobs.png",
    comingSoon: true,
  },
  {
    title: "Services",
    description: "Book trusted local help",
    detail: "Launching soon",
    href: "/services",
    art: "services",
    image: "/images/home/journey-services.png",
    comingSoon: true,
  },
];

const benefits = [
  { icon: "fa-tag", title: "Free to list", description: "List in minutes, for free" },
  { icon: "fa-shield-heart", title: "Local & trusted", description: "A community built nearby" },
  { icon: "fa-lock", title: "Secure deals", description: "Safer chat and payments" },
  { icon: "fa-bolt", title: "Quick & easy", description: "One place for local life" },
];

const reasons = [
  { icon: "fa-wand-magic-sparkles", title: "Modern & simple", description: "A calm, clear way to find what you need." },
  { icon: "fa-people-group", title: "Built for locals", description: "Buy, work and connect in your community." },
  { icon: "fa-shield-halved", title: "Secure & reliable", description: "Trust and safety guide every interaction." },
  { icon: "fa-compass", title: "More to come", description: "Services and new local tools are on their way." },
];

function JourneyCard({ journey }: { journey: Journey }) {
  const content = <>
    <div className={`home-journey-art home-journey-art--${journey.art}`} aria-hidden="true">
      <Image src={journey.image} alt="" fill sizes="(min-width: 1280px) 14vw, (min-width: 768px) 27vw, 45vw" />
    </div>
    <div className="home-journey-copy">
      <div className="home-journey-title-row">
        <h2>{journey.title}</h2>
        {journey.comingSoon ? <span className="ui-pill">Soon</span> : null}
      </div>
      <p>{journey.description}</p>
      <span className="home-journey-detail">
        {journey.detail}
        {!journey.comingSoon ? <i className="fa-solid fa-arrow-right" aria-hidden="true" /> : null}
      </span>
    </div>
  </>;

  if (journey.href) {
    return <Link className="home-journey-card ui-card" href={journey.href}>{content}</Link>;
  }

  return <article className="home-journey-card home-journey-card--coming-soon ui-card" aria-label={`${journey.title}: coming soon`}>{content}</article>;
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
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchQuery.trim();
    router.push(query ? `/market?q=${encodeURIComponent(query)}` : "/market");
  };

  return (
    <>
      <main className="market-home">
        <PageContainer size="home" className="home-page-content">
          <section className="home-hero" aria-labelledby="home-hero-title">
            <div className="home-hero-copy">
              <h1 id="home-hero-title">Everything you need,<br />one <span>Tada</span> away.</h1>
              <p className="home-hero-intro">Buy, sell, find work and discover useful local services in one easy place.</p>

              <form className="home-search" role="search" onSubmit={submitSearch}>
                <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
                <label className="home-search-label" htmlFor="home-search-input">Search Tada</label>
                <input id="home-search-input" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} type="search" placeholder="Search for anything..." />
                <Button className="home-search-submit" type="submit" pill>Search</Button>
              </form>

              <div className="home-popular-searches" aria-label="Popular searches">
                <span>Popular:</span>
                <Link href="/market?q=iPhone">iPhone</Link>
                <Link href="/market?q=Sofa">Sofa</Link>
                <Link href="/market?q=Bike">Bike</Link>
                <Link href="/market?q=Desk">Desk</Link>
              </div>
            </div>

            <div className="home-journey-grid" aria-label="Explore Tada">
              {journeys.map((journey) => <JourneyCard journey={journey} key={journey.title} />)}
            </div>
          </section>

          <section className="home-benefits ui-panel" aria-label="Why Tada works for locals">
            {benefits.map((benefit) => (
              <article className="home-benefit" key={benefit.title}>
                <i className={`fa-solid ${benefit.icon}`} aria-hidden="true" />
                <div>
                  <h2>{benefit.title}</h2>
                  <p>{benefit.description}</p>
                </div>
              </article>
            ))}
          </section>

          <section className="home-listing-rails" aria-label="Marketplace discoveries">
            <HomeListingRail
              eyebrow={locationLabel}
              id="nearby-title"
              listings={nearbyListings}
              savedListingIds={savedListingIds}
              title="Near you"
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
              <p>Sponsored · Auckland</p>
              <h2 id="home-sponsor-title">Moving made simple.</h2>
              <span>Local help for your next move, from pickup to delivery.</span>
              <Link href="/market"><span>Learn more</span> <i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link>
            </div>
            <div className="home-sponsor-visual" aria-hidden="true">
              <div className="home-sponsor-van"><i className="fa-solid fa-truck-fast" /></div>
              <div className="home-sponsor-box home-sponsor-box--one" />
              <div className="home-sponsor-box home-sponsor-box--two" />
            </div>
          </section>

          <section className="home-reasons ui-panel" aria-labelledby="home-reasons-title">
            <h2 id="home-reasons-title">Why choose Tada?</h2>
            <div>
              {reasons.map((reason) => (
                <article key={reason.title}>
                  <i className={`fa-solid ${reason.icon}`} aria-hidden="true" />
                  <div><h3>{reason.title}</h3><p>{reason.description}</p></div>
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
