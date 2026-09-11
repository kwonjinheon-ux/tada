"use client";

import { useState } from "react";
import { DialogOverlay } from "@/components/ui/DialogOverlay";
import { ServiceRatingStars } from "@/components/services/ServiceRatingStars";

export type SubmittedServiceReview = { id: string; reviewerId: string; rating: number; comment: string; createdAt: string };

export function ServiceReviewDialog({ serviceId, providerName, isKorean, onClose, onSubmitted, inline = false }: {
  serviceId: string; providerName: string; isKorean: boolean; onClose: () => void; onSubmitted: (review: SubmittedServiceReview) => void; inline?: boolean;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    if (!comment.trim()) { setError(isKorean ? "후기를 입력해 주세요." : "Please write a short review."); return; }
    setIsSubmitting(true); setError("");
    try {
      const response = await fetch("/api/services/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ serviceId, rating, comment }) });
      const result = await response.json().catch(() => null) as { error?: string; review?: { id: string; reviewer_id: string; rating: number; comment: string; created_at: string } } | null;
      if (!response.ok || !result?.review) { setError(result?.error ?? (isKorean ? "후기를 저장할 수 없습니다." : "Unable to save your review.")); return; }
      onSubmitted({ id: result.review.id, reviewerId: result.review.reviewer_id, rating: result.review.rating, comment: result.review.comment, createdAt: result.review.created_at });
    } catch { setError(isKorean ? "후기를 저장할 수 없습니다." : "Unable to save your review."); }
    finally { setIsSubmitting(false); }
  };

  const content = <section className={`service-review-dialog${inline ? " service-review-inline" : ""}`}>
      <header><i className="ms ms-star" aria-hidden="true" /><div><p>{isKorean ? "서비스 후기" : "Service review"}</p><h2 id="service-review-title">{isKorean ? `${providerName} 평가하기` : `Rate ${providerName}`}</h2></div>{inline ? <button className="service-review-inline-close" type="button" onClick={onClose} disabled={isSubmitting} aria-label={isKorean ? "후기 작성 닫기" : "Close review form"}><i className="ms ms-close" aria-hidden="true" /></button> : null}</header>
      <fieldset><legend>{isKorean ? "별점" : "Rating"}</legend><ServiceRatingStars rating={rating} label={isKorean ? `별점 ${rating}점` : `${rating} out of 5 stars`} onChange={setRating} /><output className="service-review-rating-value" aria-live="polite">{rating} / 5</output></fieldset>
      <label><span>{isKorean ? "후기" : "Review"}</span><textarea value={comment} maxLength={1000} rows={4} placeholder={isKorean ? "서비스 이용 경험을 알려주세요." : "Tell others about your experience."} onChange={(event) => setComment(event.target.value)} /></label>
      {error ? <p className="service-review-error" role="alert">{error}</p> : null}
      <footer><button type="button" onClick={onClose} disabled={isSubmitting}>{isKorean ? "취소" : "Cancel"}</button><button type="button" onClick={() => void submit()} disabled={isSubmitting}>{isSubmitting ? (isKorean ? "등록 중…" : "Posting…") : (isKorean ? "후기 등록" : "Post review")}</button></footer>
    </section>;

  return inline ? content : <DialogOverlay className="service-review-backdrop" aria-labelledby="service-review-title" onClose={onClose} isDismissible={!isSubmitting}>{content}</DialogOverlay>;
}
