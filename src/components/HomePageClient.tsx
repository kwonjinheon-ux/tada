"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { PageContainer } from "@/components/layout/PageContainer";
import { useLanguage } from "@/components/LanguageProvider";
import { communityPosts, type CommunityPost } from "@/data/community-posts";
import type { Listing } from "@/data/listings";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

const destinations = [
  { title: "Market", description: "Buy & sell locally", href: "/market", icon: "fa-store", tone: "market" },
  { title: "Community", description: "Share with neighbours", href: "/community", icon: "fa-comments", tone: "community" },
  { title: "Services", description: "Find trusted local help", href: "/services", icon: "fa-screwdriver-wrench", tone: "services" },
  { title: "Jobs", description: "Find work near you", href: "/jobs", icon: "fa-briefcase", tone: "jobs", comingSoon: true },
];

const koreanDestinations = [
  { title: "마켓", description: "사고 팔고 나눠요", href: "/market", icon: "fa-store", tone: "market" },
  { title: "동네이야기", description: "묻고 나누고 연결해요", href: "/community", icon: "fa-comments", tone: "community" },
  { title: "생활도움", description: "청소, 이사, 수리, 과외", href: "/services", icon: "fa-screwdriver-wrench", tone: "services" },
  { title: "일자리", description: "가까운 일자리 찾기", href: "/jobs", icon: "fa-briefcase", tone: "jobs", comingSoon: true },
];

const marketShortcuts = [
  { label: "Second Hands", href: "/market/secondhands", icon: "fa-store" },
  { label: "Garage Sale", href: "/market/garage-sales", icon: "fa-warehouse" },
  { label: "Moving Sale", href: "/market/moving-sales", icon: "fa-truck-ramp-box" },
  { label: "$2 Deals", href: "/market/2dollarshop", icon: "fa-coins" },
  { label: "Group Buy", href: "/market/groupbuy", icon: "fa-people-group" },
];

const koreanMarketShortcuts = [
  { label: "중고마켓", subtitle: "Second Hand", href: "/market/secondhands", icon: "fa-store" },
  { label: "차고세일", subtitle: "Garage Sale", href: "/market/garage-sales", icon: "fa-warehouse" },
  { label: "이사세일", subtitle: "Moving Sale", href: "/market/moving-sales", icon: "fa-truck-ramp-box" },
  { label: "$2 마켓", subtitle: "2 Dollar Shop", href: "/market/2dollarshop", icon: "fa-coins" },
  { label: "공동구매", subtitle: "Group Buy", href: "/market/groupbuy", icon: "fa-people-group" },
];

const helpCategories = [
  { label: "Food", icon: "fa-utensils" },
  { label: "Repairs", icon: "fa-screwdriver-wrench" },
  { label: "Moving", icon: "fa-truck" },
  { label: "Gardening", icon: "fa-seedling" },
  { label: "Auto", icon: "fa-car" },
  { label: "Other", icon: "fa-ellipsis" },
];

const koreanHelpCategories = ["음식", "수리", "이사", "정원", "자동차", "기타"];
const recentServicePosts: Array<{ icon: string; title: string; titleKo: string; provider: string; location: string; locationKo: string; price: string; priceKo: string; tone: string }> = [];

const trustItems = [
  { icon: "fa-tag", title: "Free to list", description: "Share items in minutes" },
  { icon: "fa-people-group", title: "Local first", description: "Made for nearby life" },
  { icon: "fa-shield-halved", title: "Safer deals", description: "Trust guides every trade" },
  { icon: "fa-bolt", title: "Quick to use", description: "Find what matters faster" },
];

const koreanTrustItems = [
  { icon: "fa-tag", title: "무료로 등록", description: "무료 나눔과 물품을 등록하세요" },
  { icon: "fa-people-group", title: "가까운 이웃과 연결", description: "이웃과 묻고 나누고 연결해요" },
  { icon: "fa-shield-halved", title: "안전한 거래", description: "신뢰할 수 있는 거래를 만들어요" },
  { icon: "fa-bolt", title: "빠르고 간편하게", description: "처음부터 끝까지 쉽게 사용해요" },
];

type HomeCopy = {
  heroLead: string;
  heroBrand: string;
  heroDescription: string;
  explore: string;
  post: string;
  soon: string;
  marketPrompt: string;
  marketTitle: string;
  nearby: string;
  seeAll: string;
  listingEmpty: string;
  browseMarket: string;
  sponsored: string;
  sponsorTitle: string;
  sponsorDescription: string;
  sponsorAction: string;
  stories: string;
  help: string;
  helpDescription: string;
  servicesAction: string;
  jobsTitle: string;
  jobsDescription: string;
};

const homeCopy: Record<"en" | "ko", HomeCopy> = {
  en: {
    heroLead: "When you need it,", heroBrand: "Tada.", heroDescription: "Buy, share and connect — made for everyday local life.", explore: "Explore Tada", post: "Post an item", soon: "Soon", marketPrompt: "What are you looking for?", marketTitle: "Explore Market", nearby: "New near you", seeAll: "See all", listingEmpty: "New local listings will appear here.", browseMarket: "Browse Market", sponsored: "Sponsored", sponsorTitle: "Moving made simple.", sponsorDescription: "Trusted local help for your next move.", sponsorAction: "Explore moving sales", stories: "Community", help: "Need a hand?", helpDescription: "Find useful local help for everyday jobs.", servicesAction: "Explore services", jobsTitle: "Find work close to home with Tada Jobs", jobsDescription: "Local opportunities are coming soon.",
  },
  ko: {
    heroLead: "필요한 순간,", heroBrand: "타다.", heroDescription: "사고팔고, 나누고, 연결하고 — 일상을 타다.", explore: "둘러보기", post: "등록하기", soon: "준비중", marketPrompt: "어떤 마켓을 찾으세요?", marketTitle: "", nearby: "내 근처 새 상품", seeAll: "전체보기", listingEmpty: "내 근처 새 상품을 준비하고 있어요.", browseMarket: "마켓 둘러보기", sponsored: "Sponsored", sponsorTitle: "이사 준비 중이신가요?", sponsorDescription: "믿을 수 있는 이사 서비스와 함께 해보세요!", sponsorAction: "이사 서비스 보기", stories: "우리 동네 이야기", help: "생활에 도움이 필요하세요?", helpDescription: "필요한 도움을 가까운 곳에서 찾아보세요.", servicesAction: "서비스 둘러보기", jobsTitle: "가까운 일자리도 곧 Tada에서", jobsDescription: "함께 구할 수 있는 지역의 일자리를 찾아보세요.",
  },
};

const communityIcons: Record<string, string> = {
  event: "fa-calendar-day",
  question: "fa-circle-question",
  recommendation: "fa-thumbs-up",
  free: "fa-gift",
  notice: "fa-bullhorn",
  housing: "fa-house",
};

function communityExcerpt(excerpt: string) {
  const plain = excerpt.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const firstSentence = plain.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? plain;
  return `${firstSentence.slice(0, 92).trim()}...`;
}

type HomeListingRailProps = {
  listings: Listing[];
  locationLabel?: string | null;
  savedListingIds: string[];
  text: typeof homeCopy.en;
};

function HomeListingRail({ listings, locationLabel, savedListingIds, text }: HomeListingRailProps) {
  return (
    <section className="home-reference-listing-section" aria-labelledby="nearby-title">
      <header className="home-reference-section-heading">
        <div><i className="fa-solid fa-location-dot" aria-hidden="true" /><h2 id="nearby-title">{text.nearby}</h2>{locationLabel ? <span>{locationLabel}</span> : null}</div>
        <Link href="/market">{text.seeAll} <i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link>
      </header>
      {listings.length ? (
        <div className="home-reference-listing-grid">
          {listings.map((listing, index) => (
            <ProductCard
              imageSizes="(max-width: 767px) 240px, (min-width: 1280px) 220px, 25vw"
              initialIsSaved={savedListingIds.includes(listing.id)}
              key={listing.id}
              listing={listing}
              priority={index < 3}
            />
          ))}
        </div>
      ) : (
        <div className="home-reference-listing-empty ui-card"><i className="fa-solid fa-store" aria-hidden="true" /><p>{text.listingEmpty}</p><Link href="/market">{text.browseMarket}</Link></div>
      )}
    </section>
  );
}

function HomeCommunityHighlights({ posts, text }: { posts: CommunityPost[]; text: typeof homeCopy.en }) {
  return (
    <section className="home-reference-community-feed" aria-labelledby="community-highlights-title">
      <header className="home-reference-panel-heading">
        <div><i className="fa-solid fa-comments" aria-hidden="true" /><h2 id="community-highlights-title">{text.stories}</h2></div>
        <Link href="/community">{text.seeAll}</Link>
      </header>
      <div className="home-reference-community-cards">
        {posts.slice(0, 4).map((post) => (
          <Link className={`home-reference-community-card home-reference-community-card--${post.type}`} href={`/community/${post.id}`} key={post.id}>
            <i className={`fa-solid ${communityIcons[post.type] ?? "fa-comments"}`} aria-hidden="true" />
            <div><strong>{post.title}</strong><p>{communityExcerpt(post.excerpt)}</p><small><i className="fa-solid fa-location-dot" aria-hidden="true" />{post.location} • {post.timeAgo ?? post.eventDate ?? "New"}</small></div>
            <footer><span><i className="fa-regular fa-eye" aria-hidden="true" />{post.viewCount ?? 0}</span><span><i className="fa-regular fa-heart" aria-hidden="true" />{post.score ?? 0}</span><span><i className="fa-regular fa-comment" aria-hidden="true" />{post.responseCount ?? 0}</span></footer>
            <span><strong>{post.title}</strong><small>{post.location} · {post.timeAgo ?? post.eventDate ?? "New"}</small></span>
            <i className="fa-solid fa-chevron-right" aria-hidden="true" />
          </Link>
        ))}
      </div>
    </section>
  );
}

function HomeHelpPanel({ isKorean, text }: { isKorean: boolean; text: typeof homeCopy.en }) {
  return (
    <section className="home-reference-help ui-card" aria-labelledby="help-panel-title">
      <header className="home-reference-panel-heading">
        <div><i className="fa-solid fa-screwdriver-wrench" aria-hidden="true" /><h2 id="help-panel-title">{text.help}</h2></div>
        <Link href="/services">{text.servicesAction}</Link>
      </header>
      <p>{text.helpDescription}</p>
      <div className="home-reference-help-grid">
        {helpCategories.map((category, index) => (
          <Link href="/services" key={category.label}><i className={`fa-solid ${category.icon}`} aria-hidden="true" /><span>{isKorean ? koreanHelpCategories[index] : category.label}</span><small>{text.soon}</small></Link>
        ))}
      </div>
      <div className="home-reference-help-posts" aria-label="Recent service posts">
        {recentServicePosts.map((post) => (
          <Link className={`home-reference-help-post home-reference-help-post--${post.tone}`} href="/services" key={post.provider}>
            <i className={`fa-solid ${post.icon}`} aria-hidden="true" />
            <span><strong>{isKorean ? post.titleKo : post.title}</strong><small>{post.provider} · {isKorean ? post.locationKo : post.location}</small></span>
            <em>{isKorean ? post.priceKo : post.price}</em>
          </Link>
        ))}
      </div>
    </section>
  );
}

type HomePageClientProps = {
  communityHighlights?: CommunityPost[];
  locationLabel?: string | null;
  nearbyListings?: Listing[];
  justListedListings?: Listing[];
  savedListingIds?: string[];
};

export function HomePageClient({
  communityHighlights = [],
  locationLabel = null,
  nearbyListings = [],
  justListedListings = [],
  savedListingIds = [],
}: HomePageClientProps) {
  const { locale } = useLanguage();
  const router = useRouter();
  const isKorean = locale === "ko";
  const text = isKorean ? homeCopy.ko : homeCopy.en;
  const heroWordmark = isKorean
    ? { src: "/images/brand/tada-wordmark.png", width: 2048, height: 850 }
    : { src: "/images/logo.png", width: 1536, height: 1024 };
  const visibleDestinations = isKorean ? koreanDestinations : destinations;
  const visibleMarketShortcuts = isKorean ? koreanMarketShortcuts : marketShortcuts;
  const visibleTrustItems = isKorean ? koreanTrustItems : trustItems;
  const discoveryListings = nearbyListings.length ? nearbyListings : justListedListings;
  const highlightedCommunityPosts = communityHighlights.length ? communityHighlights : communityPosts;

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    let refreshFrame: number | null = null;
    const refreshHighlights = () => {
      if (refreshFrame !== null) return;
      refreshFrame = window.requestAnimationFrame(() => {
        refreshFrame = null;
        router.refresh();
      });
    };
    const channel = supabase
      .channel("home-community-engagement-live")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "community_posts" }, refreshHighlights)
      .on("postgres_changes", { event: "*", schema: "public", table: "community_post_comments" }, refreshHighlights)
      .subscribe();
    return () => {
      if (refreshFrame !== null) window.cancelAnimationFrame(refreshFrame);
      void supabase.removeChannel(channel).catch(() => undefined);
    };
  }, [router]);

  return (
    <>
      <main className="market-home home-reference">
        <PageContainer className="home-reference-content">
          <section className="home-reference-hero" aria-labelledby="home-reference-title">
            <div className="home-reference-hero-copy">
              <h1 id="home-reference-title">{text.heroLead} <span className={`home-reference-hero-wordmark ${isKorean ? "is-korean" : "is-english"}`}><Image src={heroWordmark.src} alt={text.heroBrand} width={heroWordmark.width} height={heroWordmark.height} priority /></span></h1>
              <p>{text.heroDescription}</p>
              <div>
                <Link className="home-reference-primary" href="/market">{text.explore} <i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link>
                <Link className="home-reference-secondary" href="/market/create"><i className="fa-solid fa-plus" aria-hidden="true" /> {text.post}</Link>
              </div>
            </div>
            <div className="home-reference-hero-art" aria-hidden="true"><Image src="/images/home/tada-local-life-hero.png" alt="" fill priority sizes="(max-width: 767px) 0px, (max-width: 1279px) 48vw, 640px" /></div>
          </section>

          <section className="home-reference-destinations" aria-label="Explore Tada">
            {visibleDestinations.map((destination) => (
              <Link className={`home-reference-destination home-reference-destination--${destination.tone} ui-card`} href={destination.href} key={destination.title}>
                <i className={`fa-solid ${destination.icon}`} aria-hidden="true" />
                <span><strong>{destination.title}</strong><small>{destination.description}</small></span>
                {destination.comingSoon ? <em>{text.soon}</em> : <i className="fa-solid fa-chevron-right" aria-hidden="true" />}
              </Link>
            ))}
          </section>

          <section className="home-reference-market" aria-labelledby="market-shortcuts-title">
            <header><p>{text.marketPrompt}</p><h2 id="market-shortcuts-title">{text.marketTitle}</h2></header>
            <div>
              {visibleMarketShortcuts.map((shortcut) => {
                const subtitle = "subtitle" in shortcut && typeof shortcut.subtitle === "string" ? shortcut.subtitle : null;
                return <Link className="home-reference-market-shortcut ui-card" href={shortcut.href} key={shortcut.href}><i className={`fa-solid ${shortcut.icon}`} aria-hidden="true" /><span>{shortcut.label}{subtitle ? <small>{subtitle}</small> : null}</span></Link>;
              })}
            </div>
          </section>

          <HomeListingRail listings={discoveryListings} locationLabel={locationLabel} savedListingIds={savedListingIds} text={text} />

          <section className="home-reference-sponsor ui-card" aria-labelledby="sponsor-title">
            <div><p>{text.sponsored}</p><h2 id="sponsor-title">{text.sponsorTitle}</h2><span>{text.sponsorDescription}</span><Link href="/market">{text.sponsorAction} <i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link></div>
            <div aria-hidden="true"><i className="fa-solid fa-truck-fast" /><strong>SwiftMove</strong></div>
          </section>

          <HomeCommunityHighlights posts={highlightedCommunityPosts} text={text} />

          <div className="home-reference-support-grid">
            <HomeHelpPanel isKorean={isKorean} text={text} />
            <Link className="home-reference-jobs-cta ui-card" href="/jobs"><i className="fa-solid fa-briefcase" aria-hidden="true" /><span><strong>{text.jobsTitle}</strong><small>{text.jobsDescription}</small></span><em>{text.soon}</em><i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link>
          </div>

          <section className="home-reference-trust" aria-label="Why use Tada">
            {visibleTrustItems.map((item) => <article className="ui-card" key={item.title}><i className={`fa-solid ${item.icon}`} aria-hidden="true" /><div><h2>{item.title}</h2><p>{item.description}</p></div></article>)}
          </section>
        </PageContainer>
      </main>
      <Footer />
    </>
  );
}
