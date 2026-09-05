"use client";

import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import { formatMarketPrice } from "@/lib/market/format-price";
import { formatGroupBuyCardDate, getGroupBuyClosingDays } from "@/lib/groupbuy/format-groupbuy-date";
import { groupBuyText, type GroupBuy } from "@/data/groupBuy";

/** One campaign in the browse grid. Same shape as the Services directory card —
 *  media, identity, the two numbers that decide it, then the actions — so the
 *  two browse surfaces read as one product. */
export function GroupBuyCard({ groupBuy, isPreview = false }: { groupBuy: GroupBuy; isPreview?: boolean }) {
  const { locale } = useLanguage();
  const text = groupBuyText(locale);
  const cheapest = Math.min(...groupBuy.items.map((item) => item.priceCents));
  const closingDays = getGroupBuyClosingDays(groupBuy.closesAt);
  const closingLabel = closingDays === null ? null : locale === "ko" ? `+${closingDays}일` : `+${closingDays} day${closingDays === 1 ? "" : "s"}`;
  const cardClosesDate = groupBuy.closesAt ? formatGroupBuyCardDate(groupBuy.closesAt, locale) : groupBuy.closesLabel;
  const cardHandoverDate = groupBuy.handoverAt ? formatGroupBuyCardDate(groupBuy.handoverAt, locale) : groupBuy.handoverLabel;
  const cardClosesDateWithoutYear = groupBuy.closesAt ? formatGroupBuyCardDate(groupBuy.closesAt, locale, false) : groupBuy.closesLabel;
  const cardHandoverDateWithoutYear = groupBuy.handoverAt ? formatGroupBuyCardDate(groupBuy.handoverAt, locale, false) : groupBuy.handoverLabel;

  return (
    <article className={`groupbuy-card ui-card is-${groupBuy.status}`}>
      <Link className="groupbuy-card-media" href={`/market/groupbuy/${groupBuy.id}`} aria-label={groupBuy.title}>
        <Image src={groupBuy.coverImage} alt={groupBuy.coverAlt} fill sizes="(max-width: 767.98px) 116px, (max-width: 1199.98px) 33vw, 400px" unoptimized={isPreview} />
        <span className={`groupbuy-status is-${groupBuy.status}`}>{text.status[groupBuy.status]}</span>
      </Link>
      <Link className="groupbuy-card-body" href={`/market/groupbuy/${groupBuy.id}`}>
        <header>
          <h3><Link href={`/market/groupbuy/${groupBuy.id}`}>{groupBuy.title}</Link></h3>
          <p className="groupbuy-card-seller"><i className="ms ms-storefront" aria-hidden="true" />{groupBuy.seller.name} · {groupBuy.seller.location}</p>
        </header>
        <p className="groupbuy-card-summary">{groupBuy.summary}</p>
        <dl className="groupbuy-card-facts">
          <div><dt>{text.closesAt}</dt><dd><span className="groupbuy-date-full">{cardClosesDate}</span><span className="groupbuy-date-mobile">{cardClosesDateWithoutYear}</span></dd></div>
          <div><dt>{text.handover}</dt><dd><span className="groupbuy-date-full">{cardHandoverDate}</span><span className="groupbuy-date-mobile">{cardHandoverDateWithoutYear}</span></dd></div>
        </dl>
        <div className="groupbuy-card-tags">
          {groupBuy.pickup.available ? <span className="groupbuy-tag is-pickup"><i className="ms ms-storefront" aria-hidden="true" />{text.pickup}</span> : null}
          {groupBuy.delivery.available
            ? <span className="groupbuy-tag is-delivery"><i className="ms ms-local-shipping" aria-hidden="true" />{text.delivery} {formatMarketPrice(groupBuy.delivery.feeCents)}</span>
            : <span className="groupbuy-tag is-pickup-only">{text.pickupOnly}</span>}
          <span className="groupbuy-tag is-participants"><i className="ms ms-groups" aria-hidden="true" />{text.participants(groupBuy.participantCount)}</span>
        </div>
        <p className="groupbuy-card-price"><small>{locale === "ko" ? "최저" : "From"}</small><strong>{formatMarketPrice(cheapest)}</strong>{closingLabel ? <span className="groupbuy-card-countdown">{closingLabel}</span> : null}</p>
      </Link>
    </article>
  );
}
