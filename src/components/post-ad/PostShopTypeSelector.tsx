"use client";

import { postShopTypeOptions, type ShopTypeValue } from "@/data/postShopTypes";

/** The shop type a seller is posting into.
 *
 *  Group Buy has its own form on its own route, so this is shared rather than
 *  living inside the market form: from either side the row looks and behaves
 *  the same, and picking a type is what moves you between the two. */
export function PostShopTypeSelector({ activeShopType, onSelect, label = "Shop Type" }: { activeShopType: ShopTypeValue; onSelect: (value: ShopTypeValue) => void; label?: string }) {
  return (
    <div className="post-shop-type-field">
      <span className="post-shop-type-label">{label}</span>
      <div className="post-shop-type-options" role="group" aria-label={label}>
        {postShopTypeOptions.map(({ value, label: optionLabel, icon }) => (
          <button
            key={value}
            type="button"
            className={`post-shop-type-${value} ${activeShopType === value ? "is-selected" : ""}`}
            aria-pressed={activeShopType === value}
            onClick={() => onSelect(value)}
          >
            <i className={`ms ${icon}`} aria-hidden="true" />
            <span>{optionLabel}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
