"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { formatMarketPrice } from "@/lib/market/format-price";
import { groupBuyText, type GroupBuy } from "@/data/groupBuy";

type SellerOrder = {
  id: string;
  reference: string;
  buyer_name: string;
  buyer_email: string | null;
  buyer_phone: string;
  fulfilment: "pickup" | "delivery";
  delivery_address: string | null;
  buyer_note: string | null;
  total_cents: number;
  subtotal_cents: number;
  delivery_cents: number;
  paid_at: string | null;
  created_at: string;
  group_buy_order_items: Array<{ item_id: string; quantity: number; unit_price_cents: number; group_buy_items: { name: string; unit_label: string }[] }>;
};

/** Escapes one CSV cell. Quotes are doubled and any cell containing a comma,
 *  quote or newline is wrapped — a buyer's note or a street address will
 *  eventually contain all three. */
function csvCell(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** The seller's sheet: who ordered what, how they want it, and what to bake.
 *
 *  Tada settles nothing, so this screen is the product for the seller — it has
 *  to leave the browser and land in whatever they already use to run their
 *  books. The export is a plain CSV built from the rows on screen, so what
 *  opens in Excel is exactly what was read here. */
export function GroupBuySellerOrdersClient({ groupBuy, orders }: { groupBuy: GroupBuy; orders: SellerOrder[] }) {
  const { locale } = useLanguage();
  const text = groupBuyText(locale);
  const isKorean = locale === "ko";
  const [showUnpaidOnly, setShowUnpaidOnly] = useState(false);

  const itemsById = useMemo(() => new Map(groupBuy.items.map((item) => [item.id, item])), [groupBuy.items]);
  const rows = useMemo(() => orders.map((order) => {
    const lines = order.group_buy_order_items.map((line) => ({ line: { itemId: line.item_id, quantity: line.quantity }, item: itemsById.get(line.item_id) ?? { id: line.item_id, name: line.group_buy_items[0]?.name ?? "Item", unitLabel: line.group_buy_items[0]?.unit_label ?? "", priceCents: line.unit_price_cents } }));
    return { order, lines, subtotalCents: order.subtotal_cents, deliveryCents: order.delivery_cents, totalCents: order.total_cents };
  }), [itemsById, orders]);

  const visibleRows = showUnpaidOnly ? rows.filter((row) => !row.order.paid_at) : rows;
  const grandTotalCents = rows.reduce((sum, row) => sum + row.totalCents, 0);
  const unpaidCount = rows.filter((row) => !row.order.paid_at).length;
  const deliveryCount = rows.filter((row) => row.order.fulfilment === "delivery").length;

  // What to bake: every order collapsed down to a quantity per item.
  const packingList = useMemo(() => groupBuy.items.map((item) => ({
    item,
    quantity: rows.reduce((sum, row) => sum + (row.order.group_buy_order_items.find((line) => line.item_id === item.id)?.quantity ?? 0), 0),
  })).filter((entry) => entry.quantity > 0), [groupBuy.items, rows]);

  const exportCsv = () => {
    const header = [text.reference, text.buyer, isKorean ? "이메일" : "Email", text.phone, text.method, text.deliveryAddress, text.items, text.subtotal, text.deliveryFee, text.orderTotal, text.payment, text.placed];
    const body = visibleRows.map(({ order, lines, subtotalCents, deliveryCents, totalCents }) => [
      order.reference,
      order.buyer_name,
      order.buyer_email ?? "",
      order.buyer_phone,
      order.fulfilment === "delivery" ? text.delivery : text.pickup,
      order.delivery_address ?? "",
      lines.map(({ line, item }) => `${item?.name} x${line.quantity}`).join("; "),
      (subtotalCents / 100).toFixed(2),
      (deliveryCents / 100).toFixed(2),
      (totalCents / 100).toFixed(2),
      order.paid_at ? text.paid : text.awaitingPayment,
      new Intl.DateTimeFormat("en-NZ", { dateStyle: "medium", timeStyle: "short" }).format(new Date(order.created_at)),
    ]);
    // The BOM is what makes Excel read the Korean columns as UTF-8 rather than
    // the system codepage; without it every Hangul cell opens as mojibake.
    const csv = `﻿${[header, ...body].map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${groupBuy.referencePrefix.toLowerCase()}-orders.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="market-results groupbuy-orders" aria-label={text.sellerOrdersTitle}>
      <Link className="groupbuy-back" href={`/market/groupbuy/${groupBuy.id}`}><i className="ms ms-arrow-back" aria-hidden="true" /> {text.backToGroupBuy}</Link>

      <div className="browse-intro browse-intro--with-create">
        <div className="browse-intro-copy">
          <h1>{text.sellerOrdersTitle}</h1>
          <p>{groupBuy.title} · {text.sellerOrdersIntro}</p>
        </div>
        <button className="browse-create-button ui-button ui-button--lg" type="button" onClick={exportCsv}>
          <i className="ms ms-description" aria-hidden="true" />
          <span>{text.exportCsv}</span>
        </button>
      </div>

      <dl className="groupbuy-stat-row" aria-label={text.totals}>
        <div><dt>{isKorean ? "주문" : "Orders"}</dt><dd>{rows.length}</dd></div>
        <div><dt>{text.total}</dt><dd>{formatMarketPrice(grandTotalCents)}</dd></div>
        <div><dt>{text.awaitingPayment}</dt><dd className={unpaidCount ? "is-warning" : ""}>{unpaidCount}</dd></div>
        <div><dt>{text.delivery}</dt><dd>{deliveryCount}</dd></div>
      </dl>

      <section className="groupbuy-section ui-card" aria-labelledby="groupbuy-packing">
        <header className="groupbuy-items-heading">
          <div><h2 id="groupbuy-packing">{text.packingList}</h2><p>{text.packingIntro}</p></div>
        </header>
        <ul className="groupbuy-packing-list">
          {packingList.map(({ item, quantity }) => (
            <li key={item.id}><span>{item.name}</span><strong>{quantity}</strong><small>{item.unitLabel}</small></li>
          ))}
        </ul>
      </section>

      <section className="groupbuy-section ui-card" aria-labelledby="groupbuy-order-table">
        <header className="groupbuy-items-heading">
          <h2 id="groupbuy-order-table">{text.items}</h2>
          <label className="groupbuy-toggle">
            <input type="checkbox" checked={showUnpaidOnly} onChange={(event) => setShowUnpaidOnly(event.target.checked)} />
            <span>{isKorean ? "입금 대기만 보기" : "Awaiting payment only"}</span>
          </label>
        </header>

        <div className="groupbuy-table-scroll">
          <table className="groupbuy-table">
            <thead>
              <tr>
                <th scope="col">{text.reference}</th>
                <th scope="col">{text.buyer}</th>
                <th scope="col">{text.items}</th>
                <th scope="col">{text.method}</th>
                <th scope="col">{text.orderTotal}</th>
                <th scope="col">{text.payment}</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map(({ order, lines, totalCents }) => (
                <tr key={order.reference}>
                  <td className="groupbuy-table-reference">{order.reference}</td>
                  <td>
                    <strong>{order.buyer_name}</strong>
                    <small>{order.buyer_phone}</small>
                    {order.buyer_email ? <small>{order.buyer_email}</small> : null}
                    <small>{new Intl.DateTimeFormat("en-NZ", { dateStyle: "medium", timeStyle: "short" }).format(new Date(order.created_at))}</small>
                  </td>
                  <td>
                    <ul className="groupbuy-table-items">
                      {lines.map(({ line, item }) => <li key={line.itemId}>{item?.name} <b>× {line.quantity}</b></li>)}
                    </ul>
                  </td>
                  <td>
                    <span className={`groupbuy-method is-${order.fulfilment}`}>
                      <i className={`ms ${order.fulfilment === "delivery" ? "ms-local-shipping" : "ms-storefront"}`} aria-hidden="true" />
                      {order.fulfilment === "delivery" ? text.delivery : text.pickup}
                    </span>
                    {order.delivery_address ? <small>{order.delivery_address}</small> : null}
                    {order.buyer_note ? <small>{order.buyer_note}</small> : null}
                  </td>
                  <td className="groupbuy-table-total">{formatMarketPrice(totalCents)}</td>
                  <td><span className={order.paid_at ? "groupbuy-paid is-paid" : "groupbuy-paid"}>{order.paid_at ? text.paid : text.awaitingPayment}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
