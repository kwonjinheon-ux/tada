"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { DialogOverlay } from "@/components/ui/DialogOverlay";
import { marketTradeReviewResponseSchema } from "@/contracts/api";
import { readApiResponse } from "@/lib/api/client";

type TradeReviewDialogProps = {
  offerId: string;
  sellerName: string;
  onClose: () => void;
  onSubmitted: () => void;
};

const RATING_OPTIONS = Array.from({ length: 10 }, (_, index) => (index + 1) / 2);

export function TradeReviewDialog({ offerId, sellerName, onClose, onSubmitted }: TradeReviewDialogProps) {
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (isSubmitting) return;
    if (!comment.trim()) {
      setError("Please write a short review.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/market/trade-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offerId, score, comment }),
      });
      const result = await readApiResponse(response, marketTradeReviewResponseSchema);
      if (result.error) {
        setError(result.error.message);
        return;
      }
      onSubmitted();
    } catch {
      setError("Unable to reach reviews right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogOverlay className="trade-review-backdrop" aria-labelledby="trade-review-title" onClose={onClose} isDismissible={!isSubmitting}>
      <section className="trade-review-dialog">
        <div className="trade-review-dialog-heading">
          <i className="fa-solid fa-star" aria-hidden="true" />
          <div><p>Trade complete</p><h2 id="trade-review-title">Rate {sellerName}</h2></div>
        </div>
        <p>Share your experience with this verified seller. Your review appears on their public profile.</p>
        <fieldset>
          <legend>Seller rating</legend>
          <div className="trade-review-stars" role="radiogroup" aria-label="Seller rating">
            {RATING_OPTIONS.map((option) => <label key={option} className={score === option ? "is-selected" : ""}>
              <input type="radio" name="trade-rating" value={option} checked={score === option} onChange={() => setScore(option)} />
              <span aria-hidden="true"><i className={`fa-${option % 1 ? "regular" : "solid"} fa-star`} /></span>
              <b>{option}</b>
            </label>)}
          </div>
        </fieldset>
        <label className="trade-review-comment"><span>Review</span><textarea value={comment} maxLength={1000} rows={4} placeholder="How did the trade go?" onChange={(event) => setComment(event.target.value)} /></label>
        {error ? <p className="trade-review-error" role="alert">{error}</p> : null}
        <footer><Button variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancel</Button><Button onClick={() => void submit()} disabled={isSubmitting}>{isSubmitting ? "Posting..." : "Post review"}</Button></footer>
      </section>
    </DialogOverlay>
  );
}
