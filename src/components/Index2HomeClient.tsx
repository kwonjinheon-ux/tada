"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { PageContainer } from "@/components/layout/PageContainer";
import { useLanguage } from "@/components/LanguageProvider";
import type { CommunityPost } from "@/data/community-posts";
import type { Listing } from "@/data/listings";

type Index2HomeClientProps = {
  locationLabel: string | null;
  listings: Listing[];
  savedListingIds: string[];
  posts: CommunityPost[];
};

const categories = ["전체", "무료 나눔", "$10 이하", "가구", "전자기기", "생활", "육아"];

export function Index2HomeClient({ locationLabel, listings, savedListingIds, posts }: Index2HomeClientProps) {
  const { locale } = useLanguage();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(categories[0]);
  const isKorean = locale === "ko";
  const place = locationLabel || (isKorean ? "내 주변" : "Near you");
  const heading = isKorean ? "내 주변에서는 어떤 일이 일어나고 있나요?" : "What's happening near you?";
  const visibleListings = listings.slice(0, 6);

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = search.trim();
    router.push(query ? `/market?search=${encodeURIComponent(query)}` : "/market");
  };

  return <>
    <main className="index2-home">
      <section className="index2-hero">
        <Image src="/images/home/hamilton-waikato-hero.png" alt="Hamilton's Waikato River and city skyline" fill priority sizes="100vw" className="index2-hero-image" />
        <PageContainer className="index2-hero-content">
          <p className="index2-hero-note is-left" aria-hidden="true">{isKorean ? <>가까운 이웃과<br />더 따뜻한 동네</> : <>Local people.<br />Brighter neighbourhoods.</>}</p>
          <p className="index2-hero-note is-right" aria-hidden="true">{isKorean ? <>좋은 일은<br />우리 동네에서 시작돼요.</> : <>Good things happen<br />locally.</>}</p>
          <div className="index2-hero-copy">
            <p className="index2-eyebrow"><i className="ms ms-location-on" aria-hidden="true" /> {place}</p>
            <h1>{heading}</h1>
            <p>{isKorean ? "사고, 팔고, 나누고, 우리 동네와 연결하세요." : "Buy, sell and connect locally in Hamilton and beyond."}</p>
            <form className="index2-search" onSubmit={submitSearch}>
              <i className="ms ms-search" aria-hidden="true" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={isKorean ? "물건, 장소, 질문을 검색해 보세요" : "Search items, places, questions…"} aria-label={isKorean ? "통합 검색" : "Search Tada"} />
              <button type="submit" aria-label={isKorean ? "검색" : "Search"}><i className="ms ms-arrow-forward" aria-hidden="true" /></button>
            </form>
            <div className="index2-local-controls" aria-label={isKorean ? "지역 검색 범위" : "Local search area"}>
              <button type="button"><i className="ms ms-location-on" aria-hidden="true" /> {place}<i className="ms ms-expand-more" aria-hidden="true" /></button>
              <button type="button"><i className="ms ms-near-me" aria-hidden="true" /> {isKorean ? "5km 이내" : "Within 5 km"}<i className="ms ms-expand-more" aria-hidden="true" /></button>
            </div>
            <div className="index2-hero-actions">
              <Link className="ui-button ui-button--primary ui-button--pill" href="/market/create"><i className="ms ms-sell" aria-hidden="true" />{isKorean ? "판매하기" : "Sell something"}</Link>
              <Link className="ui-button ui-button--secondary ui-button--pill" href="/market/create"><i className="ms ms-redeem" aria-hidden="true" />{isKorean ? "무료 나눔" : "Give away"}</Link>
            </div>
          </div>
        </PageContainer>
      </section>

      <PageContainer className="index2-content">
        <section className="index2-nearby" aria-labelledby="index2-nearby-title">
          <header className="index2-section-heading"><div><h2 id="index2-nearby-title">{isKorean ? "내 근처 상품" : "Near you"}</h2><p>{isKorean ? "가까운 이웃이 올린 새 상품이에요" : "Great finds from people in your area."}</p></div><Link href="/market">{isKorean ? "전체 보기" : "See all"} <i className="ms ms-arrow-forward" aria-hidden="true" /></Link></header>
          <div className="index2-filters" aria-label={isKorean ? "상품 카테고리" : "Product categories"}>{categories.map((category) => <button className={selectedCategory === category ? "is-active" : ""} key={category} type="button" aria-pressed={selectedCategory === category} onClick={() => setSelectedCategory(category)}>{category}</button>)}</div>
          <div className="index2-nearby-layout"><div className="index2-product-rail">{visibleListings.length ? visibleListings.map((listing, index) => <ProductCard key={listing.id} listing={listing} initialIsSaved={savedListingIds.includes(listing.id)} priority={index < 2} imageSizes="(max-width: 767px) 72vw, (max-width: 1279px) 30vw, 220px" />) : <Index2EmptyState />}</div><aside className="index2-neighbourhood-panel ui-card"><span className="index2-icon"><i className="ms ms-yard" aria-hidden="true" /></span><h3>{isKorean ? "더 다정한 동네" : "A kinder community"}</h3><p>{isKorean ? "아직 쓸 수 있는 물건을 이웃에게 나누고, 우리 동네의 낭비를 줄여요." : "Give pre-loved items a new home and help reduce waste locally."}</p><div /><strong>{isKorean ? <>같은 동네,<br />더 밝은 내일.</> : <>Same neighbourhood.<br />A brighter tomorrow.</>}</strong></aside></div>
        </section>

        <div className="index2-split-grid">
          <section className="index2-free-panel ui-card" aria-labelledby="index2-free-title"><div><span className="index2-icon"><i className="ms ms-redeem" aria-hidden="true" /></span><h2 id="index2-free-title">{isKorean ? "무료 나눔" : "Free near you"}</h2><p>{isKorean ? "좋은 물건을 이웃과 나누고, 더 오래 사용하세요." : "Good stuff. Better together."}</p></div><Link className="ui-button ui-button--secondary" href="/market?price=free">{isKorean ? "무료 상품 보기" : "Browse free items"}<i className="ms ms-arrow-forward" aria-hidden="true" /></Link></section>
          <section className="index2-service-panel ui-card" aria-labelledby="index2-service-title"><Image src="/images/home/journey-market.png" alt="" fill sizes="(max-width: 767px) 100vw, 50vw" /><div><span className="index2-icon"><i className="ms ms-warehouse" aria-hidden="true" /></span><h2 id="index2-service-title">{isKorean ? "이번 주 차고·이사 세일" : "Garage & moving sales"}</h2><p>{isKorean ? "이웃의 보물을 발견하고, 가까운 세일에 참여해 보세요." : "Treasure hunts are happening in your neighbourhood."}</p><Link href="/market/garage-sales">{isKorean ? "세일 둘러보기" : "Find sales near you"} <i className="ms ms-arrow-forward" aria-hidden="true" /></Link></div></section>
        </div>

        <section className="index2-community" aria-labelledby="index2-community-title">
          <header className="index2-section-heading"><div><h2 id="index2-community-title">{isKorean ? "우리 동네 이야기" : "Around your community"}</h2><p>{isKorean ? "궁금한 점을 묻고, 이웃의 이야기를 만나세요." : "Real conversations. Real neighbours."}</p></div><Link href="/community">{isKorean ? "전체 보기" : "See all"} <i className="ms ms-arrow-forward" aria-hidden="true" /></Link></header>
          <div className="index2-community-rail">{posts.slice(0, 3).map((post) => <Link className="index2-community-card ui-card" href={`/community/${post.id}`} key={post.id}><i className="ms ms-forum" aria-hidden="true" /><div><strong>{post.title}</strong><p>{post.excerpt.replace(/<[^>]+>/g, " ").slice(0, 94)}</p><small>{post.location} · {post.responseCount ?? 0}{isKorean ? "개 답글" : " replies"}</small></div><i className="ms ms-chevron-right" aria-hidden="true" /></Link>)}</div>
        </section>
      </PageContainer>
    </main>
    <Footer />
  </>;
}

function Index2EmptyState() {
  return <div className="index2-empty ui-card"><i className="ms ms-storefront" aria-hidden="true" /><div><strong>새 상품을 준비하고 있어요.</strong><p>마켓에서 우리 동네 상품을 둘러보세요.</p></div><Link href="/market">마켓 보기 <i className="ms ms-arrow-forward" aria-hidden="true" /></Link></div>;
}
