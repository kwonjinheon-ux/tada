"use client";

import { useListingSafety } from "@/components/market/useListingSafety";
import { useLanguage } from "@/components/LanguageProvider";

export function ListingSafetyActions({ listingId, sellerId, sellerProfileVariant = false, iconOnly = false, space = "market" }: { listingId: string; sellerId: string | null; sellerProfileVariant?: boolean; iconOnly?: boolean; space?: "market" | "community" }) {
  const { t } = useLanguage();
  const { openReport, blockSeller, isSubmitting, feedback, reportDialog } = useListingSafety({ listingId, sellerId, space });

  return <section className="listing-safety-actions" aria-label={t("listingSafetyTools")}>
    <div className={`listing-safety-buttons ${sellerProfileVariant ? "is-seller-profile-variant" : ""}`}>
      <button type="button" aria-label={t("listingReportListing")} title={t("listingReport")} onClick={openReport}><i className="ms ms-flag" aria-hidden="true" /> {!iconOnly && (sellerProfileVariant ? "신고" : "Report")}</button>
      {sellerId ? <button type="button" aria-label={t("listingBlockSeller")} title={t("listingBlockSeller")} onClick={() => void blockSeller()} disabled={isSubmitting}><i className="ms ms-block" aria-hidden="true" /> {!iconOnly && (sellerProfileVariant ? "차단" : "Block")}</button> : null}
    </div>
    {feedback ? <p role="status">{feedback}</p> : null}
    {reportDialog}
  </section>;
}
