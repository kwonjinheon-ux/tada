"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { marketConversationResponseSchema, marketWishlistResponseSchema } from "@/contracts/api";
import { createHeartParticles, SaveHeartBurst, saveFeedbackClasses, type HeartParticle } from "@/components/SaveHeartBurst";
import { ListingComments } from "@/components/market/ListingComments";
import { ListingSafetyActions } from "@/components/market/ListingSafetyActions";
import { DialogOverlay } from "@/components/ui/DialogOverlay";
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

export function ListingDetailClient({ listing, initialIsSaved = false, isOwner = false, descriptionTextSizeStep = 0 }: { listing: ListingDetail; initialIsSaved?: boolean; isOwner?: boolean; descriptionTextSizeStep?: number }) {
  const router = useRouter();
  const [activeImage, setActiveImage] = useState(0);
  const [imageTransition, setImageTransition] = useState<"next" | "previous">("next");
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [viewCount, setViewCount] = useState(listing.viewCount);
  const [isSaved, setIsSaved] = useState(initialIsSaved);
  const [isPopping, setIsPopping] = useState(false);
  const [heartParticles, setHeartParticles] = useState<HeartParticle[]>([]);
  const [isOpeningMessage, setIsOpeningMessage] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [isOfferDialogOpen, setIsOfferDialogOpen] = useState(false);
  const [offerAmount, setOfferAmount] = useState(() => (listing.priceCents / 100).toString());
  const [offerNote, setOfferNote] = useState("");
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);
  const [offerError, setOfferError] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteAnimating, setIsDeleteAnimating] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isSellerOnline, setIsSellerOnline] = useState(false);
  const burstTimer = useRef<number | null>(null);
  const swipeStartX = useRef<number | null>(null);
  const paragraphs = useMemo(() => descriptionParagraphs(listing.description), [listing.description]);
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

  useEffect(() => () => {
    if (burstTimer.current) window.clearTimeout(burstTimer.current);
  }, []);

  useEffect(() => {
    router.prefetch("/market/dashboard/messages");
  }, [router]);

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
    void fetch(`/api/market/listings/${listing.id}/view`, { method: "POST", cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<{ viewCount?: number }> : null)
      .then((payload) => { if (typeof payload?.viewCount === "number") setViewCount(payload.viewCount); })
      .catch(() => undefined);
  }, [listing.id]);

  useEffect(() => {
    if (isOwner) return;
    let isCurrent = true;
    void fetch(`/api/market/wishlist?listingId=${encodeURIComponent(listing.id)}`)
      .then((response) => readApiResponse(response, marketWishlistResponseSchema))
      .then((result) => { if (isCurrent && result.data) setIsSaved(result.data.saved); })
      .catch(() => undefined);
    return () => { isCurrent = false; };
  }, [isOwner, listing.id]);

  const showImage = (index: number) => {
    const nextImage = (index + listing.images.length) % listing.images.length;
    if (nextImage === activeImage) return;
    setImageTransition(index > activeImage ? "next" : "previous");
    setActiveImage(nextImage);
  };
  const saveListing = async () => {
    const nextSaved = !isSaved;
    setIsSaved(nextSaved);
    setIsPopping(false);
    setHeartParticles(createHeartParticles());
    window.requestAnimationFrame(() => setIsPopping(true));
    if (burstTimer.current) window.clearTimeout(burstTimer.current);
    burstTimer.current = window.setTimeout(() => setHeartParticles([]), 1_050);
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
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(window.location.href);
      } else {
        const copyTarget = document.createElement("textarea");
        copyTarget.value = window.location.href;
        copyTarget.setAttribute("readonly", "");
        copyTarget.style.position = "fixed";
        copyTarget.style.opacity = "0";
        document.body.append(copyTarget);
        copyTarget.select();
        const copied = document.execCommand("copy");
        copyTarget.remove();
        if (!copied) throw new Error("Copy command was unavailable");
      }
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
    if (!Number.isFinite(amount) || amount < 0 || amountCents < 0) {
      setOfferError("Enter a valid offer amount.");
      return;
    }
    setIsSubmittingOffer(true);
    setOfferError(null);
    try {
      const requestBody = JSON.stringify({ listingId: listing.id, amountCents, note: offerNote });
      let response: Response | null = null;
      let payload: { conversationId?: string; error?: string } | null = null;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        response = await fetch("/api/market/offers", {
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
      if (!response.ok || !payload?.conversationId) {
        setOfferError(payload?.error ?? "Unable to make an offer right now.");
        return;
      }
      setIsOfferDialogOpen(false);
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

  const prepareMessaging = () => router.prefetch("/market/dashboard/messages");
  const editListing = () => router.push(`/market/${listing.id}/edit`);
  const deleteListing = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    setDeleteError(null);
    let wasDeleted = false;
    try {
      const response = await fetch(`/api/market/listings/${listing.id}`, { method: "DELETE" });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) {
        setDeleteError(payload?.error ?? "Unable to delete this listing right now.");
        return;
      }
      wasDeleted = true;
      setIsDeleteAnimating(true);
      window.setTimeout(() => {
        router.push("/market");
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
  }, [isOwner, isSaved]);

  return (
    <main className={`listing-detail-page ${listing.status === "sold" ? "is-sold" : ""}`}>
      <div className="listing-detail-back-row">
        <Link className="listing-detail-back" href="/market"><i className="fa-solid fa-arrow-left" aria-hidden="true" /> Back to listings</Link>
        {listing.category ? <nav className="listing-detail-category-path" aria-label="Listing category"><Link href={listing.category.href}>{listing.category.label}</Link>{listing.category.subcategory ? <><span aria-hidden="true">/</span><Link href={listing.category.subcategory.href}>{listing.category.subcategory.label}</Link></> : null}</nav> : null}
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
            {listing.images.length > 1 ? <><button className="listing-detail-gallery-arrow is-previous" type="button" aria-label="Previous photo" onClick={(event) => { event.stopPropagation(); showImage(activeImage - 1); }}><i className="fa-solid fa-chevron-left" aria-hidden="true" /></button><button className="listing-detail-gallery-arrow is-next" type="button" aria-label="Next photo" onClick={(event) => { event.stopPropagation(); showImage(activeImage + 1); }}><i className="fa-solid fa-chevron-right" aria-hidden="true" /></button></> : null}
            <span className="listing-detail-image-count"><i className="fa-regular fa-images" aria-hidden="true" /> {listing.images.length}</span>
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
              <div className="listing-detail-status-row"><span className={`listing-status status-${listing.status}`}>{statusLabel[listing.status]}</span><span>{listing.createdAt}</span></div>
              <h1>{listing.title}</h1>
            </div>
            {isOwner ? <button className="listing-detail-save listing-detail-delete" type="button" aria-label="Delete listing" onClick={() => { setDeleteError(null); setIsDeleteDialogOpen(true); }}><i className="fa-solid fa-trash-can" aria-hidden="true" /></button> : <button className={`listing-detail-save save-button ${saveFeedbackClasses.root} ${isSaved ? "is-saved" : ""} ${isPopping ? saveFeedbackClasses.popping : ""}`} type="button" aria-label={isSaved ? "Remove from saved items" : "Save listing"} aria-pressed={isSaved} onClick={() => void saveListing()} onAnimationEnd={(event) => { if (event.currentTarget === event.target) setIsPopping(false); }}><i className={`${isSaved ? "fa-solid" : "fa-regular"} fa-heart`} aria-hidden="true" /><SaveHeartBurst particles={heartParticles} /></button>}
          </div>
          <strong className="listing-detail-price">{listing.price}</strong>
          <p className="listing-detail-location"><i className="fa-solid fa-location-dot" aria-hidden="true" /> {listing.location}</p>

          <div className="listing-detail-actions">
            {isOwner ? <><button type="button" className="listing-detail-message" disabled title="Mark as sold is coming soon"><i className="fa-solid fa-tag" aria-hidden="true" /> Mark as sold</button><button type="button" className="listing-detail-offer" onClick={editListing}><i className="fa-solid fa-pen-to-square" aria-hidden="true" /> Edit listing</button></> : <><button type="button" className="listing-detail-message" onPointerEnter={prepareMessaging} onFocus={prepareMessaging} onClick={() => void openConversation()} disabled={isOpeningMessage}><i className="fa-regular fa-message" aria-hidden="true" /> {isOpeningMessage ? "Opening chat..." : "Message"}</button><button type="button" className="listing-detail-offer" onClick={openOfferDialog}><i className="fa-solid fa-tag" aria-hidden="true" /> Make an offer</button></>}
          </div>
          {messageError ? <p className="listing-detail-message-error" role="alert">{messageError}</p> : null}

          <dl className="listing-detail-facts">
            <div><dt>Condition</dt><dd>{listing.condition}</dd></div>
            <div><dt>Delivery</dt><dd>{listing.tradeMethod}</dd></div>
            {listing.meetingPlace ? <div><dt>Meet at</dt><dd>{listing.meetingPlace}</dd></div> : null}
          </dl>

          <section className="listing-detail-seller-card">
            <div className="listing-detail-seller">
              <span className={`listing-detail-seller-avatar-wrap ${isSellerOnline ? "is-online" : "is-offline"}`} role="status" aria-label={isSellerOnline ? "Seller is online" : "Seller is offline"}>{listing.seller.avatarUrl ? <img className="listing-detail-seller-avatar" src={listing.seller.avatarUrl} alt="" /> : <span className="listing-detail-seller-avatar">{listing.seller.name.charAt(0).toUpperCase()}</span>}</span>
              <div><strong>{listing.seller.name}</strong><span>{ratingLabel}</span></div>
              {listing.seller.id ? <Link className="listing-detail-seller-profile-link" href={`/market/sellers/${listing.seller.id}`} aria-label="View seller profile" title="View seller profile"><i className="fa-regular fa-user" aria-hidden="true" /></Link> : null}
            </div>
            {!isOwner ? <ListingSafetyActions listingId={listing.id} sellerId={listing.ownerId} /> : null}
          </section>
        </aside>
      </div>

      {isGalleryOpen ? <div className="listing-gallery-lightbox" role="dialog" aria-modal="true" aria-label={`${listing.title} photo gallery`}>
        <Image className="listing-gallery-lightbox-backdrop" src={image.src} alt="" fill aria-hidden="true" sizes="100vw" onClick={() => setIsGalleryOpen(false)} />
        <button className="listing-gallery-lightbox-close" type="button" aria-label="Close photo gallery" onClick={() => setIsGalleryOpen(false)}><i className="fa-solid fa-xmark" aria-hidden="true" /></button>
        <div className="listing-gallery-lightbox-stage" onClick={(event) => { if (event.target === event.currentTarget) setIsGalleryOpen(false); }}>
          <Image key={`lightbox-${image.src}-${activeImage}`} className="listing-gallery-lightbox-photo" src={image.src} alt={image.alt} fill priority sizes="100vw" />
        </div>
        {listing.images.length > 1 ? <><button className="listing-gallery-lightbox-arrow is-previous" type="button" aria-label="Previous photo" onClick={() => showImage(activeImage - 1)}><i className="fa-solid fa-chevron-left" aria-hidden="true" /></button><button className="listing-gallery-lightbox-arrow is-next" type="button" aria-label="Next photo" onClick={() => showImage(activeImage + 1)}><i className="fa-solid fa-chevron-right" aria-hidden="true" /></button></> : null}
        <span className="listing-gallery-lightbox-count">{activeImage + 1} / {listing.images.length}</span>
      </div> : null}

      <section className={`listing-detail-mobile-meta listing-detail-mobile-only ${listing.images.length > 1 ? "has-photo-stack" : ""}`}>
        <div className="listing-detail-mobile-dots" aria-label={`Photo ${activeImage + 1} of ${listing.images.length}`}>{listing.images.map((photo, index) => <span className={index === activeImage ? "is-active" : ""} key={photo.src} />)}</div>
        <h1>{listing.title}</h1>
        <div className="listing-detail-mobile-price-row"><strong>{listing.price}</strong><span className={`listing-status status-${listing.status}`}>{statusLabel[listing.status]}</span></div>
        <div className="listing-detail-mobile-location-row"><span><i className="fa-solid fa-location-dot" aria-hidden="true" /> {listing.location}</span><div className="listing-detail-mobile-stats"><span><i className="fa-regular fa-eye" aria-hidden="true" /> {new Intl.NumberFormat("en-NZ").format(viewCount)}</span><time>{listing.createdAt}</time></div></div>
      </section>

      <TextSizeSection className="listing-detail-description" title="Description" sizeStep={descriptionTextSizeStep}>
        {paragraphs.length ? paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>) : <p>The seller has not added further details yet.</p>}
      </TextSizeSection>
      <AdSlot placement="product_detail_middle" />
      <section className="listing-detail-mobile-seller listing-detail-mobile-only">
        <div className="listing-detail-mobile-seller-profile"><span className={`listing-detail-mobile-seller-avatar-wrap ${isSellerOnline ? "is-online" : "is-offline"}`} role="status" aria-label={isSellerOnline ? "Seller is online" : "Seller is offline"}>{listing.seller.avatarUrl ? <img className="listing-detail-mobile-seller-avatar" src={listing.seller.avatarUrl} alt="" /> : <span className="listing-detail-mobile-seller-avatar">{listing.seller.name.charAt(0).toUpperCase()}</span>}</span><div><strong>{listing.seller.name}</strong><span><i className="fa-regular fa-star" aria-hidden="true" /> {ratingLabel}</span><small>Local member</small></div><div className="listing-detail-mobile-seller-actions">{listing.seller.id ? <Link href={`/market/sellers/${listing.seller.id}`} aria-label="View seller profile" title="View profile"><i className="fa-regular fa-user" aria-hidden="true" /></Link> : null}{!isOwner ? <ListingSafetyActions listingId={listing.id} sellerId={listing.ownerId} sellerProfileVariant iconOnly /> : null}</div></div>
      </section>

      <ListingComments listingId={listing.id} textSizeStep={descriptionTextSizeStep} />
      <AdSlot placement="product_detail_bottom" />

      {messageError ? <p className="listing-detail-mobile-message-error listing-detail-mobile-only" role="alert">{messageError}</p> : null}
      {isOfferDialogOpen ? <DialogOverlay className="listing-offer-backdrop" aria-labelledby="listing-offer-title" onClose={() => setIsOfferDialogOpen(false)} isDismissible={!isSubmittingOffer}><section className="listing-offer-dialog"><div className="listing-offer-dialog-icon"><i className="fa-solid fa-handshake" aria-hidden="true" /></div><h2 id="listing-offer-title">Make an offer</h2><p>Send a clear price to the seller. If they accept, you can confirm the trade and both members receive trust points.</p><label><span>Offer amount</span><input type="number" min="0" step="0.01" inputMode="decimal" value={offerAmount} onChange={(event) => setOfferAmount(event.target.value)} /></label><label><span>Message</span><textarea value={offerNote} maxLength={500} rows={3} placeholder="Pickup time, delivery note, or anything useful..." onChange={(event) => setOfferNote(event.target.value)} /></label>{offerError ? <p className="listing-offer-error" role="alert">{offerError}</p> : null}<div><button type="button" onClick={() => setIsOfferDialogOpen(false)} disabled={isSubmittingOffer}>Cancel</button><button type="button" className="listing-offer-submit" onClick={() => void submitOffer()} disabled={isSubmittingOffer}>{isSubmittingOffer ? "Sending..." : "Send offer"}</button></div></section></DialogOverlay> : null}
      {isDeleteDialogOpen ? <DialogOverlay className="listing-delete-backdrop" aria-labelledby="listing-delete-title" onClose={() => setIsDeleteDialogOpen(false)} isDismissible={!isDeleting}><section className={`listing-delete-dialog ${isDeleteAnimating ? "is-deleting" : ""}`}><div className="listing-delete-dialog-icon"><i className="fa-solid fa-trash-can" aria-hidden="true" /></div>{isDeleteAnimating ? <span className="listing-delete-particles" aria-hidden="true">{Array.from({ length: 10 }, (_, index) => <i className="fa-solid fa-trash-can" key={index} />)}</span> : null}<h2 id="listing-delete-title">Delete this listing?</h2><p>This cannot be undone. The listing and its photos will be permanently removed.</p>{deleteError ? <p className="listing-delete-error" role="alert">{deleteError}</p> : null}<div><button type="button" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleting}>Cancel</button><button type="button" className="listing-delete-confirm" onClick={() => void deleteListing()} disabled={isDeleting}>{isDeleting ? "Deleting..." : "Delete listing"}</button></div></section></DialogOverlay> : null}
    </main>
  );
}
