"use client";

import { useRef } from "react";
import { TranslatedText, useLanguage } from "@/components/LanguageProvider";

const JOURNEY_STAGES = ["offer", "accepted", "meet", "complete"] as const;
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

const stageLabelKey: Record<JourneyStage, "journeyOffer" | "journeyAccepted" | "journeyMeet" | "journeyComplete"> = {
  offer: "journeyOffer",
  accepted: "journeyAccepted",
  meet: "journeyMeet",
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
            <i className={index <= currentIndex ? "fa-solid fa-check" : ""} aria-hidden="true" />
            <span><TranslatedText translationKey={stageLabelKey[step]} /></span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function JourneyThumbnail({ title, imageUrl }: { title: string; imageUrl: string | null }) {
  return imageUrl ? <img className="journey-thumbnail" src={imageUrl} alt="" /> : <span className="journey-thumbnail"><i className="fa-regular fa-image" aria-hidden="true" /></span>;
}

export function ActiveJourneyCarousel({ items }: { items: ActiveJourneyItem[] }) {
  const { t } = useLanguage();
  const trackRef = useRef<HTMLDivElement>(null);

  if (!items.length) return null;

  const scrollByCard = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector<HTMLElement>(".journey-card");
    const step = (card?.offsetWidth ?? track.clientWidth) + 16;
    track.scrollBy({ left: direction * step, behavior: "smooth" });
  };

  return (
    <section className="active-journey" aria-label={t("activeJourney")}>
      <header className="active-journey-heading">
        <h2><TranslatedText translationKey="activeJourney" /></h2>
        <div className="active-journey-nav">
          <button type="button" aria-label={t("previousJourney")} onClick={() => scrollByCard(-1)}><i className="fa-solid fa-chevron-left" aria-hidden="true" /></button>
          <button type="button" aria-label={t("nextJourney")} onClick={() => scrollByCard(1)}><i className="fa-solid fa-chevron-right" aria-hidden="true" /></button>
        </div>
      </header>
      <div className="active-journey-track" ref={trackRef}>
        {items.map((item) => item.role === "buying" ? (
          <article className="journey-card is-buying" key={item.id}>
            <div className="journey-card-top">
              <JourneyThumbnail title={item.title} imageUrl={item.imageUrl} />
              <div>
                <em><TranslatedText translationKey="buying" /></em>
                <h3>{item.title}</h3>
                <p><i className="fa-solid fa-circle-check" aria-hidden="true" />{item.statusLabel}</p>
              </div>
            </div>
            <JourneyStepper stage={item.stage} />
            {item.meetingLabel ? (
              <div className="journey-card-footer">
                <span><i className="fa-regular fa-calendar" aria-hidden="true" />{item.meetingLabel}</span>
                <a href={item.conversationHref}><TranslatedText translationKey="openConversation" /></a>
              </div>
            ) : (
              <a className="journey-card-action" href={item.conversationHref}><TranslatedText translationKey="openConversation" /><i className="fa-solid fa-chevron-right" aria-hidden="true" /></a>
            )}
          </article>
        ) : (
          <article className="journey-card is-selling" key={item.id}>
            <div className="journey-card-top">
              <JourneyThumbnail title={item.title} imageUrl={item.imageUrl} />
              <div>
                <em><TranslatedText translationKey="selling" /></em>
                <h3>{item.title}</h3>
                {item.newOfferCount ? <p><i className="fa-solid fa-circle-info" aria-hidden="true" />{item.newOfferCount} <TranslatedText translationKey="newOffers" /></p> : null}
              </div>
            </div>
            <div className="journey-stats">
              <div><span><TranslatedText translationKey="bestOffer" /></span><strong>{item.bestOfferLabel}</strong></div>
              <div><span><TranslatedText translationKey="totalViews" /></span><strong>{item.totalViews}</strong></div>
            </div>
            <a className="journey-card-action" href={item.reviewHref}><TranslatedText translationKey="reviewOffers" /><i className="fa-solid fa-chevron-right" aria-hidden="true" /></a>
          </article>
        ))}
      </div>
    </section>
  );
}
