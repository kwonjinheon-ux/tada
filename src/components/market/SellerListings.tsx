"use client";

import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { useLanguage } from "@/components/LanguageProvider";
import { Avatar } from "@/components/ui/Avatar";
import type { Listing } from "@/data/listings";

type SellerListingsProps = {
  seller: { id: string; name: string; avatarUrl: string | null };
  listings: Listing[];
  savedListingIds?: string[];
  isOwner: boolean;
};

/** A member's other listings: the same header as the community member page, then
 *  the cards the feed uses. */
export function SellerListings({ seller, listings, savedListingIds = [], isOwner }: SellerListingsProps) {
  const { locale } = useLanguage();
  const ko = locale === "ko";
  const savedIds = new Set(savedListingIds);
  const title = isOwner ? (ko ? "내 다른 매물" : "My other listings") : (ko ? `${seller.name}님의 다른 매물` : `${seller.name}'s other listings`);

  return <main className="community-member-posts seller-listings page-container">
    <div className="community-member-posts-header">
      <Link className="community-member-posts-back" href={`/market/sellers/${seller.id}`}><i className="ms ms-arrow-back" aria-hidden="true" />{ko ? "판매자 프로필" : "Seller profile"}</Link>
      <span className="community-member-posts-author"><Avatar src={seller.avatarUrl} name={seller.name} className="community-member-posts-avatar" /><strong>{seller.name}</strong></span>
      <h1>{title}</h1>
    </div>
    {listings.length
      ? <div className="product-grid related-listings-grid">
        {listings.map((listing, index) => <ProductCard key={listing.id} listing={listing} priority={index < 2} initialIsSaved={savedIds.has(listing.id)} />)}
      </div>
      : <section className="community-member-posts-empty" role="status"><i className="ms ms-storefront" aria-hidden="true" /><strong>{ko ? "판매 중인 다른 매물이 없어요" : "No other listings right now"}</strong><span>{ko ? "새 매물이 올라오면 여기에 보여요." : "New listings will appear here."}</span></section>}
  </main>;
}
