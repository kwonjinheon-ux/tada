"use client";

import Link from "next/link";
import { useLanguage, type TranslationKey } from "@/components/LanguageProvider";
import type { ShopType } from "@/components/market/MarketFilterSidebar";

const marketBrowseCopy: Record<ShopType, { title: TranslationKey; description: TranslationKey }> = {
  all: { title: "marketIntroTitle", description: "marketIntroDescription" },
  secondhand: { title: "marketIntroSecondhandTitle", description: "marketIntroSecondhandDescription" },
  "garage-sale": { title: "marketIntroGarageSaleTitle", description: "marketIntroGarageSaleDescription" },
  "moving-sale": { title: "marketIntroMovingSaleTitle", description: "marketIntroMovingSaleDescription" },
  "2dollarshop": { title: "marketIntroTwoDollarShopTitle", description: "marketIntroTwoDollarShopDescription" },
  groupbuy: { title: "marketIntroGroupBuyTitle", description: "marketIntroGroupBuyDescription" },
};

/** The shared action-oriented title and CTA for every Market shop type. */
export function MarketBrowseIntro({ shopType }: { shopType: ShopType }) {
  const { t } = useLanguage();
  const copy = marketBrowseCopy[shopType];

  return <div className="browse-intro browse-intro--with-create">
    <div className="browse-intro-copy">
      <h1>{t(copy.title)}</h1>
      <p>{t(copy.description)}</p>
    </div>
    <Link className="browse-create-button ui-button ui-button--lg" href="/market/create">
      <i className="ms ms-add" aria-hidden="true" />
      <span>{t("createListing")}</span>
    </Link>
  </div>;
}
