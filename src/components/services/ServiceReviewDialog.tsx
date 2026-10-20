"use client";

import { useState } from "react";
import { DialogOverlay } from "@/components/ui/DialogOverlay";
import { ServiceRatingStars } from "@/components/services/ServiceRatingStars";

export type SubmittedServiceReview = { id: string; reviewerId: string; rating: number; comment: string; createdAt: string };

const COMMENT_LIMIT = 1000;

/** What each star means, so the number is not the only thing being chosen. */
const ratingWords = {
  en: ["Poor", "Fair", "Good", "Great", "Excellent"],
  ko: ["별로예요", "그저 그래요", "괜찮아요", "좋아요", "아주 좋아요"],
};

/**
 * Writing a review: a sheet from the bottom on a phone, a card in the middle
 * on a desktop.
 *
 * It used to be pushed into the page as a grey panel below the ratings, which
 * on a phone meant scrolling past the summary to reach a form that then ran
 * off the screen. A review is one short task with an obvious end, so it takes
 * the surface that suits that — the shared dialog, which dims and blurs the
 * page behind it and closes on a tap outside, as every other popup here does.
 */
export function ServiceReviewDialog({ serviceId, providerName, isKorean, onClose, onSubmitted }: {
  serviceId: string; providerName: string; isKorean: boolean; onClose: () => void; onSubmitted: (review: SubmittedServiceReview) => void;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const say = (en: string, ko: string) => (isKorean ? ko : en);

  const submit = async () => {
    if (!comment.trim()) { setError(say("Please write a short review.", "후기를 입력해 주세요.")); return; }
    setIsSubmitting(true); setError("");
    try {
      const response = await fetch("/api/services/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ serviceId, rating, comment }) });
      const result = await response.json().catch(() => null) as { error?: string; review?: { id: string; reviewer_id: string; rating: number; comment: string; created_at: string } } | null;
      if (!response.ok || !result?.review) { setError(result?.error ?? say("Unable to save your review.", "후기를 저장할 수 없습니다.")); return; }
      onSubmitted({ id: result.review.id, reviewerId: result.review.reviewer_id, rating: result.review.rating, comment: result.review.comment, createdAt: result.review.created_at });
    } catch { setError(say("Unable to save your review.", "후기를 저장할 수 없습니다.")); }
    finally { setIsSubmitting(false); }
  };

  return (
    <DialogOverlay className="service-review-backdrop" aria-labelledby="service-review-title" onClose={onClose} isDismissible={!isSubmitting}>
      <section className="service-review-dialog">
        <header>
          <div>
            <p>{say("Service review", "서비스 후기")}</p>
            <h2 id="service-review-title">{say(`Rate ${providerName}`, `${providerName} 평가하기`)}</h2>
          </div>
          <button className="service-review-close" type="button" onClick={onClose} disabled={isSubmitting} aria-label={say("Close review form", "후기 작성 닫기")}>
            <i className="ms ms-close" aria-hidden="true" />
          </button>
        </header>

        <fieldset className="service-review-rating">
          <legend>{say("Rating", "별점")}</legend>
          <ServiceRatingStars rating={rating} label={say(`${rating} out of 5 stars`, `별점 ${rating}점`)} onChange={setRating} />
          <output className="service-review-rating-value" aria-live="polite">
            <strong>{rating}</strong> / 5 <span>{ratingWords[isKorean ? "ko" : "en"][rating - 1]}</span>
          </output>
        </fieldset>

        <label className="service-review-comment">
          <span>{say("Review", "후기")}</span>
          <textarea
            value={comment}
            maxLength={COMMENT_LIMIT}
            rows={4}
            placeholder={say("Tell others about your experience.", "서비스 이용 경험을 알려주세요.")}
            onChange={(event) => setComment(event.target.value)}
          />
          <small aria-hidden="true">{comment.length} / {COMMENT_LIMIT}</small>
        </label>

        {error ? <p className="service-review-error" role="alert">{error}</p> : null}

        <footer>
          <p className="service-review-dismiss-hint">
            {isSubmitting ? say("Saving your review…", "후기를 저장하고 있습니다…") : say("Tap outside this popup to close it.", "팝업 바깥을 누르면 닫힙니다.")}
          </p>
          <div className="service-review-actions">
            <button type="button" onClick={onClose} disabled={isSubmitting}>{say("Cancel", "취소")}</button>
            <button type="button" onClick={() => void submit()} disabled={isSubmitting}>
              {isSubmitting ? say("Posting…", "등록 중…") : say("Post review", "후기 등록")}
            </button>
          </div>
        </footer>
      </section>
    </DialogOverlay>
  );
}
