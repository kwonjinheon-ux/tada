import "server-only";
import type { AdDevice, AdProvider, AdServingMode, PublicAd } from "@/lib/advertising/types";

export function eligibleAds(ads: PublicAd[], device: AdDevice, now = new Date()) {
  void now;
  return ads.filter((ad) => (device === "desktop" ? ad.showOnDesktop : ad.showOnMobile) && (ad.dailyImpressionCap === null || ad.dailyImpressions < ad.dailyImpressionCap) && (ad.totalImpressionCap === null || ad.totalImpressions < ad.totalImpressionCap));
}
export function chooseWeightedAd(ads: PublicAd[], random: () => number = Math.random): PublicAd | null {
  if (!ads.length) return null;
  const highestPriority = Math.max(...ads.map((ad) => ad.priority));
  const pool = ads.filter((ad) => ad.priority === highestPriority);
  const total = pool.reduce((sum, ad) => sum + Math.max(1, ad.weight), 0);
  let cursor = random() * total;
  return pool.find((ad) => (cursor -= Math.max(1, ad.weight)) < 0) ?? pool.at(-1) ?? null;
}
export function selectAd(ads: PublicAd[], mode: AdServingMode, device: AdDevice, random: () => number = Math.random): PublicAd | null {
  const eligible = eligibleAds(ads, device); const sponsors = eligible.filter((ad) => ad.provider === "sponsor"); const adsense = eligible.filter((ad) => ad.provider === "adsense");
  const pick = (pool: PublicAd[]) => chooseWeightedAd(pool, random);
  if (mode === "sponsor_only") return pick(sponsors); if (mode === "adsense_only") return pick(adsense); if (mode === "adsense_first") return pick(adsense) ?? pick(sponsors); if (mode === "weighted_mix") return pick([...sponsors, ...adsense]); return pick(sponsors) ?? pick(adsense);
}
