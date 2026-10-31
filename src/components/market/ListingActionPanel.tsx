"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { SaveHeartIcon, saveFeedbackClasses, type HeartParticle } from "@/components/SaveHeartBurst";
import { Button } from "@/components/ui/Button";

type ListingActionPanelProps = {
  /** Who is looking: the buyer sees offer and chat, the seller sees management. */
  mode: "buyer" | "seller";
  isSold: boolean;
  isLinkCopied: boolean;
  /** Unread messages waiting on this listing; only the seller's tile shows it. */
  unreadCount?: number;
  isOpeningMessage?: boolean;
  isMarkingSold?: boolean;
  isBumping?: boolean;
  isBumped?: boolean;
  /** The buyer's save toggle, with the shared heart burst. */
  isSaved?: boolean;
  isPopping?: boolean;
  heartParticles?: HeartParticle[];
  onSave?: () => void;
  onSaveAnimationEnd?: () => void;
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
export function ListingActionPanel({ mode, isSold, isLinkCopied, unreadCount = 0, isOpeningMessage = false, isMarkingSold = false, isBumping = false, isBumped = false, isSaved = false, isPopping = false, heartParticles = [], onSave, onSaveAnimationEnd, onOffer, onMessage, onMessageIntent, onShare, onMarkSold, onEdit, onBump, onDelete }: ListingActionPanelProps) {
  const { t } = useLanguage();
  const isSeller = mode === "seller";
  const shareTile = <button type="button" className={`listing-action-tile ${isLinkCopied ? "is-copied" : ""}`} onClick={onShare}><i className={`ms ${isLinkCopied ? "ms-check" : "ms-link"}`} aria-hidden="true" /><span aria-live="polite">{isLinkCopied ? t("listingLinkCopiedShort") : t("listingCopyLinkShort")}</span></button>;
  const messageTile = <button type="button" className="listing-action-tile" onPointerEnter={onMessageIntent} onFocus={onMessageIntent} onClick={onMessage} disabled={isOpeningMessage}>
    <i className="ms ms-chat-bubble" aria-hidden="true" />
    {unreadCount > 0 ? <b className="listing-action-tile-badge" aria-label={`${unreadCount}`}>{unreadCount > 99 ? "99+" : unreadCount}</b> : null}
    <span>{isOpeningMessage ? t("listingOpeningChat") : t("listingMessage")}</span>
  </button>;

  // Buyer: one row, as on the desktop summary — offer, message, save, share. The save and share
  // buttons are round and carry no text; their labels are for assistive technology.
  if (!isSeller) {
    const saveLabel = isSaved ? t("listingUnsave") : t("listingSave");
    const shareLabel = isLinkCopied ? t("listingLinkCopiedShort") : t("listingCopyLinkShort");
    return <section className="listing-action-panel is-buyer" aria-label={t("listingPanelBuyer")}>
      <Button size="lg" className="listing-action-primary" onClick={onOffer}><i className="ms ms-sell" aria-hidden="true" /> {t("listingOfferAction")}</Button>
      <button type="button" className="listing-action-pill" onPointerEnter={onMessageIntent} onFocus={onMessageIntent} onClick={onMessage} disabled={isOpeningMessage}><i className="ms ms-chat-bubble" aria-hidden="true" /><span>{isOpeningMessage ? t("listingOpeningChat") : t("listingMessage")}</span></button>
      <button type="button" className={`listing-action-round ${saveFeedbackClasses.root} ${isSaved ? saveFeedbackClasses.saved : ""} ${isPopping ? saveFeedbackClasses.popping : ""}`} aria-label={saveLabel} title={saveLabel} aria-pressed={isSaved} onClick={onSave} onAnimationEnd={(event) => { if (event.currentTarget === event.target) onSaveAnimationEnd?.(); }}><SaveHeartIcon isSaved={isSaved} particles={heartParticles} /></button>
      <button type="button" className={`listing-action-round ${isLinkCopied ? "is-copied" : ""}`} aria-label={shareLabel} title={shareLabel} onClick={onShare}><i className={`ms ${isLinkCopied ? "ms-check" : "ms-share"}`} aria-hidden="true" /></button>
    </section>;
  }

  return <section className={`listing-action-panel is-${mode}`} aria-label={t("listingPanelSeller")}>
    {isSeller
      ? <Button size="lg" block className="listing-action-primary is-seller" onClick={onMarkSold} disabled={isSold || isMarkingSold}><i className="ms ms-check" aria-hidden="true" /> {isSold ? t("soldOut") : isMarkingSold ? t("listingMarkingSold") : t("listingMarkSold")}</Button>
      : <Button size="lg" block className="listing-action-primary" onClick={onOffer}><i className="ms ms-sell" aria-hidden="true" /> {t("listingOfferAction")}</Button>}
    <div className="listing-action-tiles">
      {messageTile}
      {isSeller ? <button type="button" className="listing-action-tile" onClick={onEdit} disabled={isSold}><i className="ms ms-edit" aria-hidden="true" /><span>{t("listingEditPost")}</span></button> : null}
      {shareTile}
      {isSeller ? <button type="button" className="listing-action-tile is-accent" onClick={onBump} disabled={isSold || isBumping}><i className={`ms ${isBumped ? "ms-check" : "ms-arrow-upward"}`} aria-hidden="true" /><span>{isBumped ? t("listingBumped") : t("listingBump")}</span></button> : null}
    </div>
    {isSeller ? <button type="button" className="listing-action-delete" onClick={onDelete}><i className="ms ms-delete" aria-hidden="true" /> {t("listingDelete")}</button> : null}
  </section>;
}
