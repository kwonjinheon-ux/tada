"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { marketShopTypes, type ShopType } from "@/components/market/MarketFilterSidebar";

const shopTypePresentation: Record<Exclude<ShopType, "all">, { icon: string; tone: string }> = {
  secondhand: { icon: "fa-arrows-rotate", tone: "is-trade" },
  "garage-sale": { icon: "fa-warehouse", tone: "is-garage" },
  "moving-sale": { icon: "fa-truck", tone: "is-moving" },
  "2dollarshop": { icon: "fa-tags", tone: "is-dollar" },
  groupbuy: { icon: "fa-people-group", tone: "is-group" },
};

export function MarketShopTypeRail({ activeShopType, onShopTypeSelect }: { activeShopType: ShopType; onShopTypeSelect: (shopType: ShopType) => void }) {
  const { t } = useLanguage();

  return (
    <section className="market-mobile-shop-type-section" aria-label={t("marketType")}>
      <div className="market-mobile-shop-type-rail" role="tablist" aria-label={t("marketType")}>
        {marketShopTypes.filter(({ value }) => value !== "all").map(({ labelKey, value }) => {
          const presentation = shopTypePresentation[value as Exclude<ShopType, "all">];
          const isActive = activeShopType === value;

          return (
            <button key={value} className={`market-mobile-shop-type ${presentation.tone} ${isActive ? "is-active" : ""}`} type="button" role="tab" aria-selected={isActive} onClick={() => onShopTypeSelect(value)}>
              <span className="market-mobile-shop-type-icon"><i className={`fa-solid ${presentation.icon}`} aria-hidden="true" /></span>
              <strong>{t(labelKey)}</strong>
            </button>
          );
        })}
      </div>
    </section>
  );
}
