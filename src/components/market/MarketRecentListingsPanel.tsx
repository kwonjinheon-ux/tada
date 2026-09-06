"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AdSlot } from "@/components/advertising/AdSlot";
import { useLanguage } from "@/components/LanguageProvider";
import { marketFeedResponseSchema } from "@/contracts/api";
import { readApiResponse } from "@/lib/api/client";

type RecentListing = { id: string; title: string; price: string; location: string; image: string; imageAlt: string };

/**
 * Market's desktop right rail, the counterpart to Community's recent posts.
 * It also gives the market_sidebar ad placement the home it was defined for —
 * the placement existed in the admin and the types but was never rendered.
 */
export function MarketRecentListingsPanel({ shopType = "all" }: { shopType?: string }) {
  const { locale } = useLanguage();
  const [listings, setListings] = useState<RecentListing[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ sort: "newest" });
    if (shopType === "all") params.set("shopType", "all");

    void fetch(`/api/market/listings?${params}`, { signal: controller.signal })
      .then((response) => readApiResponse(response, marketFeedResponseSchema))
      .then((result) => { if (result.data) setListings(result.data.listings.slice(0, 6)); })
      .catch((error: unknown) => { if ((error as { name?: string }).name !== "AbortError") setListings([]); });

    return () => controller.abort();
  }, [shopType]);

  const heading = locale === "ko" ? "최근 등록" : "Recent listings";

  return (
    <aside className="market-side-rail" aria-label={heading}>
      <AdSlot placement="market_sidebar" />
      <div className="market-side-rail-heading"><h2>{heading}</h2></div>
      <div className="market-side-rail-list">
        {listings.map((listing) => (
          <Link className="market-side-rail-item" key={listing.id} href={`/market/${listing.id}`}>
            <span className="market-side-rail-thumb">
              <Image src={listing.image} alt={listing.imageAlt} fill sizes="56px" unoptimized />
            </span>
            <span className="market-side-rail-body">
              <strong>{listing.title}</strong>
              <b>{listing.price}</b>
              <small>{listing.location}</small>
            </span>
          </Link>
        ))}
      </div>
    </aside>
  );
}
