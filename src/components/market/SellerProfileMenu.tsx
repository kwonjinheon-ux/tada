"use client";

import type { ReactNode } from "react";
import { CommunityCommentAuthorMenu } from "@/components/community/CommunityCommentAuthorMenu";
import { useLanguage } from "@/components/LanguageProvider";
import { useListingSafety } from "@/components/market/useListingSafety";

type SellerProfileMenuProps = {
  listingId: string;
  sellerId: string;
  name: string;
  /** The avatar the button wraps. */
  trigger: ReactNode;
  /** Viewing your own listing: no one to report or block. */
  isOwner?: boolean;
  menuClassName?: string;
};

/** Tap the seller's photo: view profile, view other listings, report, block —
 *  the Community author menu, with the market's safety actions added. */
export function SellerProfileMenu({ listingId, sellerId, name, trigger, isOwner = false, menuClassName }: SellerProfileMenuProps) {
  const { locale } = useLanguage();
  const ko = locale === "ko";
  const { openReport, blockSeller, isSubmitting, feedback, reportDialog } = useListingSafety({ listingId, sellerId });

  return <>
    <CommunityCommentAuthorMenu
      authorId={sellerId}
      name={name}
      avatarUrl={null}
      trigger={trigger}
      menuClassName={menuClassName}
      otherHref={`/market/sellers/${sellerId}/listings`}
      otherLabel={ko ? "다른 매물 보기" : "View other listings"}
      otherIcon="ms-storefront"
      extraItems={isOwner ? undefined : (close) => <>
        <button type="button" role="menuitem" onClick={() => { close(); openReport(); }}><i className="ms ms-flag" aria-hidden="true" />{ko ? "신고하기" : "Report"}</button>
        <button type="button" role="menuitem" className="is-danger" disabled={isSubmitting} onClick={() => { close(); void blockSeller(); }}><i className="ms ms-block" aria-hidden="true" />{ko ? "차단하기" : "Block"}</button>
      </>}
    />
    {feedback ? <p className="seller-profile-menu-status" role="status">{feedback}</p> : null}
    {reportDialog}
  </>;
}
