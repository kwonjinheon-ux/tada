"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { useLanguage } from "@/components/LanguageProvider";

export type SellerProfileSummary = {
  name: string;
  avatarUrl: string | null;
  ratingAverage: number;
  ratingCount: number;
  listingCount: number;
};

/**
 * Value-over-label stats keep the summary readable in every locale: a sentence
 * like "5.0 rating (1)" only reads correctly with English word order.
 */
export function SellerProfileCard({ seller }: { seller: SellerProfileSummary }) {
  const { t } = useLanguage();

  return (
    <>
      <Link className="listing-detail-back" href="/market">
        <i className="fa-solid fa-arrow-left" aria-hidden="true" />
        {t("bargainBackToListings")}
      </Link>
      <section className="seller-public-profile-card" aria-labelledby="seller-profile-name">
        <div className="seller-public-profile-identity">
          <Avatar src={seller.avatarUrl} name={seller.name} alt="" className="seller-public-profile-avatar" />
          <div>
            <p>{t("sellerProfileEyebrow")}</p>
            <h1 id="seller-profile-name">{seller.name}</h1>
          </div>
        </div>
        <dl className="seller-profile-stats">
          <div>
            <dt>{t("sellerRatingLabel")}</dt>
            <dd>{seller.ratingCount ? <><i className="fa-solid fa-star" aria-hidden="true" />{seller.ratingAverage.toFixed(1)}</> : <span className="seller-profile-stat-empty">{t("sellerNoRatings")}</span>}</dd>
          </div>
          <div>
            <dt>{t("sellerReviewsLabel")}</dt>
            <dd>{seller.ratingCount}</dd>
          </div>
          <div>
            <dt>{t("sellerListingsLabel")}</dt>
            <dd>{seller.listingCount}</dd>
          </div>
        </dl>
      </section>
    </>
  );
}
