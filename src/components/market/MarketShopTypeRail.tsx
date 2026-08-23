import { useLanguage } from "@/components/LanguageProvider";
import { MobileBrowseCategoryRail } from "@/components/browse/MobileBrowseCategoryRail";
import { marketShopTypeIllustrations, marketShopTypes, type ShopType } from "@/components/market/MarketFilterSidebar";

const shopTypeTones: Record<Exclude<ShopType, "all">, string> = {
  secondhand: "is-trade",
  "garage-sale": "is-garage",
  "moving-sale": "is-moving",
  "2dollarshop": "is-dollar",
  groupbuy: "is-group",
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
      image: marketShopTypeIllustrations[value as Exclude<ShopType, "all">],
      tone: shopTypeTones[value as Exclude<ShopType, "all">],
    }))}
  />;
}
