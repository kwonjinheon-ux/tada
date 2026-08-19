"use client";

import Link from "next/link";
import { Fragment } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { useLanguage, type TranslationKey } from "@/components/LanguageProvider";
import { sellerReviewSorts, type SellerReview, type SellerReviewSort } from "@/lib/market/seller-reviews";

const sortLabelKeys: Record<SellerReviewSort, TranslationKey> = {
  newest: "newest",
  highest: "sellerSortHighest",
  lowest: "sellerSortLowest",
};

function RatingStars({ score }: { score: number }) {
  return <span className="seller-review-stars" aria-label={`${score.toFixed(1)} / 5`}>
    {[1, 2, 3, 4, 5].map((star) => <i key={star} className={score >= star ? "fa-solid fa-star" : score >= star - 0.5 ? "fa-solid fa-star-half-stroke" : "fa-regular fa-star"} aria-hidden="true" />)}
  </span>;
}

/**
 * Keeps the strip short on a phone: the first, last, and current pages plus one
 * neighbour on either side, with gaps standing in for the rest.
 */
function pageWindow(current: number, pageCount: number) {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1);
  const pages = [1, pageCount, current, current - 1, current + 1].filter((page) => page >= 1 && page <= pageCount);
  return [...new Set(pages)].sort((first, second) => first - second);
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

  const pages = pageWindow(page, pageCount);

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

    {pageCount > 1 ? <nav className="seller-review-pagination" aria-label={t("sellerPaginationLabel")}>
      {page > 1 ? <Link href={hrefFor(sort, page - 1)} aria-label={t("sellerPreviousPage")} scroll={false}><i className="fa-solid fa-chevron-left" aria-hidden="true" /></Link> : null}
      {pages.map((entry, index) => <Fragment key={entry}>
        {index > 0 && entry - pages[index - 1] > 1 ? <span className="seller-review-pagination-gap" aria-hidden="true">…</span> : null}
        {entry === page
          ? <span className="is-selected" aria-current="page">{entry}</span>
          : <Link href={hrefFor(sort, entry)} scroll={false}>{entry}</Link>}
      </Fragment>)}
      {page < pageCount ? <Link href={hrefFor(sort, page + 1)} aria-label={t("sellerNextPage")} scroll={false}><i className="fa-solid fa-chevron-right" aria-hidden="true" /></Link> : null}
    </nav> : null}
  </section>;
}
