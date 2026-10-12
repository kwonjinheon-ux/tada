"use client";

import { useRef, type ReactNode } from "react";
import { TranslatedText, useLanguage, type TranslationKey } from "@/components/LanguageProvider";

const JOURNEY_STAGES = ["offer", "pending", "accepted", "complete"] as const;
type JourneyStage = (typeof JOURNEY_STAGES)[number];

type BuyingJourney = {
  id: string;
  role: "buying";
  title: string;
  imageUrl: string | null;
  stage: JourneyStage;
  statusLabel: string;
  meetingLabel?: string | null;
  conversationHref: string;
};

type SellingJourney = {
  id: string;
  role: "selling";
  title: string;
  imageUrl: string | null;
  newOfferCount: number;
  bestOfferLabel: string;
  totalViews: number;
  reviewHref: string;
  listingPriceLabel?: string;
  listingStatus?: "published" | "pending";
};

export type ActiveJourneyItem = BuyingJourney | SellingJourney;

const stageLabelKey: Record<JourneyStage, "journeyOffer" | "journeyPending" | "journeyAccepted" | "journeyComplete"> = {
  offer: "journeyOffer",
  pending: "journeyPending",
  accepted: "journeyAccepted",
  complete: "journeyComplete",
};

function JourneyStepper({ stage }: { stage: JourneyStage }) {
  const currentIndex = JOURNEY_STAGES.indexOf(stage);
  return <ProgressStepper steps={JOURNEY_STAGES.map((step) => <TranslatedText key={step} translationKey={stageLabelKey[step]} />)} currentIndex={currentIndex} ariaLabel="Trade progress" />;
}

export function ProgressStepper({ steps, currentIndex, ariaLabel }: { steps: ReactNode[]; currentIndex: number; ariaLabel: string }) {
  const boundedIndex = Math.max(0, Math.min(currentIndex, steps.length - 1));
  const progressPercent = steps.length > 1 ? (boundedIndex / (steps.length - 1)) * 100 : 100;
  return (
    <div className="journey-stepper" role="img" aria-label={ariaLabel}>
      <div className="journey-stepper-track"><span style={{ width: `${progressPercent}%` }} /></div>
      <ol>
        {steps.map((step, index) => (
          <li key={index} className={index < boundedIndex ? "is-done" : index === boundedIndex ? "is-current" : "is-upcoming"} aria-current={index === boundedIndex ? "step" : undefined}>
            <i className={index < boundedIndex ? "ms ms-check" : ""} aria-hidden="true" />
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function JourneyThumbnail({ imageUrl }: { imageUrl: string | null }) {
  return imageUrl ? <img className="journey-thumbnail" src={imageUrl} alt="" /> : <span className="journey-thumbnail"><i className="ms ms-image" aria-hidden="true" /></span>;
}

export function JourneyCard({ item, sectionLabel }: { item: ActiveJourneyItem; sectionLabel?: string }) {
  const { locale } = useLanguage();
  const ko = locale === "ko";
  if (item.role === "buying") {
    return (
      <article className="journey-card is-buying">
        {sectionLabel ? <span className="my-page-tag journey-section-label"><i className="ms ms-storefront" aria-hidden="true" />{sectionLabel}</span> : null}
        <div className="journey-card-top">
          <JourneyThumbnail imageUrl={item.imageUrl} />
          <div>
            {!sectionLabel ? <em><TranslatedText translationKey="buying" /></em> : null}
            <h3>{item.title}</h3>
            <p><i className="ms ms-check-circle" aria-hidden="true" />{item.statusLabel}</p>
          </div>
        </div>
        <JourneyStepper stage={item.stage} />
        {item.meetingLabel ? (
          <div className="journey-card-footer">
            <span><i className="ms ms-calendar-today" aria-hidden="true" />{item.meetingLabel}</span>
            <a href={item.conversationHref}><TranslatedText translationKey="openConversation" /></a>
          </div>
        ) : (
          <a className="journey-card-action" href={item.conversationHref}><TranslatedText translationKey="openConversation" /><i className="ms ms-chevron-right" aria-hidden="true" /></a>
        )}
      </article>
    );
  }
  return (
    <article className="journey-card is-selling">
      {sectionLabel ? <span className="my-page-tag journey-section-label"><i className="ms ms-storefront" aria-hidden="true" />{sectionLabel}</span> : null}
      <div className="journey-card-top">
        <JourneyThumbnail imageUrl={item.imageUrl} />
        <div>
          {!sectionLabel ? <em><TranslatedText translationKey="selling" /></em> : null}
          <h3>{item.title}</h3>
          {item.listingPriceLabel ? <p className="journey-listing-price">{item.listingPriceLabel}</p> : null}
          {item.newOfferCount ? <p><i className="ms ms-info" aria-hidden="true" />{item.newOfferCount} <TranslatedText translationKey="newOffers" /></p> : null}
        </div>
      </div>
      <ProgressStepper
        steps={ko ? ["등록", item.listingStatus === "pending" ? "검토" : "판매", "제안", "완료"] : ["Listed", item.listingStatus === "pending" ? "Review" : "For sale", "Offer", "Complete"]}
        currentIndex={item.newOfferCount > 0 ? 2 : 1}
        ariaLabel={ko ? `현재 ${item.newOfferCount > 0 ? "제안" : item.listingStatus === "pending" ? "검토" : "판매"} 단계` : `Currently at ${item.newOfferCount > 0 ? "offer" : item.listingStatus === "pending" ? "review" : "for sale"}`}
      />
      {item.listingStatus ? <p className="journey-listing-status"><i className={`ms ${item.listingStatus === "published" ? "ms-check-circle" : "ms-calendar-today"}`} aria-hidden="true" />{item.listingStatus === "published" ? (ko ? "판매 중" : "For sale") : (ko ? "검토 중" : "Under review")}</p> : <div className="journey-stats">
        <div><span><TranslatedText translationKey="bestOffer" /></span><strong>{item.bestOfferLabel}</strong></div>
        <div><span><TranslatedText translationKey="totalViews" /></span><strong>{item.totalViews}</strong></div>
      </div>}
      <a className="journey-card-action" href={item.reviewHref}>{item.listingStatus && !item.newOfferCount ? (ko ? "상품 관리" : "Manage listing") : <TranslatedText translationKey="reviewOffers" />}<i className="ms ms-chevron-right" aria-hidden="true" /></a>
    </article>
  );
}

function JourneyRow({ role, labelKey, items }: { role: "buying" | "selling"; labelKey: TranslationKey; items: ActiveJourneyItem[] }) {
  const { t } = useLanguage();
  const trackRef = useRef<HTMLDivElement>(null);

  const scrollByCard = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector<HTMLElement>(".journey-card");
    const step = (card?.offsetWidth ?? track.clientWidth) + 16;
    track.scrollBy({ left: direction * step, behavior: "smooth" });
  };

  return (
    <div className={`journey-row is-${role}`}>
      <header className="journey-row-heading">
        <h3>
          <TranslatedText translationKey={labelKey} />
          <span>{items.length}</span>
        </h3>
        {items.length > 1 ? (
          <div className="active-journey-nav">
            <button type="button" aria-label={t("previousJourney")} onClick={() => scrollByCard(-1)}><i className="ms ms-chevron-left" aria-hidden="true" /></button>
            <button type="button" aria-label={t("nextJourney")} onClick={() => scrollByCard(1)}><i className="ms ms-chevron-right" aria-hidden="true" /></button>
          </div>
        ) : null}
      </header>
      <div className="active-journey-track" ref={trackRef}>
        {items.map((item) => <JourneyCard item={item} key={item.id} />)}
      </div>
    </div>
  );
}

export function ActiveJourneyCarousel({ items }: { items: ActiveJourneyItem[] }) {
  const { t } = useLanguage();
  if (!items.length) return null;

  const buying = items.filter((item): item is BuyingJourney => item.role === "buying");
  const selling = items.filter((item): item is SellingJourney => item.role === "selling");

  return (
    <section className="active-journey" aria-label={t("activeJourney")}>
      <h2>{t("activeJourney")}</h2>
      {buying.length ? <JourneyRow role="buying" labelKey="buying" items={buying} /> : null}
      {selling.length ? <JourneyRow role="selling" labelKey="selling" items={selling} /> : null}
    </section>
  );
}
