"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type MouseEvent, useEffect, useMemo, useRef, useState } from "react";
import { marketConversationResponseSchema, marketWishlistResponseSchema } from "@/contracts/api";
import { SaveHeartIcon, saveFeedbackClasses, useSaveHeartFeedback } from "@/components/SaveHeartBurst";
import { ListingComments } from "@/components/market/ListingComments";
import { ListingDescriptionTranslation } from "@/components/market/ListingDescriptionTranslation";
import { ListingSafetyActions } from "@/components/market/ListingSafetyActions";
import { Avatar } from "@/components/ui/Avatar";
import { DialogOverlay, PopupBackdrop } from "@/components/ui/DialogOverlay";
import { copyCurrentPageLink } from "@/lib/share/copy-page-link";
import { UNCONFIRMED_DETAILS_HEADING, splitUnconfirmedDetails } from "@/lib/market/unconfirmed-details";
import { TextSizeSection } from "@/components/ui/TextSizeSection";
import { AdSlot } from "@/components/advertising/AdSlot";
import { readApiResponse } from "@/lib/api/client";

export type ListingDetail = {
  id: string;
  ownerId: string | null;
  title: string;
  price: string;
  priceCents: number;
  category: { label: string; href: string; subcategory: { label: string; href: string } | null } | null;
  subcategorySlug: string | null;
  location: string;
  description: string;
  condition: string;
  tradeMethod: string;
  meetingPlace: string | null;
  createdAt: string;
  status: "available" | "pending" | "sold";
  viewCount: number;
  images: Array<{ src: string; alt: string }>;
  seller: { id: string | null; name: string; avatarUrl: string | null; ratingAverage: number; ratingCount: number };
  bargainType?: string | null;
};

const statusLabel = {
  available: "Available",
  pending: "Pending",
  sold: "Sold out",
} as const;

function descriptionParagraphs(description: string) {
  const plainText = description
    .replace(/<br\s*\/?>(\r?\n)?/gi, "\n")
    .replace(/<\/?p[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .trim();

  return plainText.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean);
}

type ListingDetailClientProps = {
  listing: ListingDetail;
  initialIsSaved?: boolean;
  isOwner?: boolean;
  descriptionTextSizeStep?: number;
  /** Reuse the Market detail surface for Bargain listings without crossing data domains. */
  space?: "market" | "bargain";
};

type BargainOffer = { id: string; buyer_id: string; amount_cents: number; note: string | null; status: string; created_at: string };

export function ListingDetailClient({ listing, initialIsSaved = false, isOwner = false, descriptionTextSizeStep = 0, space = "market" }: ListingDetailClientProps) {
  const router = useRouter();
  const isBargainListing = space === "bargain";
  const supportsBargainOffer = isBargainListing && listing.bargainType === "2-dollar-deals";
  const listingHomePath = "/market";
  const [activeImage, setActiveImage] = useState(0);
  const [imageTransition, setImageTransition] = useState<"next" | "previous">("next");
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [viewCount, setViewCount] = useState(listing.viewCount);
  const [isSaved, setIsSaved] = useState(initialIsSaved);
  const { heartParticles, isPopping, play: playSaveFeedback, stopPopping } = useSaveHeartFeedback();
  const [isOpeningMessage, setIsOpeningMessage] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [isOfferDialogOpen, setIsOfferDialogOpen] = useState(false);
  const [offerAmount, setOfferAmount] = useState(() => (listing.priceCents / 100).toString());
  const [offerNote, setOfferNote] = useState("");
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);
  const [offerError, setOfferError] = useState<string | null>(null);
  const [bargainOffers, setBargainOffers] = useState<BargainOffer[]>([]);
  const [isLoadingBargainOffers, setIsLoadingBargainOffers] = useState(false);
  const [respondingBargainOfferId, setRespondingBargainOfferId] = useState<string | null>(null);
  const [bargainOfferActionError, setBargainOfferActionError] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteAnimating, setIsDeleteAnimating] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isMarkingSold, setIsMarkingSold] = useState(false);
  const [listingStatus, setListingStatus] = useState(listing.status);
  const [isSellerOnline, setIsSellerOnline] = useState(false);
  const swipeStartX = useRef<number | null>(null);
  const paragraphs = useMemo(() => descriptionParagraphs(listing.description), [listing.description]);
  const { paragraphs: prose, unconfirmed } = useMemo(() => splitUnconfirmedDetails(paragraphs), [paragraphs]);
  const [isUnconfirmedOpen, setIsUnconfirmedOpen] = useState(false);
  const [translatedDescription, setTranslatedDescription] = useState<string | null>(null);
  const image = listing.images[activeImage] ?? listing.images[0];
  const ratingLabel = listing.seller.ratingCount
    ? `${listing.seller.ratingAverage.toFixed(1)} seller rating (${listing.seller.ratingCount})`
    : "No ratings yet";

  useEffect(() => {
    document.body.classList.add("listing-detail-screen");
    return () => document.body.classList.remove("listing-detail-screen");
  }, []);

  useEffect(() => {
    if (!isGalleryOpen) return;
    document.body.classList.add("listing-gallery-open");
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsGalleryOpen(false);
      if (event.key === "ArrowRight" && listing.images.length > 1) {
        setImageTransition("next");
        setActiveImage((current) => (current + 1) % listing.images.length);
      }
      if (event.key === "ArrowLeft" && listing.images.length > 1) {
        setImageTransition("previous");
        setActiveImage((current) => (current - 1 + listing.images.length) % listing.images.length);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("listing-gallery-open");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isGalleryOpen, listing.images.length]);

  useEffect(() => {
    if (!isBargainListing) router.prefetch("/market/dashboard/messages");
  }, [isBargainListing, router]);

  useEffect(() => {
    const sellerId = listing.seller.id;
    if (!sellerId) {
      setIsSellerOnline(false);
      return;
    }

    const syncPresence = () => setIsSellerOnline(window.__tadaOnlineMemberIds?.includes(sellerId) ?? false);
    syncPresence();
    window.addEventListener("tada-member-presence", syncPresence);

    return () => {
      window.removeEventListener("tada-member-presence", syncPresence);
    };
  }, [listing.seller.id]);

  useEffect(() => {
    if (isBargainListing) return;
    void fetch(`/api/market/listings/${listing.id}/view`, { method: "POST", cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<{ viewCount?: number }> : null)
      .then((payload) => { if (typeof payload?.viewCount === "number") setViewCount(payload.viewCount); })
      .catch(() => undefined);
  }, [isBargainListing, listing.id]);

  useEffect(() => {
    if (isBargainListing) return;
    if (isOwner) return;
    let isCurrent = true;
    void fetch(`/api/market/wishlist?listingId=${encodeURIComponent(listing.id)}`)
      .then((response) => readApiResponse(response, marketWishlistResponseSchema))
      .then((result) => { if (isCurrent && result.data) setIsSaved(result.data.saved); })
      .catch(() => undefined);
    return () => { isCurrent = false; };
  }, [isBargainListing, isOwner, listing.id]);

  useEffect(() => {
    if (!supportsBargainOffer || !isOwner) return;
    let isCurrent = true;
    setIsLoadingBargainOffers(true);
    void fetch(`/api/bargain/offers?listingId=${encodeURIComponent(listing.id)}`)
      .then(async (response) => ({ response, payload: await response.json().catch(() => null) as { offers?: BargainOffer[] } | null }))
      .then(({ response, payload }) => { if (isCurrent && response.ok) setBargainOffers(payload?.offers ?? []); })
      .catch(() => undefined)
      .finally(() => { if (isCurrent) setIsLoadingBargainOffers(false); });
    return () => { isCurrent = false; };
  }, [isOwner, listing.id, supportsBargainOffer]);

  const showImage = (index: number) => {
    const nextImage = (index + listing.images.length) % listing.images.length;
    if (nextImage === activeImage) return;
    setImageTransition(index > activeImage ? "next" : "previous");
    setActiveImage(nextImage);
  };

  const closeGalleryWhenClickingOutsidePhoto = (event: MouseEvent<HTMLDivElement>) => {
    const stage = event.currentTarget;
    const photo = stage.querySelector<HTMLImageElement>(".listing-gallery-lightbox-photo");

    if (!photo?.naturalWidth || !photo.naturalHeight) {
      setIsGalleryOpen(false);
      return;
    }

    const stageBounds = stage.getBoundingClientRect();
    const imageRatio = photo.naturalWidth / photo.naturalHeight;
    const stageRatio = stageBounds.width / stageBounds.height;
    const renderedWidth = imageRatio >= stageRatio ? stageBounds.width : stageBounds.height * imageRatio;
    const renderedHeight = imageRatio >= stageRatio ? stageBounds.width / imageRatio : stageBounds.height;
    const imageLeft = stageBounds.left + (stageBounds.width - renderedWidth) / 2;
    const imageTop = stageBounds.top + (stageBounds.height - renderedHeight) / 2;
    const clickedOriginalPhoto = event.clientX >= imageLeft
      && event.clientX <= imageLeft + renderedWidth
      && event.clientY >= imageTop
      && event.clientY <= imageTop + renderedHeight;

    if (!clickedOriginalPhoto) setIsGalleryOpen(false);
  };
  const saveListing = async () => {
    if (isBargainListing) return;
    const nextSaved = !isSaved;
    setIsSaved(nextSaved);
    playSaveFeedback();
    try {
      const response = await fetch("/api/market/wishlist", {
        method: nextSaved ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: listing.id }),
      });
      if (response.status === 401) {
        router.push(`/login?redirectTo=${encodeURIComponent(`/market/${listing.id}`)}`);
        return;
      }
      const result = await readApiResponse(response, marketWishlistResponseSchema);
      if (result.error || result.data.saved !== nextSaved) setIsSaved(!nextSaved);
    } catch {
      setIsSaved(!nextSaved);
    }
  };

  const shareListing = async () => {
    try {
      await copyCurrentPageLink();
      window.dispatchEvent(new Event("listing-share-copied"));
    } catch {
      setMessageError("Unable to copy this listing link. Please try again.");
    }
  };

  const openConversation = async () => {
    if (isOpeningMessage) return;
    setIsOpeningMessage(true);
    setMessageError(null);
    try {
      const response = await fetch("/api/market/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: listing.id }),
      });
      const result = await readApiResponse(response, marketConversationResponseSchema);
      if (response.status === 401) {
        router.push(`/login?redirectTo=${encodeURIComponent(`/market/${listing.id}`)}`);
        return;
      }
      if (!result.data) {
        setMessageError(result.error?.message ?? "Unable to open a conversation right now.");
        return;
      }
      const conversationPath = `/market/dashboard/messages?conversation=${result.data.conversationId}`;
      router.prefetch(conversationPath);
      if (window.matchMedia("(max-width: 767.98px)").matches) {
        window.location.assign(conversationPath);
        return;
      }
      router.push(conversationPath);
    } catch {
      setMessageError("Unable to reach messaging right now. Please try again.");
    } finally {
      setIsOpeningMessage(false);
    }
  };

  const openOfferDialog = () => {
    if (listing.status === "sold") {
      setMessageError("This listing has already been sold.");
      return;
    }
    setOfferError(null);
    setOfferAmount((listing.priceCents / 100).toString());
    setOfferNote("");
    setIsOfferDialogOpen(true);
  };

  const submitOffer = async () => {
    if (isSubmittingOffer) return;
    if (listing.status === "sold") {
      setOfferError("This listing has already been sold.");
      return;
    }
    const amount = Number(offerAmount);
    const amountCents = Math.round(amount * 100);
    if (!isBargainListing && (!Number.isFinite(amount) || amount < 0 || amountCents < 0)) {
      setOfferError("Enter a valid offer amount.");
      return;
    }
    setIsSubmittingOffer(true);
    setOfferError(null);
    try {
      const requestBody = JSON.stringify(supportsBargainOffer ? { listingId: listing.id, note: offerNote } : { listingId: listing.id, amountCents, note: offerNote });
      const offerEndpoint = supportsBargainOffer ? "/api/bargain/offers" : "/api/market/offers";
      let response: Response | null = null;
      let payload: { conversationId?: string; error?: string } | null = null;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        response = await fetch(offerEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: requestBody,
        });
        payload = await response.json().catch(() => null) as { conversationId?: string; error?: string } | null;
        if (response.status < 500 || attempt === 1) break;
        await new Promise((resolve) => window.setTimeout(resolve, 350));
      }
      if (!response) throw new Error("Offer request did not start");
      if (response.status === 401) {
        router.push(`/login?redirectTo=${encodeURIComponent(`/market/${listing.id}`)}`);
        return;
      }
      if (!response.ok) {
        setOfferError(payload?.error ?? "Unable to make an offer right now.");
        return;
      }
      setIsOfferDialogOpen(false);
      if (supportsBargainOffer) {
        setMessageError("Offer sent to the seller.");
        return;
      }
      if (!payload?.conversationId) {
        setOfferError("Unable to make an offer right now.");
        return;
      }
      const conversationPath = `/market/dashboard/messages?conversation=${payload.conversationId}`;
      if (window.matchMedia("(max-width: 767.98px)").matches) {
        window.location.assign(conversationPath);
        return;
      }
      router.push(conversationPath);
    } catch {
      setOfferError("Unable to reach offers right now. Please try again.");
    } finally {
      setIsSubmittingOffer(false);
    }
  };

  const respondToBargainOffer = async (offerId: string, action: "accept" | "decline") => {
    if (respondingBargainOfferId) return;
    setRespondingBargainOfferId(offerId);
    setBargainOfferActionError(null);
    try {
      const response = await fetch(`/api/bargain/offers/${offerId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Unable to update this offer.");
      setBargainOffers((offers) => offers.filter((offer) => offer.id !== offerId));
      if (action === "accept") {
        setListingStatus("sold");
        setBargainOffers([]);
      }
    } catch (error) {
      setBargainOfferActionError(error instanceof Error ? error.message : "Unable to update this offer.");
    } finally {
      setRespondingBargainOfferId(null);
    }
  };

  const prepareMessaging = () => {
    if (!isBargainListing) router.prefetch("/market/dashboard/messages");
  };
  const editListing = () => router.push(`${listingHomePath}/${listing.id}/edit`);
  const markAsSold = async () => {
    if (isMarkingSold || listingStatus === "sold") return;
    setIsMarkingSold(true);
    setMessageError(null);
    try {
      const response = await fetch(`/api/${isBargainListing ? "bargain" : "market"}/listings/${listing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_sold" }),
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) {
        setMessageError(payload?.error ?? "Unable to mark this listing as sold right now.");
        return;
      }
      setListingStatus("sold");
      router.refresh();
    } catch {
      setMessageError("Unable to mark this listing as sold right now.");
    } finally {
      setIsMarkingSold(false);
    }
  };
  const deleteListing = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    setDeleteError(null);
    let wasDeleted = false;
    try {
      const response = await fetch(`/api/${isBargainListing ? "bargain" : "market"}/listings/${listing.id}`, { method: "DELETE" });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) {
        setDeleteError(payload?.error ?? "Unable to delete this listing right now.");
        return;
      }
      wasDeleted = true;
      setIsDeleteAnimating(true);
      window.setTimeout(() => {
        router.push(listingHomePath);
        router.refresh();
      }, 760);
    } catch {
      setDeleteError("Unable to delete this listing right now.");
    } finally {
      if (!wasDeleted) setIsDeleting(false);
    }
  };

  const listingDockActionsRef = useRef({ openOfferDialog, openConversation, shareListing, saveListing, editListing });
  listingDockActionsRef.current = { openOfferDialog, openConversation, shareListing, saveListing, editListing };

  useEffect(() => {
    if (isBargainListing) return;
    window.__tadaListingDockConfig = { isOwner, isSaved };
    window.dispatchEvent(new Event("listing-mobile-dock-config"));
    const handleDockAction = (event: Event) => {
      switch ((event as CustomEvent<string>).detail) {
        case "offer": listingDockActionsRef.current.openOfferDialog(); break;
        case "message": void listingDockActionsRef.current.openConversation(); break;
        case "share": void listingDockActionsRef.current.shareListing(); break;
        case "save": void listingDockActionsRef.current.saveListing(); break;
        case "edit": listingDockActionsRef.current.editListing(); break;
        case "delete": setIsDeleteDialogOpen(true); break;
        default: break;
      }
    };
    window.addEventListener("listing-mobile-dock-action", handleDockAction);
    return () => {
      delete window.__tadaListingDockConfig;
      window.dispatchEvent(new Event("listing-mobile-dock-config"));
      window.removeEventListener("listing-mobile-dock-action", handleDockAction);
    };
  }, [isBargainListing, isOwner, isSaved]);

  return (
    <main className={`listing-detail-page ${listingStatus === "sold" ? "is-sold" : ""}`}>
      <div className="listing-detail-back-row">
        {listing.category ? <nav className="detail-breadcrumb" aria-label="Listing category"><Link href={listingHomePath}>Market</Link><i className="ti ti-chevron-right" aria-hidden="true" /><Link href={listing.category.href}>{listing.category.label}</Link>{listing.category.subcategory ? <><i className="ti ti-chevron-right" aria-hidden="true" /><span>{listing.category.subcategory.label}</span></> : null}</nav> : <Link className="listing-detail-back" href={listingHomePath}><i className="ti ti-arrow-left" aria-hidden="true" /> Back to listings</Link>}
      </div>

      <div className="listing-detail-layout">
        <section className="listing-detail-gallery has-mobile-photo-stack" aria-label={`${listing.title} photos`}>
          <div className="listing-detail-main-image" role="button" tabIndex={0} aria-label={`Open photo ${activeImage + 1} of ${listing.images.length} in gallery`} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setIsGalleryOpen(true); } }} onPointerDown={(event) => { swipeStartX.current = event.clientX; }} onPointerUp={(event) => {
            if ((event.target as HTMLElement).closest("button")) return;
            if (swipeStartX.current === null) return;
            const distance = event.clientX - swipeStartX.current;
            swipeStartX.current = null;
            if (Math.abs(distance) < 12) {
              setIsGalleryOpen(true);
              return;
            }
            if (Math.abs(distance) < 42 || listing.images.length < 2) return;
            showImage(activeImage + (distance < 0 ? 1 : -1));
          }} onPointerCancel={() => { swipeStartX.current = null; }}>
            <Image className="listing-detail-main-backdrop" src={image.src} alt="" fill aria-hidden="true" sizes="(max-width: 900px) 100vw, 68vw" />
            <Image key={`${image.src}-${activeImage}`} className={`listing-detail-main-photo is-entering-from-${imageTransition}`} src={image.src} alt={image.alt} fill priority sizes="(max-width: 900px) 100vw, 68vw" />
            {listing.images.length > 1 ? <><button className="listing-detail-gallery-arrow is-previous" type="button" aria-label="Previous photo" onClick={(event) => { event.stopPropagation(); showImage(activeImage - 1); }}><i className="ti ti-chevron-left" aria-hidden="true" /></button><button className="listing-detail-gallery-arrow is-next" type="button" aria-label="Next photo" onClick={(event) => { event.stopPropagation(); showImage(activeImage + 1); }}><i className="ti ti-chevron-right" aria-hidden="true" /></button></> : null}
            <span className="listing-detail-image-count"><i className="ti ti-library-photo" aria-hidden="true" /> {listing.images.length}</span>
          </div>
          <div className="listing-detail-mobile-photo-stack listing-detail-mobile-only">{listing.images.map((photo, index) => <button type="button" key={photo.src} onClick={() => { setActiveImage(index); setIsGalleryOpen(true); }} aria-label={`Open photo ${index + 1} of ${listing.images.length} in gallery`}><img src={photo.src} alt={photo.alt} /></button>)}</div>
          {listing.images.length > 1 ? (
            <div className="listing-detail-thumbnails" aria-label="Choose photo">
              {listing.images.map((photo, index) => (
                <button className={index === activeImage ? "is-active" : ""} type="button" key={photo.src} onClick={() => showImage(index)} aria-label={`Show photo ${index + 1}`} aria-pressed={index === activeImage}>
                  <Image src={photo.src} alt="" fill sizes="96px" />
                </button>
              ))}
            </div>
          ) : null}
        </section>

        <aside className="listing-detail-summary">
          <div className="listing-detail-heading">
            <div>
              <div className="listing-detail-status-row"><span className={`listing-status status-${listingStatus}`}>{statusLabel[listingStatus]}</span><span>{listing.createdAt}</span></div>
              <h1>{listing.title}</h1>
            </div>
            {isOwner ? <button className="listing-detail-save listing-detail-delete" type="button" aria-label="Delete listing" onClick={() => { setDeleteError(null); setIsDeleteDialogOpen(true); }}><i className="ti ti-trash" aria-hidden="true" /></button> : !isBargainListing ? <button className={`listing-detail-save save-button ${saveFeedbackClasses.root} ${isSaved ? saveFeedbackClasses.saved : ""} ${isPopping ? saveFeedbackClasses.popping : ""}`} type="button" aria-label={isSaved ? "Remove from saved items" : "Save listing"} aria-pressed={isSaved} onClick={() => void saveListing()} onAnimationEnd={(event) => { if (event.currentTarget === event.target) stopPopping(); }}><SaveHeartIcon isSaved={isSaved} particles={heartParticles} /></button> : null}
          </div>
          <strong className="listing-detail-price">{listing.price}</strong>
          <p className="listing-detail-location"><i className="ti ti-map-pin" aria-hidden="true" /> {listing.location}</p>

          {(isOwner || !isBargainListing || supportsBargainOffer) ? <div className={`listing-detail-actions ${isBargainListing && !isOwner ? "listing-detail-actions--single" : ""}`}>
            {isOwner ? <><button type="button" className="listing-detail-message" onClick={() => void markAsSold()} disabled={isMarkingSold || listingStatus === "sold"}><i className="ti ti-tag" aria-hidden="true" /> {listingStatus === "sold" ? "Sold out" : isMarkingSold ? "Marking sold..." : "Mark as sold"}</button><button type="button" className="listing-detail-offer" onClick={editListing} disabled={listingStatus === "sold"}><i className="ti ti-edit" aria-hidden="true" /> Edit listing</button></> : <>{!isBargainListing ? <button type="button" className="listing-detail-message" onPointerEnter={prepareMessaging} onFocus={prepareMessaging} onClick={() => void openConversation()} disabled={isOpeningMessage}><i className="ti ti-message" aria-hidden="true" /> {isOpeningMessage ? "Opening chat..." : "Message"}</button> : null}<button type="button" className="listing-detail-offer" onClick={openOfferDialog}><i className="ti ti-tag" aria-hidden="true" /> Make an offer</button></>}
          </div> : null}
          {messageError ? <p className="listing-detail-message-error" role="alert">{messageError}</p> : null}
          {supportsBargainOffer && isOwner ? <section className="listing-detail-bargain-offers" aria-live="polite"><div><h2>Offers</h2><span>{isLoadingBargainOffers ? "Loading…" : `${bargainOffers.length} pending`}</span></div>{bargainOfferActionError ? <p role="alert">{bargainOfferActionError}</p> : null}{bargainOffers.map((offer) => <article key={offer.id}><div><strong>${(offer.amount_cents / 100).toFixed(2)}</strong>{offer.note ? <p>{offer.note}</p> : null}</div><span><button type="button" onClick={() => void respondToBargainOffer(offer.id, "accept")} disabled={respondingBargainOfferId !== null}>{respondingBargainOfferId === offer.id ? "Saving…" : "Accept"}</button><button type="button" onClick={() => void respondToBargainOffer(offer.id, "decline")} disabled={respondingBargainOfferId !== null}>Decline</button></span></article>)}</section> : null}

          <dl className="listing-detail-facts">
            <div><dt>Condition</dt><dd>{listing.condition}</dd></div>
            <div><dt>Delivery</dt><dd>{listing.tradeMethod}</dd></div>
            {listing.meetingPlace ? <div><dt>Meet at</dt><dd>{listing.meetingPlace}</dd></div> : null}
          </dl>

          <section className="listing-detail-seller-card">
            <div className="listing-detail-seller">
              <span className={`listing-detail-seller-avatar-wrap ${isSellerOnline ? "is-online" : "is-offline"}`} role="status" aria-label={isSellerOnline ? "Seller is online" : "Seller is offline"}><Avatar src={listing.seller.avatarUrl} name={listing.seller.name} className="listing-detail-seller-avatar" /></span>
              <div><strong>{listing.seller.name}</strong><span>{ratingLabel}</span></div>
              {!isBargainListing && listing.seller.id ? <Link className="listing-detail-seller-profile-link" href={`/market/sellers/${listing.seller.id}`} aria-label="View seller profile" title="View seller profile"><i className="ti ti-user" aria-hidden="true" /></Link> : null}
            </div>
            {!isBargainListing && !isOwner ? <ListingSafetyActions listingId={listing.id} sellerId={listing.ownerId} /> : null}
          </section>
        </aside>
      </div>

      {isGalleryOpen ? <PopupBackdrop className="listing-gallery-lightbox" role="dialog" aria-modal="true" aria-label={`${listing.title} photo gallery`} onClose={() => setIsGalleryOpen(false)}>
        <Image className="listing-gallery-lightbox-backdrop" src={image.src} alt="" fill aria-hidden="true" sizes="100vw" onClick={() => setIsGalleryOpen(false)} />
        <button className="listing-gallery-lightbox-close" type="button" aria-label="Close photo gallery" onClick={() => setIsGalleryOpen(false)}><i className="ti ti-x" aria-hidden="true" /></button>
        <div className="listing-gallery-lightbox-stage" onClick={closeGalleryWhenClickingOutsidePhoto}>
          <Image key={`lightbox-${image.src}-${activeImage}`} className="listing-gallery-lightbox-photo" src={image.src} alt={image.alt} fill priority sizes="100vw" />
        </div>
        {listing.images.length > 1 ? <><button className="listing-gallery-lightbox-arrow is-previous" type="button" aria-label="Previous photo" onClick={() => showImage(activeImage - 1)}><i className="ti ti-chevron-left" aria-hidden="true" /></button><button className="listing-gallery-lightbox-arrow is-next" type="button" aria-label="Next photo" onClick={() => showImage(activeImage + 1)}><i className="ti ti-chevron-right" aria-hidden="true" /></button></> : null}
        <span className="listing-gallery-lightbox-count">{activeImage + 1} / {listing.images.length}</span>
      </PopupBackdrop> : null}

      <section className={`listing-detail-mobile-meta listing-detail-mobile-only ${listing.images.length > 1 ? "has-photo-stack" : ""}`}>
        <div className="listing-detail-mobile-dots" aria-label={`Photo ${activeImage + 1} of ${listing.images.length}`}>{listing.images.map((photo, index) => <span className={index === activeImage ? "is-active" : ""} key={photo.src} />)}</div>
        <h1>{listing.title}</h1>
        <div className="listing-detail-mobile-price-row"><strong>{listing.price}</strong><span className={`listing-status status-${listingStatus}`}>{statusLabel[listingStatus]}</span></div>
        <div className="listing-detail-mobile-location-row"><span><i className="ti ti-map-pin" aria-hidden="true" /> {listing.location}</span><div className="listing-detail-mobile-stats"><span><i className="ti ti-eye" aria-hidden="true" /> {new Intl.NumberFormat("en-NZ").format(viewCount)}</span><time>{listing.createdAt}</time></div></div>
      </section>

      <TextSizeSection
        className="listing-detail-description"
        title="Description"
        sizeStep={descriptionTextSizeStep}
        headerAction={<ListingDescriptionTranslation description={listing.description} onChange={setTranslatedDescription} />}
      >
        {translatedDescription
          ? descriptionParagraphs(translatedDescription).map((paragraph) => <p key={paragraph}>{paragraph}</p>)
          : prose.length ? prose.map((paragraph) => <p key={paragraph}>{paragraph}</p>) : <p>The seller has not added further details yet.</p>}
        {unconfirmed.length ? (
          <aside className={`listing-unconfirmed ${isUnconfirmedOpen ? "is-open" : ""}`} aria-label="Details the seller has not confirmed">
            <button type="button" className="listing-unconfirmed-toggle" aria-expanded={isUnconfirmedOpen} onClick={() => setIsUnconfirmedOpen((current) => !current)}>
              <span>{UNCONFIRMED_DETAILS_HEADING}</span>
              <i className="ti ti-chevron-down" aria-hidden="true" />
            </button>
            <div className="listing-unconfirmed-panel">
              <div className="listing-unconfirmed-body">
                <div className="listing-unconfirmed-body-inner">
                  <ul>{unconfirmed.map((point) => <li key={point}>{point}</li>)}</ul>
                  <small>These came from the photo-based draft and the seller has not answered them yet. Message them if any matter to you.</small>
                </div>
              </div>
            </div>
          </aside>
        ) : null}
      </TextSizeSection>
      <AdSlot placement="product_detail_middle" />
      {!isBargainListing ? <section className="listing-detail-mobile-seller listing-detail-mobile-only">
        <div className="listing-detail-mobile-seller-profile"><span className={`listing-detail-mobile-seller-avatar-wrap ${isSellerOnline ? "is-online" : "is-offline"}`} role="status" aria-label={isSellerOnline ? "Seller is online" : "Seller is offline"}><Avatar src={listing.seller.avatarUrl} name={listing.seller.name} className="listing-detail-mobile-seller-avatar" /></span><div><strong>{listing.seller.name}</strong><span><i className="ti ti-star" aria-hidden="true" /> {ratingLabel}</span><small>Local member</small></div><div className="listing-detail-mobile-seller-actions">{listing.seller.id ? <Link href={`/market/sellers/${listing.seller.id}`} aria-label="View seller profile" title="View profile"><i className="ti ti-user" aria-hidden="true" /></Link> : null}{!isOwner ? <ListingSafetyActions listingId={listing.id} sellerId={listing.ownerId} sellerProfileVariant iconOnly /> : null}</div></div>
      </section> : null}

      <ListingComments listingId={listing.id} textSizeStep={descriptionTextSizeStep} space={space} />
      {!isBargainListing ? <AdSlot placement="product_detail_bottom" /> : null}

      {messageError ? <p className="listing-detail-mobile-message-error listing-detail-mobile-only" role="alert">{messageError}</p> : null}
      {isOfferDialogOpen ? <DialogOverlay className="listing-offer-backdrop" aria-labelledby="listing-offer-title" onClose={() => setIsOfferDialogOpen(false)} isDismissible={!isSubmittingOffer}><section className="listing-offer-dialog"><div className="listing-offer-dialog-icon"><i className="ti ti-heart-handshake" aria-hidden="true" /></div><h2 id="listing-offer-title">{isBargainListing ? "Request to buy" : "Make an offer"}</h2><p>{isBargainListing ? `This item has a fixed price of ${listing.price}. Send your request to the seller, and they can accept or decline it from this listing.` : "Send a clear price to the seller. If they accept, you can confirm the trade and both members receive trust points."}</p>{!isBargainListing ? <label><span>Offer amount</span><input type="number" min="0" step="0.01" inputMode="decimal" value={offerAmount} onChange={(event) => setOfferAmount(event.target.value)} /></label> : null}<label><span>Message (optional)</span><textarea value={offerNote} maxLength={500} rows={3} placeholder="Pickup time, delivery note, or anything useful..." onChange={(event) => setOfferNote(event.target.value)} /></label>{offerError ? <p className="listing-offer-error" role="alert">{offerError}</p> : null}<div><button type="button" onClick={() => setIsOfferDialogOpen(false)} disabled={isSubmittingOffer}>Cancel</button><button type="button" className="listing-offer-submit" onClick={() => void submitOffer()} disabled={isSubmittingOffer}>{isSubmittingOffer ? "Sending..." : isBargainListing ? "Send request" : "Send offer"}</button></div></section></DialogOverlay> : null}
      {isDeleteDialogOpen ? <DialogOverlay className="listing-delete-backdrop" aria-labelledby="listing-delete-title" onClose={() => setIsDeleteDialogOpen(false)} isDismissible={!isDeleting}><section className={`listing-delete-dialog ${isDeleteAnimating ? "is-deleting" : ""}`}><div className="listing-delete-dialog-icon"><i className="ti ti-trash" aria-hidden="true" /></div>{isDeleteAnimating ? <span className="listing-delete-particles" aria-hidden="true">{Array.from({ length: 10 }, (_, index) => <i className="ti ti-trash" key={index} />)}</span> : null}<h2 id="listing-delete-title">Delete this listing?</h2><p>This cannot be undone. The listing and its photos will be permanently removed.</p>{deleteError ? <p className="listing-delete-error" role="alert">{deleteError}</p> : null}<div><button type="button" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleting}>Cancel</button><button type="button" className="listing-delete-confirm" onClick={() => void deleteListing()} disabled={isDeleting}>{isDeleting ? "Deleting..." : "Delete listing"}</button></div></section></DialogOverlay> : null}
    </main>
  );
}
