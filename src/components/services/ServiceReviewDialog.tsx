"use client";

import { useState } from "react";
import { DialogOverlay } from "@/components/ui/DialogOverlay";

export function ServiceReviewDialog({ serviceId, providerName, isKorean, onClose, onSubmitted }: {
  serviceId: string; providerName: string; isKorean: boolean; onClose: () => void; onSubmitted: (review: { rating: number; comment: string }) => void;
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
      const result = await response.json().catch(() => null) as { error?: string; review?: { rating: number; comment: string } } | null;
      if (!response.ok || !result?.review) { setError(result?.error ?? (isKorean ? "후기를 저장할 수 없습니다." : "Unable to save your review.")); return; }
      onSubmitted(result.review);
    } catch { setError(isKorean ? "후기를 저장할 수 없습니다." : "Unable to save your review."); }
    finally { setIsSubmitting(false); }
  };

  return <DialogOverlay className="service-review-backdrop" aria-labelledby="service-review-title" onClose={onClose} isDismissible={!isSubmitting}>
    <section className="service-review-dialog">
      <header><i className="ms ms-star" aria-hidden="true" /><div><p>{isKorean ? "서비스 후기" : "Service review"}</p><h2 id="service-review-title">{isKorean ? `${providerName} 평가하기` : `Rate ${providerName}`}</h2></div></header>
      <fieldset><legend>{isKorean ? "별점" : "Rating"}</legend><div className="service-review-stars">{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" className={value <= rating ? "is-selected" : ""} aria-label={`${value} stars`} onClick={() => setRating(value)}><i className="ms ms-star" aria-hidden="true" /></button>)}</div></fieldset>
      <label><span>{isKorean ? "후기" : "Review"}</span><textarea value={comment} maxLength={1000} rows={4} placeholder={isKorean ? "서비스 이용 경험을 알려주세요." : "Tell others about your experience."} onChange={(event) => setComment(event.target.value)} /></label>
      {error ? <p className="service-review-error" role="alert">{error}</p> : null}
      <footer><button type="button" onClick={onClose} disabled={isSubmitting}>{isKorean ? "취소" : "Cancel"}</button><button type="button" onClick={() => void submit()} disabled={isSubmitting}>{isSubmitting ? (isKorean ? "등록 중…" : "Posting…") : (isKorean ? "후기 등록" : "Post review")}</button></footer>
    </section>
  </DialogOverlay>;
}
