import { useLanguage } from "@/components/LanguageProvider";
import { MobileBrowseCategoryRail } from "@/components/browse/MobileBrowseCategoryRail";
import { marketShopTypes, type ShopType } from "@/components/market/MarketFilterSidebar";

const shopTypeTones: Record<ShopType, string> = {
  all: "is-all",
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
    items={marketShopTypes.map(({ icon, image, labelKey, value }) => ({
      value,
      label: t(labelKey),
      icon,
      image,
      tone: shopTypeTones[value],
    }))}
  />;
}
