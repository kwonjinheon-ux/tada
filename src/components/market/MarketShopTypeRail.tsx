"use client";

import Image from "next/image";
import { useLanguage } from "@/components/LanguageProvider";
import { marketShopTypes, type ShopType } from "@/components/market/MarketFilterSidebar";

const shopTypePresentation: Record<Exclude<ShopType, "all">, { image: string; tone: string }> = {
  secondhand: { image: "/images/market/shop-types/secondhand-exchange.png", tone: "is-trade" },
  "garage-sale": { image: "/images/market/shop-types/garage-sale.png", tone: "is-garage" },
  "moving-sale": { image: "/images/market/shop-types/moving-sale.png", tone: "is-moving" },
  "2dollarshop": { image: "/images/market/shop-types/dollar-shop.png", tone: "is-dollar" },
  groupbuy: { image: "/images/market/shop-types/group-buy.png", tone: "is-group" },
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
              <span className="market-mobile-shop-type-icon"><Image src={presentation.image} alt="" width={56} height={56} sizes="56px" /></span>
              <strong>{t(labelKey)}</strong>
            </button>
          );
        })}
      </div>
    </section>
  );
}
