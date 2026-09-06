"use client";

import Image from "next/image";
import Link from "next/link";

export type MobileBrowseCategoryRailItem = {
  value: string;
  label: string;
  image?: string;
  icon?: string;
  tone?: string;
  /**
   * Destination for items that are really page navigation rather than an
   * in-page filter. Given one, the item renders as a link: the router
   * prefetches it on hover, and middle-click and open-in-new-tab work the way
   * they do on every other link in the app.
   */
  href?: string;
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
      <div className="mobile-browse-category-rail" aria-label={ariaLabel}>
        {items.map(({ value, label, image, icon, tone = "", href }) => {
          const isActive = activeValue === value;
          const itemClassName = `mobile-browse-category ${tone} ${isActive ? "is-active" : ""}`;
          const body = <>
            <span className="mobile-browse-category-icon">
              {image ? <Image src={image} alt="" width={53} height={53} sizes="53px" /> : <i className={`ms ${icon ?? "ms-sell"}`} aria-hidden="true" />}
            </span>
            <strong>{label}</strong>
          </>;

          // aria-current, not aria-selected: a list of links to other pages is
          // not a tablist, and the one we are on is the current page.
          if (href) return <Link key={value} className={itemClassName} href={href} aria-current={isActive ? "page" : undefined}>{body}</Link>;

          return <button key={value} className={itemClassName} type="button" aria-pressed={isActive} onClick={() => onSelect(value)}>{body}</button>;
        })}
      </div>
    </section>
  );
}
