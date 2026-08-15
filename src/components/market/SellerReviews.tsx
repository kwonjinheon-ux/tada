import { Avatar } from "@/components/ui/Avatar";

export type SellerReview = {
  id: string;
  score: number;
  comment: string | null;
  createdAt: string;
  reviewer: { name: string; avatarUrl: string | null };
};

function RatingStars({ score }: { score: number }) {
  return <span className="seller-review-stars" aria-label={`${score.toFixed(1)} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((star) => <i key={star} className={score >= star ? "fa-solid fa-star" : score >= star - 0.5 ? "fa-solid fa-star-half-stroke" : "fa-regular fa-star"} aria-hidden="true" />)}
  </span>;
}

export function SellerReviews({ reviews }: { reviews: SellerReview[] }) {
  if (!reviews.length) return <p className="seller-reviews-empty">No verified reviews yet.</p>;
  return <section className="seller-reviews" aria-labelledby="seller-reviews-title">
    <header><h2 id="seller-reviews-title">Verified buyer reviews</h2><span>{reviews.length}</span></header>
    <div className="seller-review-list">
      {reviews.map((review) => <article className="seller-review" key={review.id}>
        <Avatar src={review.reviewer.avatarUrl} name={review.reviewer.name} alt="" />
        <div>
          <header><strong>{review.reviewer.name}</strong><span><RatingStars score={review.score} /><b>{review.score.toFixed(1)}</b></span></header>
          {review.comment ? <p>{review.comment}</p> : null}
          <time dateTime={review.createdAt}>{new Intl.DateTimeFormat("en-NZ", { day: "numeric", month: "short", year: "numeric" }).format(new Date(review.createdAt))}</time>
        </div>
      </article>)}
    </div>
  </section>;
}
