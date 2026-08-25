"use client";

import Image from "next/image";

export type MobileBrowseCategoryRailItem = {
  value: string;
  label: string;
  image?: string;
  icon?: string;
  tone?: string;
};

type MobileBrowseCategoryRailProps = {
  ariaLabel: string;
  items: MobileBrowseCategoryRailItem[];
  activeValue: string;
  onSelect: (value: string) => void;
  className?: string;
};

/** A shared, swipeable mobile category rail for browse surfaces. */
export function MobileBrowseCategoryRail({ ariaLabel, items, activeValue, onSelect, className = "" }: MobileBrowseCategoryRailProps) {
  return (
    <section className={`mobile-browse-category-section ${className}`.trim()} aria-label={ariaLabel}>
      <div className="mobile-browse-category-rail" role="tablist" aria-label={ariaLabel}>
        {items.map(({ value, label, image, icon, tone = "" }) => {
          const isActive = activeValue === value;

          return (
            <button key={value} className={`mobile-browse-category ${tone} ${isActive ? "is-active" : ""}`} type="button" role="tab" aria-selected={isActive} onClick={() => onSelect(value)}>
              <span className="mobile-browse-category-icon">
                {image ? <Image src={image} alt="" width={53} height={53} sizes="53px" /> : <i className={`ms ${icon ?? "ms-sell"}`} aria-hidden="true" />}
              </span>
              <strong>{label}</strong>
            </button>
          );
        })}
      </div>
    </section>
  );
}
