type ServiceRatingStarsProps = {
  rating: number;
  label: string;
  onChange?: (rating: number) => void;
};

const stars = [1, 2, 3, 4, 5] as const;

export function ServiceRatingStars({ rating, label, onChange }: ServiceRatingStarsProps) {
  if (onChange) {
    const selectWithKeyboard = (key: string) => {
      if (key === "ArrowLeft" || key === "ArrowDown") onChange(Math.max(1, rating - 1));
      if (key === "ArrowRight" || key === "ArrowUp") onChange(Math.min(5, rating + 1));
      if (key === "Home") onChange(1);
      if (key === "End") onChange(5);
    };

    return <div className="service-review-stars" role="radiogroup" aria-label={label}>
      {stars.map((value) => <button
        key={value}
        type="button"
        role="radio"
        aria-checked={value === rating}
        aria-label={`${value} / 5`}
        tabIndex={value === rating ? 0 : -1}
        className={value <= rating ? "is-selected" : undefined}
        onClick={() => onChange(value)}
        onKeyDown={(event) => {
          if (["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
            event.preventDefault();
            selectWithKeyboard(event.key);
          }
        }}
      ><i className={`ms ms-star${value <= rating ? "" : " ms--outline"}`} aria-hidden="true" /></button>)}
    </div>;
  }

  return <span className="service-profile-review-stars" aria-label={label}>
    {stars.map((value) => {
      const icon = rating >= value ? "ms-star" : rating >= value - 0.5 ? "ms-star-half" : "ms-star ms--outline";
      return <i key={value} className={`ms ${icon}`} aria-hidden="true" />;
    })}
  </span>;
}
