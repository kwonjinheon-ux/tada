"use client";

import { useEffect, useMemo, useState } from "react";
import { ProductCard } from "@/components/ProductCard";
import { CommunityPostCard } from "@/components/community/CommunityPostCard";
import { useLanguage } from "@/components/LanguageProvider";
import { communityPostFeedResponseSchema, marketFeedResponseSchema } from "@/contracts/api";
import type { CommunityPost } from "@/data/community-posts";
import type { Listing } from "@/data/listings";
import { readApiResponse } from "@/lib/api/client";

type SearchState = {
  listings: Listing[];
  savedListingIds: string[];
  posts: CommunityPost[];
};

const emptyState: SearchState = { listings: [], savedListingIds: [], posts: [] };

export function GlobalSearchResults({ query }: { query: string }) {
  const { t } = useLanguage();
  const [results, setResults] = useState<SearchState>(emptyState);
  const [isLoading, setIsLoading] = useState(Boolean(query));

  const encodedQuery = useMemo(() => encodeURIComponent(query), [query]);

  useEffect(() => {
    const controller = new AbortController();
    if (!query) {
      setResults(emptyState);
      setIsLoading(false);
      return () => controller.abort();
    }

    setIsLoading(true);
    void Promise.all([
      fetch(`/api/market/listings?shopType=all&q=${encodedQuery}`, { signal: controller.signal }).then((response) => readApiResponse(response, marketFeedResponseSchema)),
      fetch(`/api/community/posts?q=${encodedQuery}`, { signal: controller.signal }).then((response) => readApiResponse(response, communityPostFeedResponseSchema)),
    ]).then(([marketResult, communityResult]) => {
      if (controller.signal.aborted) return;
      setResults({
        listings: marketResult.data?.listings ?? [],
        savedListingIds: marketResult.data?.savedListingIds ?? [],
        posts: communityResult.data?.posts ?? [],
      });
    }).catch((error: unknown) => {
      if ((error as { name?: string }).name !== "AbortError") setResults(emptyState);
    }).finally(() => {
      if (!controller.signal.aborted) setIsLoading(false);
    });

    return () => controller.abort();
  }, [encodedQuery, query]);

  if (!query) {
    return <div className="global-search-empty" role="status"><i className="fa-solid fa-magnifying-glass" aria-hidden="true" /><strong>{t("search")}</strong><span>{t("tryDifferentSearch")}</span></div>;
  }

  return (
    <div className="global-search-results" aria-busy={isLoading}>
      <h1>{t("search")}: “{query}”</h1>
      {isLoading ? <div className="global-search-loading" role="status"><i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />{t("loadingMoreListings")}</div> : null}
      <section className="global-search-section" aria-labelledby="market-search-results">
        <div className="global-search-section-heading"><i className="fa-solid fa-store" aria-hidden="true" /><h2 id="market-search-results">{t("market")}</h2><span>{results.listings.length}</span></div>
        {results.listings.length ? <div className="product-grid is-list-view global-search-market-list">{results.listings.map((listing, index) => <ProductCard key={listing.id} listing={listing} priority={index === 0} initialIsSaved={results.savedListingIds.includes(listing.id)} />)}</div> : <p className="global-search-no-results">{t("noMatchingListings")}</p>}
      </section>
      <section className="global-search-section" aria-labelledby="community-search-results">
        <div className="global-search-section-heading"><i className="fa-solid fa-users" aria-hidden="true" /><h2 id="community-search-results">{t("community")}</h2><span>{results.posts.length}</span></div>
        {results.posts.length ? <div className="community-post-list global-search-community-list">{results.posts.map((post) => <CommunityPostCard key={post.id} post={post} showTypeBadge={false} />)}</div> : <p className="global-search-no-results">{t("noMatchingListings")}</p>}
      </section>
    </div>
  );
}
