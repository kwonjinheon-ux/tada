"use client";

import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import { formatMarketPrice } from "@/lib/market/format-price";
import { groupBuyText, type GroupBuy } from "@/data/groupBuy";

/** One campaign in the browse grid. Same shape as the Services directory card —
 *  media, identity, the two numbers that decide it, then the actions — so the
 *  two browse surfaces read as one product. */
export function GroupBuyCard({ groupBuy }: { groupBuy: GroupBuy }) {
  const { locale } = useLanguage();
  const text = groupBuyText(locale);
  const cheapest = Math.min(...groupBuy.items.map((item) => item.priceCents));

  return (
    <article className="groupbuy-card ui-card">
      <Link className="groupbuy-card-media" href={`/market/groupbuy/${groupBuy.id}`} aria-label={groupBuy.title}>
        <Image src={groupBuy.coverImage} alt={groupBuy.coverAlt} fill sizes="(max-width: 767.98px) 116px, (max-width: 1199.98px) 33vw, 400px" />
        <span className={`groupbuy-status is-${groupBuy.status}`}>{text.status[groupBuy.status]}</span>
      </Link>
      <div className="groupbuy-card-body">
        <header>
          <h3><Link href={`/market/groupbuy/${groupBuy.id}`}>{groupBuy.title}</Link></h3>
          <p className="groupbuy-card-seller"><i className="ms ms-storefront" aria-hidden="true" />{groupBuy.seller.name} · {groupBuy.seller.location}</p>
        </header>
        <p className="groupbuy-card-summary">{groupBuy.summary}</p>
        <dl className="groupbuy-card-facts">
          <div><dt>{text.closesAt}</dt><dd>{groupBuy.closesLabel}</dd></div>
          <div><dt>{text.handover}</dt><dd>{groupBuy.handoverLabel}</dd></div>
        </dl>
        <div className="groupbuy-card-tags">
          {groupBuy.pickup.available ? <span className="groupbuy-tag"><i className="ms ms-storefront" aria-hidden="true" />{text.pickup}</span> : null}
          {groupBuy.delivery.available
            ? <span className="groupbuy-tag"><i className="ms ms-local-shipping" aria-hidden="true" />{text.delivery} {formatMarketPrice(groupBuy.delivery.feeCents)}</span>
            : <span className="groupbuy-tag">{text.pickupOnly}</span>}
          <span className="groupbuy-tag"><i className="ms ms-groups" aria-hidden="true" />{text.participants(groupBuy.participantCount)}</span>
        </div>
        <p className="groupbuy-card-price"><small>{locale === "ko" ? "최저" : "From"}</small><strong>{formatMarketPrice(cheapest)}</strong></p>
      </div>
      <Link className="groupbuy-card-open" href={`/market/groupbuy/${groupBuy.id}`}>
        {locale === "ko" ? "상품 보기" : "See the list"}<i className="ms ms-arrow-forward" aria-hidden="true" />
      </Link>
    </article>
  );
}
