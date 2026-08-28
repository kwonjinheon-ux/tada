"use client";

import Link from "next/link";
import { useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { groupBuyReference, groupBuyText } from "@/data/groupBuy";

type DraftItem = { id: string; name: string; note: string; price: string; unit: string; limit: string };

const emptyItem = (): DraftItem => ({ id: crypto.randomUUID(), name: "", note: "", price: "", unit: "each", limit: "" });

/** Posting a group buy. Design only — nothing is submitted.
 *
 *  A seller can list twenty items, so the editor is a compact repeating row
 *  rather than a card per item: at twenty cards the page stops being fillable.
 *  The reference prefix gets its own step because it is the one field that
 *  decides whether the seller can reconcile their bank statement afterwards. */
export function GroupBuyCreateClient() {
  const { locale } = useLanguage();
  const text = groupBuyText(locale);
  const isKorean = locale === "ko";
  const [items, setItems] = useState<DraftItem[]>([emptyItem(), emptyItem(), emptyItem()]);
  const [prefix, setPrefix] = useState("");
  const [offersPickup, setOffersPickup] = useState(true);
  const [offersDelivery, setOffersDelivery] = useState(true);

  const updateItem = (id: string, patch: Partial<DraftItem>) => setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  const namedItems = items.filter((item) => item.name.trim()).length;

  return (
    <section className="market-results groupbuy-create" aria-label={text.createTitle}>
      <Link className="groupbuy-back" href="/market/groupbuy"><i className="ms ms-arrow-back" aria-hidden="true" /> {isKorean ? "공동구매 목록" : "All group buys"}</Link>

      <div className="browse-intro">
        <div className="browse-intro-copy">
          <h1>{text.createTitle}</h1>
          <p>{text.createDescription}</p>
        </div>
      </div>

      <form className="post-ad-form groupbuy-form" onSubmit={(event) => event.preventDefault()}>
        <section className="post-description-field">
          <div className="post-section-heading"><span>1</span><h2>{text.basics}</h2></div>
          <div className="post-field"><label htmlFor="groupbuy-title">{isKorean ? "공동구매 제목" : "Group buy title"}</label><input id="groupbuy-title" name="title" maxLength={100} placeholder={isKorean ? "예: 해밀턴 수제빵 공동구매 12주차" : "e.g. Hamilton bakery run — week 12"} /></div>
          <div className="post-field"><label htmlFor="groupbuy-summary">{isKorean ? "한 줄 소개" : "One-line summary"}</label><input id="groupbuy-summary" name="summary" maxLength={140} placeholder={isKorean ? "예: 목요일 밤 마감, 금요일 수령" : "e.g. Order by Thursday night, collect Friday"} /></div>
          <div className="post-field"><label htmlFor="groupbuy-description">{isKorean ? "안내" : "About this round"}</label><textarea id="groupbuy-description" name="description" rows={4} placeholder={isKorean ? "어떻게 진행되는지, 언제 준비되는지 적어 주세요." : "How the round works and when it is ready."} /></div>
          <div className="groupbuy-field-grid">
            <div className="post-field"><label htmlFor="groupbuy-closes">{text.closesAt}</label><input id="groupbuy-closes" name="closes" type="datetime-local" /></div>
            <div className="post-field"><label htmlFor="groupbuy-handover">{text.handover}</label><input id="groupbuy-handover" name="handover" type="datetime-local" /></div>
          </div>
        </section>

        <section className="post-description-field">
          <div className="post-section-heading"><span>2</span><h2>{text.itemsStep}</h2></div>
          <p className="groupbuy-hint"><i className="ms ms-inventory-2" aria-hidden="true" /> {isKorean ? "상품은 몇 개든 추가할 수 있습니다. 참여자는 이 목록에서 필요한 만큼 담습니다." : "Add as many items as you need. Buyers pick quantities from this list."}</p>

          <div className="groupbuy-item-editor" role="group" aria-label={text.itemsStep}>
            <div className="groupbuy-item-editor-head" aria-hidden="true">
              <span>{text.itemName}</span><span>{text.itemNote}</span><span>{text.itemPrice}</span><span>{text.itemUnit}</span><span>{text.itemLimit}</span><span />
            </div>
            {items.map((item, index) => (
              <div className="groupbuy-item-row" key={item.id}>
                <label className="groupbuy-item-index" aria-label={`${text.itemName} ${index + 1}`}>{index + 1}</label>
                <input aria-label={`${text.itemName} ${index + 1}`} placeholder={isKorean ? "예: 사워도우" : "e.g. Country sourdough"} value={item.name} onChange={(event) => updateItem(item.id, { name: event.target.value })} />
                <input aria-label={`${text.itemNote} ${index + 1}`} placeholder={isKorean ? "예: 800g 한 덩이" : "e.g. 800g whole loaf"} value={item.note} onChange={(event) => updateItem(item.id, { note: event.target.value })} />
                <input aria-label={`${text.itemPrice} ${index + 1}`} inputMode="decimal" placeholder="12.00" value={item.price} onChange={(event) => updateItem(item.id, { price: event.target.value })} />
                <input aria-label={`${text.itemUnit} ${index + 1}`} placeholder={isKorean ? "개" : "each"} value={item.unit} onChange={(event) => updateItem(item.id, { unit: event.target.value })} />
                <input aria-label={`${text.itemLimit} ${index + 1}`} inputMode="numeric" placeholder="—" value={item.limit} onChange={(event) => updateItem(item.id, { limit: event.target.value })} />
                <button type="button" className="groupbuy-item-remove" aria-label={`${text.removeItem} ${index + 1}`} disabled={items.length === 1} onClick={() => setItems((current) => current.filter((candidate) => candidate.id !== item.id))}>
                  <i className="ms ms-close" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>

          <div className="groupbuy-item-editor-actions">
            <button type="button" className="ui-button ui-button--secondary" onClick={() => setItems((current) => [...current, emptyItem()])}>
              <i className="ms ms-add" aria-hidden="true" /> {text.addItem}
            </button>
            <span>{isKorean ? `${namedItems}개 입력됨` : `${namedItems} named`}</span>
          </div>

          <div className="post-field"><label htmlFor="groupbuy-minimum">{isKorean ? "최소 주문 금액 (선택)" : "Minimum order (optional)"}</label><input id="groupbuy-minimum" name="minimum" inputMode="decimal" placeholder="20.00" /></div>
        </section>

        <section className="post-description-field">
          <div className="post-section-heading"><span>3</span><h2>{text.fulfilmentStep}</h2></div>

          <label className="groupbuy-switch">
            <input type="checkbox" checked={offersPickup} onChange={(event) => setOffersPickup(event.target.checked)} />
            <span><strong><i className="ms ms-storefront" aria-hidden="true" />{text.pickup}</strong><small>{isKorean ? "참여자가 직접 가지러 옵니다." : "Buyers collect from you."}</small></span>
          </label>
          {offersPickup ? (
            <div className="groupbuy-field-grid groupbuy-switch-body">
              <div className="post-field groupbuy-field-wide"><label htmlFor="groupbuy-pickup-address">{isKorean ? "수령 주소" : "Pickup address"}</label><input id="groupbuy-pickup-address" name="pickupAddress" placeholder={isKorean ? "예: 12 Grey Street, Hamilton East" : "e.g. 12 Grey Street, Hamilton East"} /></div>
              <div className="post-field"><label htmlFor="groupbuy-pickup-window">{isKorean ? "수령 시간" : "Pickup window"}</label><input id="groupbuy-pickup-window" name="pickupWindow" placeholder={isKorean ? "예: 금요일 15:00–18:00" : "e.g. Friday 3pm – 6pm"} /></div>
              <div className="post-field"><label htmlFor="groupbuy-pickup-note">{isKorean ? "수령 안내 (선택)" : "Pickup note (optional)"}</label><input id="groupbuy-pickup-note" name="pickupNote" placeholder={isKorean ? "예: 옆문으로 오세요." : "e.g. Come to the side door."} /></div>
            </div>
          ) : null}

          <label className="groupbuy-switch">
            <input type="checkbox" checked={offersDelivery} onChange={(event) => setOffersDelivery(event.target.checked)} />
            <span><strong><i className="ms ms-local-shipping" aria-hidden="true" />{text.delivery}</strong><small>{isKorean ? "직접 배달하거나 택배로 보냅니다." : "You drop off or post the order."}</small></span>
          </label>
          {offersDelivery ? (
            <div className="groupbuy-field-grid groupbuy-switch-body">
              <div className="post-field"><label htmlFor="groupbuy-delivery-fee">{isKorean ? "배송비 (NZD)" : "Delivery fee (NZD)"}</label><input id="groupbuy-delivery-fee" name="deliveryFee" inputMode="decimal" placeholder="6.00" /></div>
              <div className="post-field"><label htmlFor="groupbuy-delivery-free">{isKorean ? "무료 배송 기준 (선택)" : "Free over (optional)"}</label><input id="groupbuy-delivery-free" name="deliveryFree" inputMode="decimal" placeholder="80.00" /></div>
              <div className="post-field groupbuy-field-wide"><label htmlFor="groupbuy-delivery-areas">{isKorean ? "배송 가능 지역" : "Delivery areas"}</label><input id="groupbuy-delivery-areas" name="deliveryAreas" placeholder={isKorean ? "예: Hamilton East, Rototuna" : "e.g. Hamilton East, Rototuna"} /></div>
            </div>
          ) : null}
        </section>

        <section className="post-description-field">
          <div className="post-section-heading"><span>4</span><h2>{text.paymentStep}</h2></div>
          <p className="groupbuy-hint"><i className="ms ms-payments" aria-hidden="true" /> {isKorean ? "Tada는 결제를 대행하지 않습니다. 참여자는 아래 계좌로 직접 입금하고, 주문마다 발급되는 레퍼런스를 적습니다." : "Tada takes no payment. Buyers transfer to you and quote the reference issued with their order."}</p>
          <div className="groupbuy-field-grid">
            <div className="post-field">
              <label htmlFor="groupbuy-prefix">{isKorean ? "레퍼런스 앞글자" : "Reference prefix"}</label>
              <input id="groupbuy-prefix" name="prefix" maxLength={4} placeholder="BR" value={prefix} onChange={(event) => setPrefix(event.target.value.replace(/[^a-zA-Z]/g, "").toUpperCase())} />
            </div>
            <div className="post-field"><label htmlFor="groupbuy-account-name">{text.accountName}</label><input id="groupbuy-account-name" name="accountName" placeholder={isKorean ? "예: 해밀턴 홈베이커리" : "e.g. Hamilton Home Bakery"} /></div>
            <div className="post-field groupbuy-field-wide"><label htmlFor="groupbuy-account-number">{text.accountNumber}</label><input id="groupbuy-account-number" name="accountNumber" placeholder="12-3456-0789012-00" /></div>
          </div>
          <p className="groupbuy-reference-preview">
            <span>{isKorean ? "발급 예시" : "Buyers will see"}</span>
            <strong>{groupBuyReference(prefix || "BR", 1)}</strong>
            <strong>{groupBuyReference(prefix || "BR", 2)}</strong>
            <strong>{groupBuyReference(prefix || "BR", 3)}</strong>
          </p>
        </section>

        <div className="post-submit-row">
          <label className="terms-row"><input type="checkbox" /><span>{isKorean ? "직접 판매하는 상품이며 Tada 가이드라인을 지킵니다." : "I sell these items myself and follow Tada's guidelines."}</span></label>
          <button className="post-submit-button" type="submit"><span>{text.publish}</span></button>
        </div>
      </form>
    </section>
  );
}
