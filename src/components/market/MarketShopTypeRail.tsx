import { useLanguage } from "@/components/LanguageProvider";
import { MobileBrowseCategoryRail } from "@/components/browse/MobileBrowseCategoryRail";
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

  return <MobileBrowseCategoryRail
    ariaLabel={t("marketType")}
    activeValue={activeShopType}
    onSelect={(value) => onShopTypeSelect(value as ShopType)}
    items={marketShopTypes.filter(({ value }) => value !== "all").map(({ labelKey, value }) => ({
      value,
      label: t(labelKey),
      ...shopTypePresentation[value as Exclude<ShopType, "all">],
    }))}
  />;
}
