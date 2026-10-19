"use client";

import { postShopTypeOptions, type ShopTypeValue } from "@/data/postShopTypes";
import { useLanguage } from "@/components/LanguageProvider";
import { getMarketOptionLabel } from "@/lib/market/category-label";

/** The shop type a seller is posting into.
 *
 *  Group Buy has its own form on its own route, so this is shared rather than
 *  living inside the market form: from either side the row looks and behaves
 *  the same, and picking a type is what moves you between the two. */
export function PostShopTypeSelector({ activeShopType, onSelect, label }: { activeShopType: ShopTypeValue; onSelect: (value: ShopTypeValue) => void; label?: string }) {
  const { locale } = useLanguage();
  const fieldLabel = label ?? (locale === "ko" ? "판매 유형" : "Shop Type");
  return (
    <div className="post-shop-type-field">
      <span className="post-shop-type-label">{fieldLabel}</span>
      <div className="post-shop-type-options" role="group" aria-label={fieldLabel}>
        {postShopTypeOptions.map(({ value, label: optionLabel, icon }) => (
          <button
            key={value}
            type="button"
            className={`post-shop-type-${value} ${activeShopType === value ? "is-selected" : ""}`}
            aria-pressed={activeShopType === value}
            onClick={() => onSelect(value)}
          >
            <i className={`ms ${icon}`} aria-hidden="true" />
            <span>{getMarketOptionLabel(optionLabel, locale)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
