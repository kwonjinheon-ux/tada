"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { Button } from "@/components/ui/Button";

type ListingActionPanelProps = {
  /** Who is looking: the buyer sees offer and chat, the seller sees management. */
  mode: "buyer" | "seller";
  price: string;
  isSold: boolean;
  isLinkCopied: boolean;
  /** Unread messages waiting on this listing; only the seller's tile shows it. */
  unreadCount?: number;
  isOpeningMessage?: boolean;
  isMarkingSold?: boolean;
  isBumping?: boolean;
  isBumped?: boolean;
  onOffer?: () => void;
  onMessage: () => void;
  onMessageIntent?: () => void;
  onShare: () => void;
  onMarkSold?: () => void;
  onEdit?: () => void;
  onBump?: () => void;
  onDelete?: () => void;
};

/**
 * The phone listing page's one place to act: the buyer's offer and chat, or the
 * seller's mark-sold, edit, copy-link, bump and delete. It sits under the
 * description and is hidden from tablet up, where the summary rail carries the
 * same actions.
 */
export function ListingActionPanel({ mode, price, isSold, isLinkCopied, unreadCount = 0, isOpeningMessage = false, isMarkingSold = false, isBumping = false, isBumped = false, onOffer, onMessage, onMessageIntent, onShare, onMarkSold, onEdit, onBump, onDelete }: ListingActionPanelProps) {
  const { t } = useLanguage();
  const isSeller = mode === "seller";
  const shareTile = <button type="button" className="listing-action-tile" onClick={onShare}><i className={`ms ${isLinkCopied ? "ms-check" : "ms-link"}`} aria-hidden="true" /><span>{isLinkCopied ? t("listingDockLinkCopied") : t("listingCopyLinkShort")}</span></button>;
  const messageTile = <button type="button" className="listing-action-tile" onPointerEnter={onMessageIntent} onFocus={onMessageIntent} onClick={onMessage} disabled={isOpeningMessage}>
    <i className="ms ms-chat-bubble" aria-hidden="true" />
    {unreadCount > 0 ? <b className="listing-action-tile-badge" aria-label={`${unreadCount}`}>{unreadCount > 99 ? "99+" : unreadCount}</b> : null}
    <span>{isOpeningMessage ? t("listingOpeningChat") : t("listingMessage")}</span>
  </button>;

  return <section className={`listing-action-panel is-${mode}`} aria-label={t(isSeller ? "listingPanelSeller" : "listingPanelBuyer")}>
    <header className="listing-action-panel-header">
      <span><i className={`ms ${isSeller ? "ms-person" : "ms-shopping-bag"}`} aria-hidden="true" /> {t(isSeller ? "listingPanelSeller" : "listingPanelBuyer")}</span>
      {isSeller ? null : <strong>{price}</strong>}
    </header>
    {isSeller
      ? <Button size="lg" block className="listing-action-primary is-seller" onClick={onMarkSold} disabled={isSold || isMarkingSold}><i className="ms ms-check" aria-hidden="true" /> {isSold ? t("soldOut") : isMarkingSold ? t("listingMarkingSold") : t("listingMarkSold")}</Button>
      : <Button size="lg" block className="listing-action-primary" onClick={onOffer}><i className="ms ms-sell" aria-hidden="true" /> {t("listingOfferAction")}</Button>}
    <div className="listing-action-tiles">
      {messageTile}
      {isSeller ? <button type="button" className="listing-action-tile" onClick={onEdit} disabled={isSold}><i className="ms ms-edit" aria-hidden="true" /><span>{t("listingEditPost")}</span></button> : null}
      {shareTile}
      {isSeller ? <button type="button" className="listing-action-tile is-accent" onClick={onBump} disabled={isSold || isBumping}><i className={`ms ${isBumped ? "ms-check" : "ms-arrow-upward"}`} aria-hidden="true" /><span>{isBumped ? t("listingBumped") : t("listingBump")}</span></button> : null}
    </div>
    {isSeller
      ? <button type="button" className="listing-action-delete" onClick={onDelete}><i className="ms ms-delete" aria-hidden="true" /> {t("listingDelete")}</button>
      : <p className="listing-action-hint">{t("listingOfferHint")}</p>}
  </section>;
}
