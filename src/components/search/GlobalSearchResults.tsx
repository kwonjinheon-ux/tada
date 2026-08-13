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
const SEARCH_PAGE_SIZE = 20;

export function GlobalSearchResults({ query }: { query: string }) {
  const { t } = useLanguage();
  const [results, setResults] = useState<SearchState>(emptyState);
  const [isLoading, setIsLoading] = useState(Boolean(query));
  const [page, setPage] = useState(1);

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
      fetch(`/api/market/listings?shopType=all&limit=100&q=${encodedQuery}`, { signal: controller.signal }).then((response) => readApiResponse(response, marketFeedResponseSchema)),
      fetch(`/api/community/posts?q=${encodedQuery}`, { signal: controller.signal }).then((response) => readApiResponse(response, communityPostFeedResponseSchema)),
    ]).then(([marketResult, communityResult]) => {
      if (controller.signal.aborted) return;
      setResults({
        listings: marketResult.data?.listings ?? [],
        savedListingIds: marketResult.data?.savedListingIds ?? [],
        posts: communityResult.data?.posts ?? [],
      });
      setPage(1);
    }).catch((error: unknown) => {
      if ((error as { name?: string }).name !== "AbortError") setResults(emptyState);
    }).finally(() => {
      if (!controller.signal.aborted) setIsLoading(false);
    });

    return () => controller.abort();
  }, [encodedQuery, query]);

  const pagedResults = useMemo(() => {
    const all = [
      ...results.listings.map((listing) => ({ kind: "market" as const, item: listing })),
      ...results.posts.map((post) => ({ kind: "community" as const, item: post })),
    ];
    const totalPages = Math.max(1, Math.ceil(all.length / SEARCH_PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const items = all.slice((currentPage - 1) * SEARCH_PAGE_SIZE, currentPage * SEARCH_PAGE_SIZE);
    return {
      currentPage,
      totalPages,
      listings: items.filter((item) => item.kind === "market").map((item) => item.item),
      posts: items.filter((item) => item.kind === "community").map((item) => item.item),
    };
  }, [page, results]);

  const pageNumbers = useMemo(() => Array.from({ length: pagedResults.totalPages }, (_, index) => index + 1), [pagedResults.totalPages]);

  if (!query) {
    return <div className="global-search-empty" role="status"><i className="fa-solid fa-magnifying-glass" aria-hidden="true" /><strong>{t("search")}</strong><span>{t("tryDifferentSearch")}</span></div>;
  }

  return (
    <div className="global-search-results" aria-busy={isLoading}>
      <h1>{t("search")}: “{query}”</h1>
      {isLoading ? <div className="global-search-loading" role="status"><i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />{t("loadingMoreListings")}</div> : null}
      {pagedResults.listings.length ? <section className="global-search-section" aria-labelledby="market-search-results">
        <div className="global-search-section-heading"><i className="fa-solid fa-store" aria-hidden="true" /><h2 id="market-search-results">{t("market")}</h2><span>{results.listings.length}</span></div>
        <div className="product-grid is-list-view global-search-market-list">{pagedResults.listings.map((listing, index) => <ProductCard key={listing.id} listing={listing} priority={index === 0} initialIsSaved={results.savedListingIds.includes(listing.id)} />)}</div>
      </section> : null}
      {pagedResults.posts.length ? <section className="global-search-section" aria-labelledby="community-search-results">
        <div className="global-search-section-heading"><i className="fa-solid fa-users" aria-hidden="true" /><h2 id="community-search-results">{t("community")}</h2><span>{results.posts.length}</span></div>
        <div className="community-post-list global-search-community-list">{pagedResults.posts.map((post) => <CommunityPostCard key={post.id} post={post} showTypeBadge={false} />)}</div>
      </section> : null}
      {!isLoading && !results.listings.length && !results.posts.length ? <p className="global-search-no-results">{t("noMatchingListings")}</p> : null}
      {pagedResults.totalPages > 1 ? <nav className="global-search-pagination" aria-label={t("search")}>
        {pageNumbers.map((pageNumber) => <button key={pageNumber} type="button" className={pageNumber === pagedResults.currentPage ? "is-active" : undefined} aria-current={pageNumber === pagedResults.currentPage ? "page" : undefined} onClick={() => setPage(pageNumber)}>{pageNumber}</button>)}
      </nav> : null}
    </div>
  );
}
