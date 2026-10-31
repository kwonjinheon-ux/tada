"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { SaveHeartIcon, saveFeedbackClasses, type HeartParticle } from "@/components/SaveHeartBurst";
import { Button } from "@/components/ui/Button";

type ListingActionPanelProps = {
  /** Who is looking: the buyer sees offer and chat, the seller sees management. */
  mode: "buyer" | "seller";
  isSold: boolean;
  isLinkCopied: boolean;
  /** Unread messages waiting on this listing; only the seller's message button shows it. */
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
 * The phone listing page's one row of actions, under the title block. The main action is a
 * pill that takes the width left over; the rest are round buttons whose names are for
 * assistive technology. A buyer gets offer, message, save, share. A seller gets mark sold,
 * messages (with the unread count), edit, share and bump, and a quiet delete beneath.
 * Hidden from tablet up, where the summary rail carries the same actions.
 */
export function ListingActionPanel({ mode, isSold, isLinkCopied, unreadCount = 0, isOpeningMessage = false, isMarkingSold = false, isBumping = false, isBumped = false, isSaved = false, isPopping = false, heartParticles = [], onSave, onSaveAnimationEnd, onOffer, onMessage, onMessageIntent, onShare, onMarkSold, onEdit, onBump, onDelete }: ListingActionPanelProps) {
  const { t } = useLanguage();
  const isSeller = mode === "seller";
  const shareLabel = isLinkCopied ? t("listingLinkCopiedShort") : t("listingCopyLinkShort");
  const shareButton = <button type="button" className={`listing-action-round ${isLinkCopied ? "is-copied" : ""}`} aria-label={shareLabel} title={shareLabel} onClick={onShare}><i className={`ms ${isLinkCopied ? "ms-check" : "ms-share"}`} aria-hidden="true" /></button>;

  if (!isSeller) {
    const saveLabel = isSaved ? t("listingUnsave") : t("listingSave");
    return <section className="listing-action-panel is-buyer" aria-label={t("listingPanelBuyer")}>
      <Button size="lg" className="listing-action-primary" onClick={onOffer}><i className="ms ms-sell" aria-hidden="true" /> {t("listingOfferAction")}</Button>
      <button type="button" className="listing-action-pill" onPointerEnter={onMessageIntent} onFocus={onMessageIntent} onClick={onMessage} disabled={isOpeningMessage}><i className="ms ms-chat-bubble" aria-hidden="true" /><span>{isOpeningMessage ? t("listingOpeningChat") : t("listingMessage")}</span></button>
      <button type="button" className={`listing-action-round ${saveFeedbackClasses.root} ${isSaved ? saveFeedbackClasses.saved : ""} ${isPopping ? saveFeedbackClasses.popping : ""}`} aria-label={saveLabel} title={saveLabel} aria-pressed={isSaved} onClick={onSave} onAnimationEnd={(event) => { if (event.currentTarget === event.target) onSaveAnimationEnd?.(); }}><SaveHeartIcon isSaved={isSaved} particles={heartParticles} /></button>
      {shareButton}
    </section>;
  }

  const messageLabel = isOpeningMessage ? t("listingOpeningChat") : t("listingMessage");
  const bumpLabel = isBumped ? t("listingBumped") : t("listingBump");
  return <section className="listing-action-panel is-seller" aria-label={t("listingPanelSeller")}>
    <Button size="lg" className="listing-action-primary is-seller" onClick={onMarkSold} disabled={isSold || isMarkingSold}><i className="ms ms-check" aria-hidden="true" /> {isSold ? t("soldOut") : isMarkingSold ? t("listingMarkingSold") : t("listingMarkSoldShort")}</Button>
    <button type="button" className="listing-action-round" aria-label={messageLabel} title={messageLabel} onClick={onMessage} disabled={isOpeningMessage}>
      <i className="ms ms-chat-bubble" aria-hidden="true" />
      {unreadCount > 0 ? <b className="listing-action-badge" aria-label={`${unreadCount}`}>{unreadCount > 99 ? "99+" : unreadCount}</b> : null}
    </button>
    <button type="button" className="listing-action-round" aria-label={t("listingEditPost")} title={t("listingEditPost")} onClick={onEdit} disabled={isSold}><i className="ms ms-edit" aria-hidden="true" /></button>
    {shareButton}
    <button type="button" className="listing-action-round is-accent" aria-label={bumpLabel} title={bumpLabel} onClick={onBump} disabled={isSold || isBumping}><i className={`ms ${isBumped ? "ms-check" : "ms-arrow-upward"}`} aria-hidden="true" /></button>
    <button type="button" className="listing-action-delete" onClick={onDelete}><i className="ms ms-delete" aria-hidden="true" /> {t("listingDelete")}</button>
  </section>;
}
