"use client";

import { useRef } from "react";
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
  const progressPercent = (currentIndex / (JOURNEY_STAGES.length - 1)) * 100;
  return (
    <div className="journey-stepper">
      <div className="journey-stepper-track"><span style={{ width: `${progressPercent}%` }} /></div>
      <ol>
        {JOURNEY_STAGES.map((step, index) => (
          <li key={step} className={index <= currentIndex ? "is-done" : index === currentIndex + 1 ? "is-next" : "is-upcoming"}>
            <i className={index <= currentIndex ? "ms ms-check" : ""} aria-hidden="true" />
            <span><TranslatedText translationKey={stageLabelKey[step]} /></span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function JourneyThumbnail({ imageUrl }: { imageUrl: string | null }) {
  return imageUrl ? <img className="journey-thumbnail" src={imageUrl} alt="" /> : <span className="journey-thumbnail"><i className="ms ms-image" aria-hidden="true" /></span>;
}

function JourneyCard({ item }: { item: ActiveJourneyItem }) {
  if (item.role === "buying") {
    return (
      <article className="journey-card is-buying">
        <div className="journey-card-top">
          <JourneyThumbnail imageUrl={item.imageUrl} />
          <div>
            <em><TranslatedText translationKey="buying" /></em>
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
      <div className="journey-card-top">
        <JourneyThumbnail imageUrl={item.imageUrl} />
        <div>
          <em><TranslatedText translationKey="selling" /></em>
          <h3>{item.title}</h3>
          {item.newOfferCount ? <p><i className="ms ms-info" aria-hidden="true" />{item.newOfferCount} <TranslatedText translationKey="newOffers" /></p> : null}
        </div>
      </div>
      <div className="journey-stats">
        <div><span><TranslatedText translationKey="bestOffer" /></span><strong>{item.bestOfferLabel}</strong></div>
        <div><span><TranslatedText translationKey="totalViews" /></span><strong>{item.totalViews}</strong></div>
      </div>
      <a className="journey-card-action" href={item.reviewHref}><TranslatedText translationKey="reviewOffers" /><i className="ms ms-chevron-right" aria-hidden="true" /></a>
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
