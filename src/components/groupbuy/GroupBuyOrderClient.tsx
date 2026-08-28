"use client";

import Link from "next/link";
import { useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { formatMarketPrice } from "@/lib/market/format-price";
import { groupBuyOrders, groupBuyReference, groupBuyText, type GroupBuy, type GroupBuyFulfilment } from "@/data/groupBuy";

/** The order form. Design only — nothing is submitted.
 *
 *  The reference is the whole point of this screen. Tada holds no money, so the
 *  only thing tying a bank transfer to a bag of bread is a short code the buyer
 *  types into their own banking app. It is shown early, shown large, and
 *  repeated beside the account number. */
export function GroupBuyOrderClient({ groupBuy, basket }: { groupBuy: GroupBuy; basket: Record<string, number> }) {
  const { locale } = useLanguage();
  const text = groupBuyText(locale);
  const isKorean = locale === "ko";
  const lines = groupBuy.items.filter((item) => basket[item.id]).map((item) => ({ item, quantity: basket[item.id], totalCents: item.priceCents * basket[item.id] }));
  const subtotalCents = lines.reduce((sum, line) => sum + line.totalCents, 0);

  const [fulfilment, setFulfilment] = useState<GroupBuyFulfilment>(groupBuy.pickup.available ? "pickup" : "delivery");
  const freeDelivery = groupBuy.delivery.freeOverCents !== null && subtotalCents >= groupBuy.delivery.freeOverCents;
  const deliveryCents = fulfilment === "delivery" && !freeDelivery ? groupBuy.delivery.feeCents : 0;
  const totalCents = subtotalCents + deliveryCents;

  // The next number in the seller's own sequence. On a live round this comes
  // back from the server when the order is accepted; here it is derived so the
  // screen can show what the buyer would actually be given.
  const reference = groupBuyReference(groupBuy.referencePrefix, groupBuyOrders.length + 1);

  if (!lines.length) {
    return (
      <section className="market-results groupbuy-order" aria-label={text.orderTitle}>
        <Link className="groupbuy-back" href={`/market/groupbuy/${groupBuy.id}`}><i className="ms ms-arrow-back" aria-hidden="true" /> {text.backToGroupBuy}</Link>
        <div className="groupbuy-section ui-card">
          <h1>{text.orderTitle}</h1>
          <p>{text.emptyOrder}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="market-results groupbuy-order" aria-label={text.orderTitle}>
      <Link className="groupbuy-back" href={`/market/groupbuy/${groupBuy.id}`}><i className="ms ms-arrow-back" aria-hidden="true" /> {text.backToGroupBuy}</Link>

      <div className="browse-intro">
        <div className="browse-intro-copy">
          <h1>{text.orderTitle}</h1>
          <p>{text.orderIntro}</p>
        </div>
      </div>

      <div className="groupbuy-order-layout">
        <form className="groupbuy-order-form" onSubmit={(event) => event.preventDefault()}>
          <section className="groupbuy-section ui-card" aria-labelledby="groupbuy-order-items">
            <h2 id="groupbuy-order-items">{text.items}</h2>
            <ul className="groupbuy-order-lines">
              {lines.map(({ item, quantity, totalCents: lineTotal }) => (
                <li key={item.id}>
                  <span className="groupbuy-order-line-name"><strong>{item.name}</strong><small>{formatMarketPrice(item.priceCents)} {item.unitLabel}</small></span>
                  <span className="groupbuy-order-line-qty">× {quantity}</span>
                  <span className="groupbuy-order-line-amount">{formatMarketPrice(lineTotal)}</span>
                </li>
              ))}
            </ul>
            <Link className="groupbuy-order-edit" href={`/market/groupbuy/${groupBuy.id}`}>{isKorean ? "수량 수정" : "Change quantities"}</Link>
          </section>

          <section className="groupbuy-section ui-card" aria-labelledby="groupbuy-order-fulfilment">
            <h2 id="groupbuy-order-fulfilment">{text.howToGetIt}</h2>
            <div className="groupbuy-choice-grid">
              {groupBuy.pickup.available ? (
                <label className={fulfilment === "pickup" ? "groupbuy-choice is-selected" : "groupbuy-choice"}>
                  <input type="radio" name="fulfilment" value="pickup" checked={fulfilment === "pickup"} onChange={() => setFulfilment("pickup")} />
                  <span className="groupbuy-choice-body">
                    <strong><i className="ms ms-storefront" aria-hidden="true" />{text.pickup}</strong>
                    <small>{groupBuy.pickup.address}</small>
                    <small>{groupBuy.pickup.window}</small>
                  </span>
                  <span className="groupbuy-choice-price">{isKorean ? "무료" : "Free"}</span>
                </label>
              ) : null}
              {groupBuy.delivery.available ? (
                <label className={fulfilment === "delivery" ? "groupbuy-choice is-selected" : "groupbuy-choice"}>
                  <input type="radio" name="fulfilment" value="delivery" checked={fulfilment === "delivery"} onChange={() => setFulfilment("delivery")} />
                  <span className="groupbuy-choice-body">
                    <strong><i className="ms ms-local-shipping" aria-hidden="true" />{text.delivery}</strong>
                    <small>{groupBuy.delivery.areas.join(", ")}</small>
                    <small>{groupBuy.delivery.note}</small>
                  </span>
                  <span className="groupbuy-choice-price">{freeDelivery ? (isKorean ? "무료" : "Free") : formatMarketPrice(groupBuy.delivery.feeCents)}</span>
                </label>
              ) : null}
            </div>
            {groupBuy.delivery.available && groupBuy.delivery.freeOverCents && !freeDelivery
              ? <p className="groupbuy-hint"><i className="ms ms-savings" aria-hidden="true" /> {text.freeOver(formatMarketPrice(groupBuy.delivery.freeOverCents))}</p>
              : null}
          </section>

          <section className="groupbuy-section ui-card" aria-labelledby="groupbuy-order-details">
            <h2 id="groupbuy-order-details">{text.yourDetails}</h2>
            <div className="groupbuy-field-grid">
              <div className="post-field"><label htmlFor="groupbuy-name">{text.name}</label><input id="groupbuy-name" name="name" autoComplete="name" placeholder={isKorean ? "홍길동" : "Your name"} /></div>
              <div className="post-field"><label htmlFor="groupbuy-phone">{text.phone}</label><input id="groupbuy-phone" name="phone" type="tel" autoComplete="tel" placeholder="021 123 4567" /></div>
              {fulfilment === "delivery" ? (
                <div className="post-field groupbuy-field-wide"><label htmlFor="groupbuy-address">{text.deliveryAddress}</label><input id="groupbuy-address" name="address" autoComplete="street-address" placeholder={isKorean ? "예: 12 Grey Street, Hamilton East" : "e.g. 12 Grey Street, Hamilton East"} /></div>
              ) : null}
              <div className="post-field groupbuy-field-wide"><label htmlFor="groupbuy-note">{text.note}</label><textarea id="groupbuy-note" name="note" rows={3} placeholder={isKorean ? "예: 빵은 잘라 주세요." : "e.g. Please slice the loaf."} /></div>
            </div>
          </section>
        </form>

        <aside className="groupbuy-order-summary ui-card" aria-label={text.payment}>
          <div className="groupbuy-reference">
            <span>{text.reference}</span>
            <strong>{reference}</strong>
            <small>{isKorean ? "입금할 때 이 코드를 꼭 적어 주세요." : "Put this on your bank transfer."}</small>
          </div>

          <dl className="groupbuy-order-totals">
            <div><dt>{text.subtotal}</dt><dd>{formatMarketPrice(subtotalCents)}</dd></div>
            <div><dt>{fulfilment === "delivery" ? text.deliveryFee : text.pickup}</dt><dd>{deliveryCents ? formatMarketPrice(deliveryCents) : (isKorean ? "무료" : "Free")}</dd></div>
            <div className="is-total"><dt>{text.total}</dt><dd>{formatMarketPrice(totalCents)}</dd></div>
          </dl>

          <section className="groupbuy-bank" aria-label={text.payment}>
            <p>{text.paymentIntro}</p>
            <dl>
              <div><dt>{text.accountName}</dt><dd>{groupBuy.bank.accountName}</dd></div>
              <div><dt>{text.accountNumber}</dt><dd>{groupBuy.bank.accountNumber}</dd></div>
              <div><dt>{text.reference}</dt><dd>{reference}</dd></div>
            </dl>
          </section>

          <button className="ui-button ui-button--primary ui-button--block" type="button">{text.submitOrder}</button>
          <p className="groupbuy-basket-note">{text.submitNote}</p>
        </aside>
      </div>
    </section>
  );
}
