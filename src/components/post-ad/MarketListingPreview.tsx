import { ProductCard } from "@/components/ProductCard";
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
  const category = marketplaceCategories.find(({ value }) => value === mainCategory);
  const subcategory = getSubcategories(mainCategory).find(({ value }) => value === subCategory);
  const categoryDetails = mainCategory === "mobile-phones-tablets" && subCategory === "mobile-phones" && smartphoneDetails
    ? [
      ["Brand", smartphoneDetails.brand],
      ["Model", smartphoneDetails.model],
      ["Storage", smartphoneDetails.storage],
      ["Memory", smartphoneDetails.memory],
      ["Colour", smartphoneDetails.colour],
      ["LCD scratch", smartphoneDetails.lcdScratch],
    ].filter(([, value]) => value.trim())
    : [];
  const descriptionText = plainDescription(description);

  return (
    <div className="post-ad-live-preview">
      <div className="post-ad-live-preview-heading">
        <div>
          <span>Live preview</span>
          <strong>What buyers will see</strong>
        </div>
        <i className="ms ms-visibility" aria-hidden="true" />
      </div>
      <ProductCard className="post-ad-preview-card" listing={listing} imageSizes="240px" persistSave={false} isPreview />
      <section className="post-ad-preview-detail" aria-label="Listing details preview">
        <nav aria-label="Preview category">
          <span>{category?.label ?? "Category"}</span>
          {subcategory ? <><i className="ms ms-chevron-right" aria-hidden="true" /><span>{subcategory.label}</span></> : null}
        </nav>
        <dl>
          <div><dt>Condition</dt><dd>{condition || "Brand new"}</dd></div>
          <div><dt>Delivery</dt><dd>{tradeMethod || "Pickup & delivery"}</dd></div>
          {meetingPlace ? <div><dt>Meet at</dt><dd>{meetingPlace}</dd></div> : null}
        </dl>
        {categoryDetails.length ? <section className="post-ad-preview-category-details"><h3>Category details</h3><dl>{categoryDetails.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section> : null}
        <section className="post-ad-preview-description"><h3>Description</h3><p>{descriptionText || "Your description will appear here."}</p></section>
      </section>
    </div>
  );
}
