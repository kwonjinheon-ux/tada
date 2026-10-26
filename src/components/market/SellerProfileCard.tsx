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
export function SellerProfileCard({ seller, restrictedTo, loginHref }: { seller: SellerProfileSummary; restrictedTo?: "members" | "interested_users" | "trade_partners" | "private"; loginHref?: string }) {
  const { t, locale } = useLanguage();
  const ko = locale === "ko";

  return (
    <>
      <Link className="listing-detail-back" href="/market">
        <i className="ms ms-arrow-back" aria-hidden="true" />
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
        {restrictedTo ? <div className="seller-profile-access-notice" role="status"><i className="ms ms-lock" aria-hidden="true" /><div><strong>{restrictedTo === "members" ? (ko ? "타다 회원에게 공개된 프로필이에요" : "This profile is for Tada members") : restrictedTo === "interested_users" ? (ko ? "관심을 표시한 사용자에게 공개된 프로필이에요" : "This profile is for interested users") : restrictedTo === "trade_partners" ? (ko ? "거래 중인 이웃에게 공개된 프로필이에요" : "This profile is for neighbours in an active trade") : (ko ? "비공개 프로필이에요" : "This profile is private")}</strong><p>{ko ? "상품에 표시되는 판매자 정보는 계속 확인할 수 있어요." : "Seller details on listings remain available."}</p>{loginHref ? <Link className="ui-button ui-button--secondary ui-button--sm" href={loginHref}>{ko ? "로그인하기" : "Sign in"}</Link> : null}</div></div> : <dl className="seller-profile-stats">
          <div>
            <dt>{t("sellerRatingLabel")}</dt>
            <dd>{seller.ratingCount ? <><i className="ms ms-star" aria-hidden="true" />{seller.ratingAverage.toFixed(1)}</> : <span className="seller-profile-stat-empty">{t("sellerNoRatings")}</span>}</dd>
          </div>
          <div>
            <dt>{t("sellerReviewsLabel")}</dt>
            <dd>{seller.ratingCount}</dd>
          </div>
          <div>
            <dt>{t("sellerListingsLabel")}</dt>
            <dd>{seller.listingCount}</dd>
          </div>
        </dl>}
      </section>
    </>
  );
}
