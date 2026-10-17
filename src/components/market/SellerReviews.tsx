"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { ListPagination } from "@/components/ui/ListPagination";
import { useLanguage, type TranslationKey } from "@/components/LanguageProvider";
import { sellerReviewSorts, type SellerReview, type SellerReviewSort } from "@/lib/market/seller-reviews";

const sortLabelKeys: Record<SellerReviewSort, TranslationKey> = {
  newest: "newest",
  highest: "sellerSortHighest",
  lowest: "sellerSortLowest",
};

function RatingStars({ score }: { score: number }) {
  return <span className="seller-review-stars" aria-label={`${score.toFixed(1)} / 5`}>
    {[1, 2, 3, 4, 5].map((star) => <i key={star} className={score >= star ? "ms ms-star" : score >= star - 0.5 ? "ms ms-star-half" : "ms ms-star"} aria-hidden="true" />)}
  </span>;
}

export function SellerReviews({ sellerId, reviews, total, page, pageCount, sort }: {
  sellerId: string;
  reviews: SellerReview[];
  total: number;
  page: number;
  pageCount: number;
  sort: SellerReviewSort;
}) {
  const { t, locale } = useLanguage();
  const formatDate = (value: string) => new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-NZ", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));

  const hrefFor = (nextSort: SellerReviewSort, nextPage: number) => {
    const params = new URLSearchParams();
    if (nextSort !== "newest") params.set("sort", nextSort);
    if (nextPage > 1) params.set("page", String(nextPage));
    const query = params.toString();
    return `/market/sellers/${sellerId}${query ? `?${query}` : ""}`;
  };

  if (!total) return <p className="seller-reviews-empty">{t("sellerNoReviews")}</p>;


  return <section className="seller-reviews" aria-labelledby="seller-reviews-title">
    <header>
      <h2 id="seller-reviews-title">{t("sellerVerifiedReviews")}</h2>
      <span>{new Intl.NumberFormat("en-NZ").format(total)}</span>
    </header>

    <nav className="seller-review-sort" aria-label={t("sellerSortLabel")}>
      {sellerReviewSorts.map((option) => <Link
        key={option}
        href={hrefFor(option, 1)}
        aria-current={option === sort ? "true" : undefined}
        className={option === sort ? "is-selected" : ""}
        scroll={false}
      >{t(sortLabelKeys[option])}</Link>)}
    </nav>

    <div className="seller-review-list">
      {reviews.map((review) => <article className="seller-review" key={review.id}>
        <Avatar src={review.reviewer.avatarUrl} name={review.reviewer.name} alt="" className="seller-review-avatar" />
        <div>
          <header><strong>{review.reviewer.name}</strong><time dateTime={review.createdAt}>{formatDate(review.createdAt)}</time></header>
          <span className="seller-review-rating"><RatingStars score={review.score} /><b>{review.score.toFixed(1)}</b></span>
          {review.comment ? <p>{review.comment}</p> : null}
        </div>
      </article>)}
    </div>

    <ListPagination page={page} totalPages={pageCount} label={t("sellerPaginationLabel")} scroll={false} />
  </section>;
}
