"use client";

import Image from "next/image";
import { FormEvent, useMemo, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/Button";

type ServiceCategory = {
  label: string;
  icon: string;
};

type ServiceListing = {
  id: string;
  category: string;
  badge: string;
  badgeClass: "success" | "warning" | "default";
  title: string;
  provider: string;
  rating: string;
  charge: string;
  location: string;
  price: string;
  image: string;
  imageAlt: string;
};

const categories: ServiceCategory[] = [
  { label: "Cleaning", icon: "fa-spray-can-sparkles" },
  { label: "Moving", icon: "fa-truck" },
  { label: "Handyman", icon: "fa-screwdriver-wrench" },
  { label: "Gardening", icon: "fa-seedling" },
  { label: "Beauty", icon: "fa-wand-magic-sparkles" },
  { label: "Tutoring", icon: "fa-graduation-cap" },
  { label: "Pet care", icon: "fa-paw" },
  { label: "Auto", icon: "fa-car" },
];

const services: ServiceListing[] = [
  {
    id: "sparkle-clean",
    category: "Cleaning",
    badge: "Available today",
    badgeClass: "success",
    title: "Home cleaning",
    provider: "Sparkle Clean",
    rating: "4.9 (126)",
    charge: "Charge 88%",
    location: "Hamilton Central",
    price: "From $40 / hr",
    image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=720&q=85",
    imageAlt: "A cleaner making a bed in a bright home",
  },
  {
    id: "fixit-furniture",
    category: "Handyman",
    badge: "Verified",
    badgeClass: "success",
    title: "Furniture assembly",
    provider: "FixIt Hamilton",
    rating: "4.9 (98)",
    charge: "Charge 90%",
    location: "Frankton",
    price: "From $60 / hr",
    image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=720&q=85",
    imageAlt: "A craftsman preparing furniture in a room",
  },
  {
    id: "math-mentors",
    category: "Tutoring",
    badge: "Top rated",
    badgeClass: "warning",
    title: "Math tutoring",
    provider: "Math Mentors",
    rating: "4.8 (64)",
    charge: "Charge 91%",
    location: "Hamilton East",
    price: "From $35 / hr",
    image: "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=720&q=85",
    imageAlt: "A tutor helping a student with schoolwork",
  },
  {
    id: "moving-help",
    category: "Moving",
    badge: "Available today",
    badgeClass: "success",
    title: "Moving help",
    provider: "Move It",
    rating: "4.8 (46)",
    charge: "Charge 89%",
    location: "Hamilton North",
    price: "From $120 / hr",
    image: "https://images.unsplash.com/photo-1600518464441-9154a4dea21b?auto=format&fit=crop&w=720&q=85",
    imageAlt: "A mover carrying a cardboard box",
  },
  {
    id: "garden-lawn",
    category: "Gardening",
    badge: "Verified",
    badgeClass: "success",
    title: "Garden & lawn care",
    provider: "Green Thumb",
    rating: "4.7 (41)",
    charge: "Charge 83%",
    location: "Rototuna",
    price: "From $45 / hr",
    image: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=720&q=85",
    imageAlt: "A gardener working among green plants",
  },
  {
    id: "beauty-services",
    category: "Beauty",
    badge: "Top rated",
    badgeClass: "warning",
    title: "Mobile beauty services",
    provider: "Glow On The Go",
    rating: "4.9 (72)",
    charge: "Charge 92%",
    location: "Hamilton Central",
    price: "From $60 / hr",
    image: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=720&q=85",
    imageAlt: "A beauty professional applying makeup",
  },
  {
    id: "happy-paws",
    category: "Pet care",
    badge: "Verified",
    badgeClass: "success",
    title: "Pet sitting",
    provider: "Happy Paws",
    rating: "4.8 (53)",
    charge: "Charge 87%",
    location: "Hamilton East",
    price: "From $30 / hr",
    image: "https://images.unsplash.com/photo-1558788353-f76d92427f16?auto=format&fit=crop&w=720&q=85",
    imageAlt: "A dog sitting with its owner outdoors",
  },
  {
    id: "auto-repair",
    category: "Auto",
    badge: "Verified",
    badgeClass: "success",
    title: "Auto repair & service",
    provider: "Pro Auto Hamilton",
    rating: "4.9 (112)",
    charge: "Charge 94%",
    location: "Frankton",
    price: "From $80 / hr",
    image: "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&w=720&q=85",
    imageAlt: "A mechanic working under a car bonnet",
  },
];

const quickFilters = [
  { label: "Available today", icon: "fa-calendar-day" },
  { label: "Verified", icon: "fa-circle-check" },
  { label: "Top rated", icon: "fa-star" },
  { label: "Low price", icon: "fa-tag" },
  { label: "Near me", icon: "fa-location-crosshairs" },
];

const trustPoints = [
  { icon: "fa-shield-halved", title: "Verified & reviewed", description: "Every provider goes through our verification process." },
  { icon: "fa-lock", title: "Safe payments", description: "Pay safely through Tada when booking opens." },
  { icon: "fa-headset", title: "Local support", description: "Our team is here to help before and after a service." },
];

export function ServicesPageClient() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");

  const visibleServices = useMemo(() => {
    if (!activeCategory) return services;
    return services.filter((service) => service.category === activeCategory);
  }, [activeCategory]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const term = query.trim();
    setNotice(term ? `“${term}” service search will be available when Services launches.` : "Service search will be available when Services launches.");
  };

  const chooseCategory = (category: string) => {
    setActiveCategory((current) => current === category ? null : category);
    setNotice("");
  };

  return (
    <main className="services-page">
      <PageContainer size="wide" className="services-page-content">
        <section className="services-hero" aria-labelledby="services-title">
          <div className="services-hero-copy">
            <span className="services-preview-label ui-pill"><i className="fa-solid fa-sparkles" aria-hidden="true" /> Services preview</span>
            <h1 id="services-title">Trusted local help, close to home.</h1>
            <p>Find reliable people for the everyday jobs that make local life easier. Booking and secure payment are coming soon to Tada.</p>
          </div>

          <div className="services-search-wrap">
            <form className="services-search ui-card" role="search" onSubmit={submitSearch}>
              <label className="sr-only" htmlFor="services-search-input">What service do you need?</label>
              <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
              <input id="services-search-input" value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder="What service do you need?" />
              <label className="sr-only" htmlFor="services-location">Service location</label>
              <span className="services-location"><i className="fa-solid fa-location-dot" aria-hidden="true" /><select id="services-location" defaultValue="Hamilton, NZ"><option>Hamilton, NZ</option></select></span>
              <Button className="services-search-submit" type="submit" pill>Search services</Button>
            </form>
            <div className="services-quick-filters" aria-label="Quick service filters">
              {quickFilters.map((filter) => <button className={activeFilter === filter.label ? "is-active" : ""} type="button" key={filter.label} aria-pressed={activeFilter === filter.label} onClick={() => setActiveFilter((current) => current === filter.label ? null : filter.label)}><i className={`fa-solid ${filter.icon}`} aria-hidden="true" />{filter.label}</button>)}
            </div>
            {notice ? <p className="services-notice" role="status">{notice}</p> : null}
          </div>
        </section>

        <section className="services-category-section" aria-labelledby="services-category-title">
          <div className="services-section-heading">
            <div><p>Browse by category</p><h2 id="services-category-title">What can we help with?</h2></div>
            {activeCategory ? <button className="services-clear-button" type="button" onClick={() => setActiveCategory(null)}>Show all</button> : null}
          </div>
          <div className="services-category-grid">
            {categories.map((category) => <button className={activeCategory === category.label ? "services-category is-active" : "services-category"} type="button" key={category.label} aria-pressed={activeCategory === category.label} onClick={() => chooseCategory(category.label)}><span><i className={`fa-solid ${category.icon}`} aria-hidden="true" /></span><strong>{category.label}</strong></button>)}
          </div>
        </section>

        <div className="services-content-layout">
          <aside className="services-filter-panel ui-panel" aria-label="Service filters">
            <div className="services-filter-heading"><h2>Filters</h2><button type="button" onClick={() => { setActiveCategory(null); setActiveFilter(null); }}>Clear all</button></div>
            <label className="ui-field"><span>Service type</span><select defaultValue="All categories"><option>All categories</option>{categories.map((category) => <option key={category.label}>{category.label}</option>)}</select></label>
            <label className="ui-field"><span>Price range</span><select defaultValue="Any price"><option>Any price</option><option>Under $50 / hr</option><option>$50–$100 / hr</option></select></label>
            <label className="ui-field"><span>Availability</span><select defaultValue="Anytime"><option>Anytime</option><option>Available today</option><option>This week</option></select></label>
            <label className="ui-field"><span>Rating</span><select defaultValue="Any rating"><option>Any rating</option><option>4.5 and above</option><option>4.0 and above</option></select></label>
            <label className="services-checkbox"><input type="checkbox" /> Verified only</label>
            <label className="services-checkbox"><input type="checkbox" /> Available today</label>
            <Button className="services-filter-apply" variant="secondary" block>Apply filters</Button>
          </aside>

          <section className="services-results" aria-labelledby="services-results-title">
            <div className="services-results-heading">
              <div><p>{activeCategory ? `${activeCategory} near Hamilton` : "Popular services near Hamilton"}</p><h2 id="services-results-title">{activeCategory ? `Explore ${activeCategory.toLowerCase()} help` : "Local help, chosen for you"}</h2></div>
              <span>{visibleServices.length} services previewed</span>
            </div>
            <div className="services-card-grid">
              {visibleServices.map((service) => <article className="services-listing ui-card" key={service.id}>
                <div className="services-listing-image"><Image src={service.image} alt={service.imageAlt} fill sizes="(max-width: 767px) 84vw, (max-width: 1023px) 42vw, (min-width: 1280px) 15vw, 24vw" /><button type="button" aria-label={`Save ${service.title}`} onClick={() => setNotice(`${service.title} can be saved when Services launches.`)}><i className="fa-regular fa-heart" aria-hidden="true" /></button><span className={`ui-pill ${service.badgeClass === "success" ? "ui-pill--success" : service.badgeClass === "warning" ? "ui-pill--warning" : ""}`}>{service.badge}</span></div>
                <div className="services-listing-copy"><h3>{service.title}</h3><p>{service.provider}</p><div className="services-listing-meta"><span><i className="fa-solid fa-star" aria-hidden="true" /> {service.rating}</span><span>{service.charge}</span></div><span className="services-listing-location"><i className="fa-solid fa-location-dot" aria-hidden="true" /> {service.location}</span><strong>{service.price}</strong></div>
              </article>)}
            </div>
          </section>

          <aside className="services-side-rail" aria-label="Why use Tada Services">
            <section className="services-provider-promo ui-card">
              <span className="ui-pill">For providers</span>
              <i className="fa-solid fa-chart-line" aria-hidden="true" />
              <h2>Grow your local service.</h2>
              <p>Meet more local customers with a trusted Tada profile.</p>
              <button type="button" onClick={() => setNotice("Provider profiles will be available when Services launches.")}>For service providers <i className="fa-solid fa-arrow-right" aria-hidden="true" /></button>
            </section>
            <section className="services-trust-panel ui-panel">
              {trustPoints.map((point) => <article key={point.title}><i className={`fa-solid ${point.icon}`} aria-hidden="true" /><div><h2>{point.title}</h2><p>{point.description}</p></div></article>)}
              <button type="button" onClick={() => setNotice("More about Tada Services is coming soon.")}>How Tada Services works <i className="fa-solid fa-arrow-right" aria-hidden="true" /></button>
            </section>
          </aside>
        </div>

        <section className="services-request-cta ui-card" aria-labelledby="services-request-title">
          <span className="services-request-icon"><i className="fa-solid fa-clipboard-list" aria-hidden="true" /></span>
          <div><p>Can&apos;t find what you need?</p><h2 id="services-request-title">Tell local providers what you&apos;re looking for.</h2><span>Service requests will make it easy to get offers from the right people.</span></div>
          <Button pill onClick={() => setNotice("Service requests will be available when Services launches.")}><i className="fa-solid fa-plus" aria-hidden="true" /> Request a service</Button>
        </section>
      </PageContainer>
    </main>
  );
}
