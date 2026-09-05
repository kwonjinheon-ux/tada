"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { formatMarketPrice } from "@/lib/market/format-price";
import { encodeGroupBuyBasket } from "@/lib/market/group-buy-basket";
import { groupBuyText, type GroupBuy } from "@/data/groupBuy";
import { Avatar } from "@/components/ui/Avatar";
import { DialogOverlay } from "@/components/ui/DialogOverlay";
import { MarketBreadcrumb } from "@/components/market/MarketBreadcrumb";

/** The list, and the basket built from it.
 *
 *  Quantities live in component state and travel to the order form in the URL.
 *  A group buy has no stock to hold and Tada takes no payment, so there is
 *  nothing to reserve server-side between picking items and submitting the
 *  form — the basket is genuinely just the shape of the request. */
export function GroupBuyDetailClient({ groupBuy, isOwner = false }: { groupBuy: GroupBuy; isOwner?: boolean }) {
  const { locale } = useLanguage();
  const text = groupBuyText(locale);
  const isKorean = locale === "ko";
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [previewItemId, setPreviewItemId] = useState<string | null>(null);
  const isClosed = groupBuy.status === "closed";

  // A delta, not an absolute: two taps inside one render both read the same
  // quantity off the closure and the second would be swallowed. Deriving the
  // next value inside the updater makes a fast double-tap count twice.
  const changeQuantity = (itemId: string, delta: number) => setQuantities((current) => {
    const item = groupBuy.items.find((candidate) => candidate.id === itemId);
    const next = (current[itemId] ?? 0) + delta;
    const capped = Math.max(0, item?.limitPerPerson ? Math.min(next, item.limitPerPerson) : next);
    const { [itemId]: _removed, ...rest } = current;
    return capped ? { ...rest, [itemId]: capped } : rest;
  });

  const lines = useMemo(() => groupBuy.items
    .filter((item) => quantities[item.id])
    .map((item) => ({ item, quantity: quantities[item.id], totalCents: item.priceCents * quantities[item.id] })), [groupBuy.items, quantities]);
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
  const subtotalCents = lines.reduce((sum, line) => sum + line.totalCents, 0);
  const belowMinimum = groupBuy.minimumOrderCents !== null && subtotalCents > 0 && subtotalCents < groupBuy.minimumOrderCents;
  const canReview = itemCount > 0 && !belowMinimum && !isClosed;
  const previewItem = groupBuy.items.find((item) => item.id === previewItemId) ?? null;

  return (
    <section className="market-results groupbuy-detail" aria-label={groupBuy.title}>
      <MarketBreadcrumb current={isKorean ? "상세 보기" : "Details"} groupBuyId={groupBuy.id} groupBuyTitle={groupBuy.title} />

      <header className="groupbuy-hero ui-card">
        <div className="groupbuy-hero-media">
          <Image src={groupBuy.coverImage} alt={groupBuy.coverAlt} fill sizes="(max-width: 767.98px) 100vw, 420px" />
          <span className={`groupbuy-status is-${groupBuy.status}`}>{text.status[groupBuy.status]}</span>
        </div>
        <div className="groupbuy-hero-copy">
          <h1>{groupBuy.title}</h1>
          <p className="groupbuy-hero-summary">{groupBuy.summary}</p>
          <p className="groupbuy-hero-seller">
            <Avatar className="groupbuy-seller-avatar" src={groupBuy.seller.avatarUrl} name={groupBuy.seller.name} alt={`${groupBuy.seller.name} profile`} colored />
            <span><strong>{groupBuy.seller.name}</strong><small>{groupBuy.seller.location} · {groupBuy.seller.joinedLabel}</small></span>
          </p>
          <dl className="groupbuy-hero-facts">
              <div className="is-closes"><dt><i className="ms ms-schedule" aria-hidden="true" />{text.closesAt}</dt><dd>{groupBuy.closesLabel}</dd></div>
              <div className="is-handover"><dt><i className="ms ms-inventory-2" aria-hidden="true" />{text.handover}</dt><dd>{groupBuy.handoverLabel}</dd></div>
              <div className="is-participants"><dt><i className="ms ms-groups" aria-hidden="true" />{isKorean ? "참여" : "Joined"}</dt><dd>{text.participants(groupBuy.participantCount)}</dd></div>
          </dl>
        </div>
      </header>

      <div className="groupbuy-detail-layout">
        <div className="groupbuy-detail-main">
          <section className="groupbuy-section ui-card" aria-labelledby="groupbuy-about">
            <h2 id="groupbuy-about">{isKorean ? "안내" : "About this round"}</h2>
            {groupBuy.description.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </section>

          <section className="groupbuy-section ui-card" aria-labelledby="groupbuy-fulfilment">
            <h2 id="groupbuy-fulfilment">{text.howToGetIt}</h2>
            <div className="groupbuy-fulfilment-grid">
              <article className={groupBuy.pickup.available ? "" : "is-unavailable"}>
                <header><i className="ms ms-storefront" aria-hidden="true" /><strong>{text.pickup}</strong><em>{isKorean ? "무료" : "Free"}</em></header>
                <p>{groupBuy.pickup.address}</p>
                <p><i className="ms ms-schedule" aria-hidden="true" />{groupBuy.pickup.window}</p>
                <small>{groupBuy.pickup.note}</small>
              </article>
              <article className={groupBuy.delivery.available ? "" : "is-unavailable"}>
                <header>
                  <i className="ms ms-local-shipping" aria-hidden="true" /><strong>{text.delivery}</strong>
                  <em>{groupBuy.delivery.available ? formatMarketPrice(groupBuy.delivery.feeCents) : (isKorean ? "미제공" : "Not offered")}</em>
                </header>
                {groupBuy.delivery.available ? <>
                  {groupBuy.delivery.freeOverCents ? <p className="groupbuy-free-over">{text.freeOver(formatMarketPrice(groupBuy.delivery.freeOverCents))}</p> : null}
                  <p>{groupBuy.delivery.areas.join(", ")}</p>
                  <small>{groupBuy.delivery.note}</small>
                </> : <small>{groupBuy.delivery.note}</small>}
              </article>
            </div>
          </section>

          <section className="groupbuy-section ui-card" aria-labelledby="groupbuy-items">
            <header className="groupbuy-items-heading">
              <h2 id="groupbuy-items">{isKorean ? "상품" : "Items"}</h2>
              <span>{groupBuy.items.length}{isKorean ? "개" : ""}</span>
            </header>
            <ul className="groupbuy-item-list">
              {groupBuy.items.map((item) => {
                const quantity = quantities[item.id] ?? 0;
                const atLimit = item.limitPerPerson !== null && quantity >= item.limitPerPerson;
                return (
                  <li className={quantity ? "groupbuy-item is-added" : "groupbuy-item"} key={item.id}>
                    <button className="groupbuy-item-media" type="button" aria-label={isKorean ? `${item.name} 사진 크게 보기` : `View ${item.name} photo`} onClick={() => setPreviewItemId(item.id)}><Image src={item.image} alt={item.imageAlt} fill sizes="96px" /></button>
                    <div className="groupbuy-item-copy">
                      <strong>{item.name}</strong>
                      <small>{item.note}</small>
                      <span className="groupbuy-item-meta">
                        <b>{formatMarketPrice(item.priceCents)}</b> {item.unitLabel}
                        {item.limitPerPerson ? <em>{text.perPerson(item.limitPerPerson)}</em> : null}
                      </span>
                      {!isOwner ? <span className="groupbuy-item-ordered">{text.ordered(item.orderedCount)}</span> : null}
                    </div>
                    {!isOwner ? <div className="groupbuy-stepper" role="group" aria-label={item.name}>
                      <button type="button" aria-label={isKorean ? `${item.name} 하나 빼기` : `Remove one ${item.name}`} disabled={!quantity || isClosed} onClick={() => changeQuantity(item.id, -1)}><i className="ms ms-remove" aria-hidden="true" /></button>
                      <output aria-live="polite">{quantity}</output>
                      <button type="button" aria-label={isKorean ? `${item.name} 하나 담기` : `Add one ${item.name}`} disabled={atLimit || isClosed} onClick={() => changeQuantity(item.id, 1)}><i className="ms ms-add" aria-hidden="true" /></button>
                    </div> : null}
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        {/* The basket stays in view while the reader works down the list. */}
        {isOwner ? <aside className="groupbuy-basket ui-card" aria-label={isKorean ? "판매자 관리" : "Seller management"}>
          <h2>{isKorean ? "판매자 관리" : "Seller management"}</h2>
          <p className="groupbuy-basket-empty">{isKorean ? "판매자는 상품을 주문하지 않습니다. 참여자의 주문과 개인정보를 주문 관리에서 확인하세요." : "Sellers do not place an order. View participant orders and details in order management."}</p>
          <Link className="ui-button ui-button--primary ui-button--block" href={`/market/groupbuy/${groupBuy.id}/orders`}>{isKorean ? "주문 관리" : "Manage orders"}</Link>
        </aside> : <aside className="groupbuy-basket ui-card" aria-label={text.yourOrder}>
          <h2>{text.yourOrder}</h2>
          {lines.length ? (
            <ul className="groupbuy-basket-lines">
              {lines.map(({ item, quantity, totalCents }) => (
                <li key={item.id}>
                  <span className="groupbuy-basket-name">{item.name}<small>× {quantity}</small></span>
                  <span className="groupbuy-basket-amount">{formatMarketPrice(totalCents)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="groupbuy-basket-empty">{text.emptyOrder}</p>}

          <dl className="groupbuy-basket-totals">
            <div><dt>{text.itemsTotal}</dt><dd>{itemCount}</dd></div>
            <div className="is-total"><dt>{text.subtotal}</dt><dd>{formatMarketPrice(subtotalCents)}</dd></div>
          </dl>
          {belowMinimum ? <p className="groupbuy-basket-warning" role="status"><i className="ms ms-warning" aria-hidden="true" /> {text.minimumNotice(formatMarketPrice(groupBuy.minimumOrderCents ?? 0))}</p> : null}
          <Link
            className={`ui-button ui-button--primary ui-button--block groupbuy-basket-cta${canReview ? "" : " is-disabled"}`}
            href={canReview ? `/market/groupbuy/${groupBuy.id}/order?basket=${encodeGroupBuyBasket(quantities)}` : "#"}
            aria-disabled={!canReview}
            tabIndex={canReview ? undefined : -1}
          >
            {isClosed ? text.status.closed : text.reviewOrder}
          </Link>
          <p className="groupbuy-basket-note"><i className="ms ms-payments" aria-hidden="true" /> {isKorean ? "Tada는 결제를 대행하지 않습니다. 판매자에게 직접 입금합니다." : "Tada takes no payment. You transfer to the seller directly."}</p>
        </aside>}
      </div>
      {previewItem ? <DialogOverlay className="groupbuy-photo-dialog" onClose={() => setPreviewItemId(null)} aria-label={isKorean ? "상품 사진 크게 보기" : "Item photo preview"}><div className="groupbuy-photo-dialog-content"><button className="ui-icon-button" type="button" onClick={() => setPreviewItemId(null)} aria-label={isKorean ? "닫기" : "Close"}><i className="ms ms-close" aria-hidden="true" /></button><Image src={previewItem.image} alt={previewItem.imageAlt} width={1200} height={1200} sizes="(max-width: 767px) 92vw, 760px" /></div></DialogOverlay> : null}
    </section>
  );
}
