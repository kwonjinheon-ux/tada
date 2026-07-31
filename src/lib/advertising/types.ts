export const AD_PLACEMENTS = ["market_top", "market_feed", "market_sidebar", "search_feed", "product_detail_middle", "product_detail_bottom"] as const;
export const AD_PROVIDERS = ["adsense", "sponsor"] as const;
export const AD_SERVING_MODES = ["sponsor_first", "adsense_first", "weighted_mix", "sponsor_only", "adsense_only"] as const;
export type AdPlacement = (typeof AD_PLACEMENTS)[number];
export type AdProvider = (typeof AD_PROVIDERS)[number];
export type AdServingMode = (typeof AD_SERVING_MODES)[number];
export type AdDevice = "desktop" | "mobile";
export type SponsorFrequencyLevel = 1 | 2 | 3 | 4 | 5;

export const SPONSOR_FREQUENCY_WEIGHTS: Record<SponsorFrequencyLevel, number> = { 1: 1, 2: 2, 3: 4, 4: 7, 5: 12 };
export const FREQUENCY_LABELS: Record<SponsorFrequencyLevel, string> = { 1: "Basic", 2: "Standard", 3: "Featured", 4: "Premium", 5: "Exclusive" };
export const AD_PLACEMENT_GUIDANCE: Record<AdPlacement, { desktop: string; mobile: string; devices: string }> = {
  market_top: { desktop: "970 × 90 px", mobile: "320 × 100 px", devices: "Desktop and mobile" },
  market_feed: { desktop: "728 × 90 px or responsive", mobile: "320 × 100 px or responsive", devices: "Desktop and mobile" },
  market_sidebar: { desktop: "300 × 250 px or 300 × 600 px", mobile: "Not supported", devices: "Desktop only" },
  search_feed: { desktop: "728 × 90 px or responsive", mobile: "320 × 100 px", devices: "Desktop and mobile" },
  product_detail_middle: { desktop: "728 × 90 px", mobile: "320 × 100 px", devices: "Desktop and mobile" },
  product_detail_bottom: { desktop: "728 × 90 px", mobile: "320 × 100 px", devices: "Desktop and mobile" },
};

export type PublicAd = {
  id: string; provider: AdProvider; name: string; sponsorName: string | null; placement: AdPlacement; priority: number;
  frequencyLevel: SponsorFrequencyLevel; weight: number; adsenseClientId: string | null; adsenseSlotId: string | null;
  adsenseFormat: string | null; desktopImageUrl: string | null; mobileImageUrl: string | null; destinationUrl: string | null;
  altText: string | null; showOnDesktop: boolean; showOnMobile: boolean; allowResponsiveFallback: boolean; openInNewTab: boolean;
  dailyImpressions: number; totalImpressions: number; dailyImpressionCap: number | null; totalImpressionCap: number | null;
};
