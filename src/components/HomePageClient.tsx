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
  { title: "Market", description: "Buy & sell locally", href: "/market", icon: "ms-storefront", tone: "market" },
  { title: "Community", description: "Share with neighbours", href: "/community", icon: "ms-forum", tone: "community" },
  { title: "Services", description: "Find trusted local help", href: "/services", icon: "ms-build", tone: "services" },
  { title: "Jobs", description: "Find work near you", href: "/jobs", icon: "ms-work", tone: "jobs", comingSoon: true },
];

const koreanDestinations = [
  { title: "마켓", subtitle: "Market", description: "사고 팔고 나눠요", href: "/market", icon: "ms-storefront", tone: "market" },
  { title: "동네이야기", subtitle: "Community", description: "묻고 나누고 연결해요", href: "/community", icon: "ms-forum", tone: "community" },
  { title: "생활도움", subtitle: "Services", description: "필요한 도움을 가까운 곳에서", href: "/services", icon: "ms-build", tone: "services" },
  { title: "일자리", subtitle: "Jobs", description: "가까운 일자리 찾기", href: "/jobs", icon: "ms-work", tone: "jobs", comingSoon: true },
];

const marketShortcuts = [
  { label: "Second Hands", href: "/market/secondhands", icon: "ms-storefront" },
  { label: "Garage Sale", href: "/market/garage-sales", icon: "ms-warehouse" },
  { label: "Moving Sale", href: "/market/moving-sales", icon: "ms-local-shipping" },
  { label: "$2 Deals", href: "/market/2dollarshop", icon: "ms-savings" },
  { label: "Group Buy", href: "/market/groupbuy", icon: "ms-groups" },
];

const koreanMarketShortcuts = [
  { label: "중고마켓", subtitle: "Second Hand", href: "/market/secondhands", icon: "ms-storefront" },
  { label: "차고세일", subtitle: "Garage Sale", href: "/market/garage-sales", icon: "ms-warehouse" },
  { label: "이사세일", subtitle: "Moving Sale", href: "/market/moving-sales", icon: "ms-local-shipping" },
  { label: "$2 마켓", subtitle: "2 Dollar Shop", href: "/market/2dollarshop", icon: "ms-savings" },
  { label: "공동구매", subtitle: "Group Buy", href: "/market/groupbuy", icon: "ms-groups" },
];

const marketShortcutIcons: Record<string, string> = {
  "/market/secondhands": "ms-storefront",
  "/market/garage-sales": "ms-warehouse",
  "/market/moving-sales": "ms-local-shipping",
  "/market/2dollarshop": "ms-savings",
  "/market/groupbuy": "ms-groups",
};

const destinationActions = {
  market: { primary: "Browse listings", secondary: "Sell something" },
  community: { primary: "See local posts", secondary: "Start a post" },
  services: { primary: "Explore services", secondary: "Offer a service" },
  jobs: { primary: "Coming soon", secondary: null },
} as const;

const koreanDestinationActions = {
  market: { primary: "상품 둘러보기", secondary: "판매 등록" },
  community: { primary: "동네 글 보기", secondary: "글쓰기" },
  services: { primary: "서비스 보기", secondary: "서비스 등록" },
  jobs: { primary: "준비중", secondary: null },
} as const;

const helpCategories = [
  { label: "Food", icon: "ms-restaurant" },
  { label: "Repairs", icon: "ms-build" },
  { label: "Moving", icon: "ms-local-shipping" },
  { label: "Gardening", icon: "ms-yard" },
  { label: "Auto", icon: "ms-directions-car" },
  { label: "Other", icon: "ms-more-horiz" },
];

const koreanHelpCategories = ["음식", "수리", "이사", "정원", "자동차", "기타"];
const recentServicePosts: Array<{ icon: string; title: string; titleKo: string; provider: string; location: string; locationKo: string; price: string; priceKo: string; tone: string }> = [];

const trustItems = [
  { icon: "ms-sell", title: "Free to list", description: "Share items in minutes" },
  { icon: "ms-groups", title: "Local first", description: "Made for nearby life" },
  { icon: "ms-security", title: "Safer deals", description: "Trust guides every trade" },
  { icon: "ms-bolt", title: "Quick to use", description: "Find what matters faster" },
];

const koreanTrustItems = [
  { icon: "ms-sell", title: "무료로 등록", description: "무료 나눔과 물품을 등록하세요" },
  { icon: "ms-groups", title: "가까운 이웃과 연결", description: "이웃과 묻고 나누고 연결해요" },
  { icon: "ms-security", title: "안전한 거래", description: "신뢰할 수 있는 거래를 만들어요" },
  { icon: "ms-bolt", title: "빠르고 간편하게", description: "처음부터 끝까지 쉽게 사용해요" },
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
    heroLead: "Connect,", heroBrand: "Tada", heroDescription: "Buy, sell, share, and find what you need nearby.", explore: "Explore Tada", post: "Post an item", soon: "Soon", marketPrompt: "What are you looking for?", marketTitle: "Explore Market", nearby: "New near you", seeAll: "See all", listingEmpty: "New local listings will appear here.", browseMarket: "Browse Market", sponsored: "Sponsored", sponsorTitle: "Moving made simple.", sponsorDescription: "Trusted local help for your next move.", sponsorAction: "Explore moving sales", stories: "Community", help: "Need a hand?", helpDescription: "Find useful local help for everyday jobs.", servicesAction: "Explore services", jobsTitle: "Find work close to home with Tada Jobs", jobsDescription: "Local opportunities are coming soon.",
  },
  ko: {
    heroLead: "필요한 순간,", heroBrand: "타다.", heroDescription: "사고팔고, 나누고, 연결하고 — 일상을 타다.", explore: "둘러보기", post: "등록하기", soon: "준비중", marketPrompt: "어떤 마켓을 찾으세요?", marketTitle: "", nearby: "내 근처 새 상품", seeAll: "전체보기", listingEmpty: "내 근처 새 상품을 준비하고 있어요.", browseMarket: "마켓 둘러보기", sponsored: "Sponsored", sponsorTitle: "이사 준비 중이신가요?", sponsorDescription: "믿을 수 있는 이사 서비스와 함께 해보세요!", sponsorAction: "이사 서비스 보기", stories: "우리 동네 이야기", help: "생활에 도움이 필요하세요?", helpDescription: "필요한 도움을 가까운 곳에서 찾아보세요.", servicesAction: "서비스 둘러보기", jobsTitle: "가까운 일자리도 곧 Tada에서", jobsDescription: "함께 구할 수 있는 지역의 일자리를 찾아보세요.",
  },
};

const communityIcons: Record<string, string> = {
  event: "ms-event",
  question: "ms-help",
  recommendation: "ms-thumb-up",
  free: "ms-redeem",
  notice: "ms-campaign",
  housing: "ms-home",
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
        <div><i className="ms ms-location-on" aria-hidden="true" /><h2 id="nearby-title">{text.nearby}</h2>{locationLabel ? <span>{locationLabel}</span> : null}</div>
        <Link href="/market">{text.seeAll} <i className="ms ms-arrow-forward" aria-hidden="true" /></Link>
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
        <div className="home-reference-listing-empty ui-card"><i className="ms ms-storefront" aria-hidden="true" /><p>{text.listingEmpty}</p><Link href="/market">{text.browseMarket}</Link></div>
      )}
    </section>
  );
}

function HomeCommunityHighlights({ posts, text }: { posts: CommunityPost[]; text: typeof homeCopy.en }) {
  return (
    <section className="home-reference-community-feed" aria-labelledby="community-highlights-title">
      <header className="home-reference-panel-heading">
        <div><i className="ms ms-forum" aria-hidden="true" /><h2 id="community-highlights-title">{text.stories}</h2></div>
        <Link href="/community">{text.seeAll}</Link>
      </header>
      <div className="home-reference-community-cards">
        {posts.slice(0, 4).map((post) => (
          <Link className={`home-reference-community-card home-reference-community-card--${post.type}`} href={`/community/${post.id}`} key={post.id}>
            <i className={`ms ${communityIcons[post.type] ?? "ms-forum"}`} aria-hidden="true" />
            <div><strong>{post.title}</strong><p>{communityExcerpt(post.excerpt)}</p><small><i className="ms ms-location-on" aria-hidden="true" />{post.location} • {post.timeAgo ?? post.eventDate ?? "New"}</small></div>
            <footer><span><i className="ms ms-visibility" aria-hidden="true" />{post.viewCount ?? 0}</span><span><i className="ms ms-favorite" aria-hidden="true" />{post.score ?? 0}</span><span><i className="ms ms-chat-bubble" aria-hidden="true" />{post.responseCount ?? 0}</span></footer>
            <span><strong>{post.title}</strong><small>{post.location} · {post.timeAgo ?? post.eventDate ?? "New"}</small></span>
            <i className="ms ms-chevron-right" aria-hidden="true" />
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
        <div><i className="ms ms-build" aria-hidden="true" /><h2 id="help-panel-title">{text.help}</h2></div>
        <Link href="/services">{text.servicesAction}</Link>
      </header>
      <p>{text.helpDescription}</p>
      <div className="home-reference-help-grid">
        {helpCategories.map((category, index) => (
          <Link href="/services" key={category.label}><i className={`ms ${category.icon}`} aria-hidden="true" /><span>{isKorean ? koreanHelpCategories[index] : category.label}</span><small>{text.soon}</small></Link>
        ))}
      </div>
      <div className="home-reference-help-posts" aria-label="Recent service posts">
        {recentServicePosts.map((post) => (
          <Link className={`home-reference-help-post home-reference-help-post--${post.tone}`} href="/services" key={post.provider}>
            <i className={`ms ${post.icon}`} aria-hidden="true" />
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
  const destinationHeading = isKorean ? "우리동네 둘러보기" : "Explore your neighbourhood";
  const destinationIntro = null;
  const marketHeading = isKorean ? "타다 마켓 둘러보기" : "Browse market your way";
  const heroNearbyAction = isKorean ? "내 주변 보기" : "See what's nearby";
  const heroPostAction = isKorean ? "글 올리기" : "Post something";
  const heroTrust = isKorean ? "무료 등록  ·  1분이면 충분해요  ·  가까운 이웃과 연결" : "Free to post  ·  Takes about a minute  ·  Local first";
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
              <div className="home-reference-hero-actions"><Link className="home-reference-primary" href="/market"><i className="ms ms-location-on" aria-hidden="true" />{heroNearbyAction}</Link><Link className="home-reference-secondary" href="/market/create"><i className="ms ms-add" aria-hidden="true" />{heroPostAction}</Link></div>
              <small className="home-reference-hero-trust">{heroTrust}</small>
            </div>
            <div className="home-reference-hero-art" aria-hidden="true"><Image src="/images/home/tada-local-life-hero.png" alt="" fill priority sizes="(max-width: 767px) 0px, (max-width: 1279px) 48vw, 640px" /></div>
          </section>

          <section className="home-reference-destinations" aria-label="Explore Tada">
            <h2>{destinationHeading}</h2>
            {destinationIntro ? <p>{destinationIntro}</p> : null}
            <div className="home-reference-destination-grid">
              {visibleDestinations.map((destination) => {
                const subtitle = "subtitle" in destination && typeof destination.subtitle === "string" ? destination.subtitle : null;
                const action = (isKorean ? koreanDestinationActions : destinationActions)[destination.tone as keyof typeof destinationActions];
                return <Link className={`home-reference-destination home-reference-destination--${destination.tone} ui-card`} href={destination.href} key={destination.title}>
                  <div className="home-reference-destination-heading"><i className={`ms ${destination.icon}`} aria-hidden="true" /><strong>{destination.title}</strong></div>
                  <span>{subtitle ? <small className="home-reference-destination-subtitle">{subtitle}</small> : null}<small>{destination.description}</small></span>
                  <footer className={isKorean ? "is-korean" : undefined}><strong>{destination.comingSoon ? action.primary : action.primary} {!destination.comingSoon ? <i className="ms ms-arrow-forward" aria-hidden="true" /> : null}</strong>{action.secondary ? <small><i className="ms ms-add" aria-hidden="true" /> {action.secondary}</small> : <em>{text.soon}</em>}</footer>
                </Link>
              })}
            </div>
          </section>

          <section className="home-reference-market" aria-labelledby="market-shortcuts-title">
            <header><h2 id="market-shortcuts-title">{marketHeading}</h2></header>
            <div>
              {visibleMarketShortcuts.map((shortcut) => {
                const subtitle = "subtitle" in shortcut && typeof shortcut.subtitle === "string" ? shortcut.subtitle : null;
                const icon = marketShortcutIcons[shortcut.href] ?? shortcut.icon;
                return <Link className={`home-reference-market-shortcut home-reference-market-shortcut--${shortcut.href.split("/").pop()} ui-card`} href={shortcut.href} key={shortcut.href}><i className={`ms ${icon}`} aria-hidden="true" /><span>{shortcut.label}{subtitle ? <small>{subtitle}</small> : null}</span><i className="ms ms-chevron-right" aria-hidden="true" /></Link>;
              })}
            </div>
          </section>

          <HomeListingRail listings={discoveryListings} locationLabel={locationLabel} savedListingIds={savedListingIds} text={isKorean ? { ...text, nearby: "우리동네 새상품" } : text} />

          <section className="home-reference-sponsor ui-card" aria-labelledby="sponsor-title">
            <div><p>{text.sponsored}</p><h2 id="sponsor-title">{text.sponsorTitle}</h2><span>{text.sponsorDescription}</span><Link href="/market">{text.sponsorAction} <i className="ms ms-arrow-forward" aria-hidden="true" /></Link></div>
            <div aria-hidden="true"><i className="ms ms-local-shipping" /><strong>SwiftMove</strong></div>
          </section>

          <HomeCommunityHighlights posts={highlightedCommunityPosts} text={text} />

          <div className="home-reference-support-grid">
            <HomeHelpPanel isKorean={isKorean} text={text} />
            <Link className="home-reference-jobs-cta ui-card" href="/jobs"><header><i className="ms ms-work" aria-hidden="true" /><span><strong>{text.jobsTitle}</strong><small>{text.jobsDescription}</small></span><em>{text.soon}</em><i className="ms ms-arrow-forward" aria-hidden="true" /></header><div className="home-reference-jobs-image"><Image src="/images/home/journey-jobs.png" alt="" fill sizes="(max-width: 767px) 100vw, (max-width: 1279px) 46vw, 560px" /></div></Link>
          </div>
        </PageContainer>
      </main>
      <Footer />
    </>
  );
}
