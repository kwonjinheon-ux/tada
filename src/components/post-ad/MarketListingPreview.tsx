"use client";

import { ProductCard } from "@/components/ProductCard";
import { useLanguage } from "@/components/LanguageProvider";
import { getMarketCategoryLabel, getMarketOptionLabel } from "@/lib/market/category-label";
import { getSubcategories, marketplaceCategories } from "@/data/marketplace-categories";
import type { Listing } from "@/data/listings";

type SmartphonePreviewDetails = {
  brand: string;
  model: string;
  storage: string;
  memory: string;
  colour: string;
  lcdScratch: string;
};

type MarketListingPreviewProps = {
  listing: Listing;
  mainCategory: string;
  subCategory: string;
  condition: string;
  tradeMethod: string;
  meetingPlace: string;
  description: string;
  smartphoneDetails?: SmartphonePreviewDetails;
};

function plainDescription(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();
}

export function MarketListingPreview({ listing, mainCategory, subCategory, condition, tradeMethod, meetingPlace, description, smartphoneDetails }: MarketListingPreviewProps) {
  const { locale } = useLanguage();
  const say = (en: string, ko: string) => (locale === "ko" ? ko : en);
  const category = marketplaceCategories.find(({ value }) => value === mainCategory);
  const subcategory = getSubcategories(mainCategory).find(({ value }) => value === subCategory);
  const categoryDetails = mainCategory === "mobile-phones-tablets" && subCategory === "mobile-phones" && smartphoneDetails
    ? [
      [say("Brand", "브랜드"), smartphoneDetails.brand],
      [say("Model", "모델"), smartphoneDetails.model],
      [say("Storage", "저장 용량"), smartphoneDetails.storage],
      [say("Memory", "메모리"), smartphoneDetails.memory],
      [say("Colour", "색상"), smartphoneDetails.colour],
      ["LCD scratch", smartphoneDetails.lcdScratch],
    ].filter(([, value]) => value.trim())
    : [];
  const descriptionText = plainDescription(description);

  return (
    <div className="post-ad-live-preview">
      <div className="post-ad-live-preview-heading">
        <div>
          <span>{say("Live preview", "실시간 미리보기")}</span>
          <strong>{say("What buyers will see", "구매자에게 보이는 모습")}</strong>
        </div>
        <i className="ms ms-visibility" aria-hidden="true" />
      </div>
      <ProductCard className="post-ad-preview-card" listing={listing} imageSizes="240px" persistSave={false} isPreview />
      <section className="post-ad-preview-detail" aria-label="Listing details preview">
        <nav aria-label={say("Preview category", "미리보기 카테고리")}>
          <span>{category ? getMarketCategoryLabel(category.label, locale) : say("Category", "카테고리")}</span>
          {subcategory ? <><i className="ms ms-chevron-right" aria-hidden="true" /><span>{getMarketCategoryLabel(subcategory.label, locale)}</span></> : null}
        </nav>
        <dl>
          <div><dt>{say("Condition", "상태")}</dt><dd>{condition || getMarketOptionLabel("Brand new", locale)}</dd></div>
          <div><dt>{say("Delivery", "거래 방법")}</dt><dd>{tradeMethod || getMarketOptionLabel("Pickup & delivery", locale)}</dd></div>
          {meetingPlace ? <div><dt>{say("Meet at", "거래 장소")}</dt><dd>{meetingPlace}</dd></div> : null}
        </dl>
        {categoryDetails.length ? <section className="post-ad-preview-category-details"><h3>{say("Category details", "카테고리 상세")}</h3><dl>{categoryDetails.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section> : null}
        <section className="post-ad-preview-description"><h3>{say("Description", "상세 설명")}</h3><p>{descriptionText || say("Your description will appear here.", "작성한 설명이 여기에 표시됩니다.")}</p></section>
      </section>
    </div>
  );
}
