"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";
import { PostShopTypeSelector } from "@/components/post-ad/PostShopTypeSelector";
import { isAcceptedMarketListingImage } from "@/lib/media/market-listing-image";
import { formatMarketPrice } from "@/lib/market/format-price";
import { groupBuyReference, groupBuyText, groupBuys, type GroupBuy } from "@/data/groupBuy";
import { groupBuyCreateResponseSchema } from "@/contracts/api";
import { readApiResponse } from "@/lib/api/client";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type DraftPhoto = { url: string; name: string; isUploaded: boolean; file?: File };
type DraftItem = { id: string; name: string; note: string; price: string; unit: string; limit: string; photo: DraftPhoto | null };

const emptyItem = (): DraftItem => ({ id: crypto.randomUUID(), name: "", note: "", price: "", unit: "each", limit: "", photo: null });

/** A previous round, flattened into the shape the editor holds. Photos come
 *  back as the stored URL rather than a fresh upload, so reusing a round does
 *  not ask the seller to find every picture again. */
function draftFromGroupBuy(groupBuy: GroupBuy): DraftItem[] {
  return groupBuy.items.map((item) => ({
    id: crypto.randomUUID(),
    name: item.name,
    note: item.note,
    price: (item.priceCents / 100).toFixed(2),
    unit: item.unitLabel,
    limit: item.limitPerPerson === null ? "" : String(item.limitPerPerson),
    photo: { url: item.image, name: item.imageAlt, isUploaded: false },
  }));
}

/** Posting a group buy. Design only — nothing is submitted.
 *
 *  A seller can list twenty items, so the editor is a compact repeating row
 *  rather than a card per item: at twenty cards the page stops being fillable.
 *  The reference prefix gets its own step because it is the one field that
 *  decides whether the seller can reconcile their bank statement afterwards. */
export function GroupBuyCreateClient() {
  const router = useRouter();
  const { locale } = useLanguage();
  const text = groupBuyText(locale);
  const isKorean = locale === "ko";
  const [items, setItems] = useState<DraftItem[]>([emptyItem(), emptyItem(), emptyItem()]);
  const [prefix, setPrefix] = useState("");
  const [offersPickup, setOffersPickup] = useState(true);
  const [offersDelivery, setOffersDelivery] = useState(true);
  const [template, setTemplate] = useState<GroupBuy | null>(null);
  // Remounts the uncontrolled fields so a loaded round's defaults take effect
  // without turning every input on the page into controlled state.
  const [formKey, setFormKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const photoInputRef = useRef<HTMLInputElement>(null);
  const photoTargetRef = useRef<string | null>(null);
  const itemsRef = useRef(items);

  useEffect(() => { itemsRef.current = items; }, [items]);
  // Only object URLs this component minted are ours to revoke; a reused round's
  // photos are ordinary stored URLs and revoking them would break the page.
  useEffect(() => () => { itemsRef.current.forEach((item) => { if (item.photo?.isUploaded) URL.revokeObjectURL(item.photo.url); }); }, []);

  const updateItem = (id: string, patch: Partial<DraftItem>) => setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));

  const setPhoto = (id: string, photo: DraftPhoto | null) => setItems((current) => current.map((item) => {
    if (item.id !== id) return item;
    if (item.photo?.isUploaded) URL.revokeObjectURL(item.photo.url);
    return { ...item, photo };
  }));

  const choosePhoto = (itemId: string) => { photoTargetRef.current = itemId; photoInputRef.current?.click(); };

  const acceptPhoto = (files: FileList | null) => {
    const itemId = photoTargetRef.current;
    const file = Array.from(files ?? []).find(isAcceptedMarketListingImage);
    photoTargetRef.current = null;
    if (!itemId || !file) return;
    setPhoto(itemId, { url: URL.createObjectURL(file), name: file.name, isUploaded: true, file });
  };

  const applyTemplate = (groupBuy: GroupBuy) => {
    items.forEach((item) => { if (item.photo?.isUploaded) URL.revokeObjectURL(item.photo.url); });
    setItems(draftFromGroupBuy(groupBuy));
    setPrefix(groupBuy.referencePrefix);
    setOffersPickup(groupBuy.pickup.available);
    setOffersDelivery(groupBuy.delivery.available);
    setTemplate(groupBuy);
    setFormKey((current) => current + 1);
  };

  const clearTemplate = () => {
    items.forEach((item) => { if (item.photo?.isUploaded) URL.revokeObjectURL(item.photo.url); });
    setItems([emptyItem(), emptyItem(), emptyItem()]);
    setPrefix("");
    setOffersPickup(true);
    setOffersDelivery(true);
    setTemplate(null);
    setFormKey((current) => current + 1);
  };

  const namedItems = items.filter((item) => item.name.trim()).length;
  // Math.min of an empty list is Infinity, which is truthy and would reach the
  // formatter — an item can be named before it is priced.
  const pricedCents = items.map((item) => Math.round(Number(item.price) * 100)).filter((cents) => Number.isFinite(cents) && cents > 0);
  const submit = async (form: HTMLFormElement) => {
    const values = new FormData(form);
    const read = (name: string) => String(values.get(name) ?? "").trim();
    const postItems = items.filter((item) => item.name.trim() || item.note.trim() || item.price.trim() || item.unit.trim() !== "each" || item.limit.trim() || item.photo);
    const cents = (name: string) => {
      const raw = read(name);
      if (!raw) return null;
      const value = Math.round(Number(raw) * 100);
      return Number.isFinite(value) ? value : null;
    };
    const fail = (message: string) => {
      setSubmitError(message);
      return null;
    };
    if (read("title").length < 4 || read("summary").length < 4 || read("description").length < 20) {
      return fail(isKorean ? "제목, 한 줄 소개, 안내를 모두 입력해 주세요." : "Enter the title, summary, and description.");
    }
    if (!postItems.length) return fail(isKorean ? "공동구매 상품을 하나 이상 입력해 주세요." : "Add at least one item.");
    if (postItems.some((item) => !item.name.trim() || !Number.isFinite(Number(item.price)) || Number(item.price) <= 0 || !item.unit.trim())) {
      return fail(isKorean ? "각 상품의 이름, 가격, 단위를 모두 입력해 주세요." : "Complete every item's name, price, and unit.");
    }
    if (offersPickup && (!read("pickupAddress") || !read("pickupWindow"))) return fail(isKorean ? "직접 수령 주소와 시간을 입력해 주세요." : "Enter the pickup address and time.");
    if (!offersPickup && !offersDelivery) return fail(isKorean ? "직접 수령 또는 배달 중 하나를 선택해 주세요." : "Choose pickup or delivery.");
    if (prefix.length < 2 || !read("accountName") || !read("accountNumber")) return fail(isKorean ? "레퍼런스 앞글자와 입금 계좌 정보를 입력해 주세요." : "Enter the reference prefix and bank details.");
    if (!values.get("terms")) return fail(isKorean ? "Tada 가이드라인 동의가 필요합니다." : "Please agree to Tada's guidelines.");
    const supabase = createBrowserSupabaseClient();
    if (!supabase) { setSubmitError(isKorean ? "서비스 연결을 확인할 수 없습니다." : "Unable to connect to Tada."); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login?redirectTo=" + encodeURIComponent("/market/groupbuy/create")); return; }
    const { data: { session } } = await supabase.auth.getSession();
    setIsSubmitting(true);
    setSubmitError("");
    try {
      const paths = new Map<string, string | null>();
      for (const item of postItems) {
        if (!item.photo?.file) { paths.set(item.id, null); continue; }
        const extension = item.photo.file.name.split(".").pop()?.toLowerCase() || "webp";
        const path = user.id + "/group-buy/" + crypto.randomUUID() + "." + extension;
        const { error } = await supabase.storage.from("group-buy-images").upload(path, item.photo.file, { contentType: item.photo.file.type, upsert: false });
        if (error) throw new Error(isKorean ? "사진을 업로드하지 못했습니다." : "Unable to upload a photo.");
        paths.set(item.id, path);
      }
      const closesAt = new Date(read("closes"));
      const handoverAt = new Date(read("handover"));
      if (Number.isNaN(closesAt.getTime()) || Number.isNaN(handoverAt.getTime())) throw new Error(isKorean ? "주문 마감과 수령 일정을 입력해 주세요." : "Enter the order closing and handover dates.");
      if (closesAt <= new Date()) throw new Error(isKorean ? "주문 마감은 현재 시각 이후로 설정해 주세요." : "Set the order closing time in the future.");
      if (handoverAt <= closesAt) throw new Error(isKorean ? "수령 일정은 주문 마감 이후여야 합니다." : "Handover must be after the order closes.");
      const response = await fetch("/api/groupbuy", { method: "POST", headers: { "Content-Type": "application/json", ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) }, body: JSON.stringify({
        title: read("title"), summary: read("summary"), description: read("description"), referencePrefix: prefix,
        closesAt: closesAt.toISOString(), handoverAt: handoverAt.toISOString(),
        pickup: { available: offersPickup, address: read("pickupAddress"), window: read("pickupWindow"), note: read("pickupNote") },
        delivery: { available: offersDelivery, feeCents: cents("deliveryFee") ?? 0, freeOverCents: cents("deliveryFree"), areas: read("deliveryAreas").split(",").map((area) => area.trim()).filter(Boolean) },
        bank: { accountName: read("accountName"), accountNumber: read("accountNumber") }, minimumOrderCents: cents("minimum"),
        items: postItems.map((item) => ({ name: item.name.trim(), note: item.note.trim(), priceCents: Math.round(Number(item.price) * 100), unitLabel: item.unit.trim(), limitPerPerson: item.limit ? Number(item.limit) : null, photoPath: paths.get(item.id) ?? null, photoAlt: item.photo?.name ?? "" })),
      }) });
      const result = await readApiResponse(response, groupBuyCreateResponseSchema);
      if (!result.data) throw new Error(result.error?.message ?? (isKorean ? "공동구매를 게시하지 못했습니다." : "Unable to publish group buy."));
      router.replace("/market/groupbuy/" + result.data.id);
      router.refresh();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : (isKorean ? "공동구매를 게시하지 못했습니다." : "Unable to publish group buy."));
    } finally { setIsSubmitting(false); }
  };

  return (
    <section className="market-results groupbuy-create" aria-label={text.createTitle}>
      <Link className="groupbuy-back" href="/market/groupbuy"><i className="ms ms-arrow-back" aria-hidden="true" /> {isKorean ? "공동구매 목록" : "All group buys"}</Link>

      <div className="browse-intro">
        <div className="browse-intro-copy">
          <h1>{text.createTitle}</h1>
          <p>{text.createDescription}</p>
        </div>
      </div>

      {/* A group buy is usually the same list every week. Retyping twenty items
          to change two dates is the whole reason sellers give up on running
          them regularly, so reuse comes before the form rather than inside it. */}
      <section className="groupbuy-reuse" aria-labelledby="groupbuy-reuse-title">
        <header>
          <div>
            <p className="service-profile-eyebrow"><i className="ms ms-repeat" aria-hidden="true" /> {text.reuseTitle}</p>
            <h2 id="groupbuy-reuse-title">{text.reuseIntro}</h2>
          </div>
          {template ? <button type="button" className="groupbuy-reuse-clear" onClick={clearTemplate}>{text.reuseClear}</button> : null}
        </header>
        {template ? (
          <p className="groupbuy-reuse-applied" role="status">
            <i className="ms ms-check-circle" aria-hidden="true" /> {text.reuseApplied(template.title)}
          </p>
        ) : (
          <ul className="groupbuy-reuse-list">
            {groupBuys.map((round) => (
              <li key={round.id}>
                <button type="button" onClick={() => applyTemplate(round)}>
                  <span className="groupbuy-reuse-name">{round.title}</span>
                  <span className="groupbuy-reuse-meta">{text.reuseItemCount(round.items.length)} · {text.reference} {round.referencePrefix}</span>
                  <span className="groupbuy-reuse-cta">{text.reuseAction}<i className="ms ms-arrow-forward" aria-hidden="true" /></span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* One picker serves every row: twenty file inputs is twenty things that
          can hold a stale value. */}
      <input ref={photoInputRef} className="post-photo-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { acceptPhoto(event.target.files); event.currentTarget.value = ""; }} />

      <form className="post-ad-form groupbuy-form" key={formKey} noValidate onSubmit={(event) => { event.preventDefault(); void submit(event.currentTarget); }}>
        <section className="post-description-field">
          <div className="post-section-heading"><span>1</span><h2>{text.basics}</h2></div>
          {/* Picking any other type hands back to the market form, the same way
              picking Group Buy there brings the seller here. */}
          <PostShopTypeSelector activeShopType="groupbuy" onSelect={(value) => { if (value !== "groupbuy") router.push(`/market/create?type=${value}`); }} />
          <div className="post-field"><label htmlFor="groupbuy-title">{isKorean ? "공동구매 제목" : "Group buy title"}</label><input id="groupbuy-title" name="title" required minLength={4} maxLength={100} defaultValue={template?.title ?? ""} placeholder={isKorean ? "예: 해밀턴 수제빵 공동구매 12주차" : "e.g. Hamilton bakery run — week 12"} /></div>
          <div className="post-field"><label htmlFor="groupbuy-summary">{isKorean ? "한 줄 소개" : "One-line summary"}</label><input id="groupbuy-summary" name="summary" required minLength={4} maxLength={140} defaultValue={template?.summary ?? ""} placeholder={isKorean ? "예: 목요일 밤 마감, 금요일 수령" : "e.g. Order by Thursday night, collect Friday"} /></div>
          <div className="post-field"><label htmlFor="groupbuy-description">{isKorean ? "안내" : "About this round"}</label><textarea id="groupbuy-description" name="description" required minLength={20} maxLength={5000} rows={4} defaultValue={template?.description.join("\n\n") ?? ""} placeholder={isKorean ? "어떻게 진행되는지, 언제 준비되는지 적어 주세요." : "How the round works and when it is ready."} /></div>
          {/* Dates are deliberately never carried over — they are the one thing
              that must change, and a prefilled old date is worse than none. */}
          <div className={template ? "groupbuy-field-grid groupbuy-dates-needed" : "groupbuy-field-grid"}>
            {template ? <p className="groupbuy-dates-flag"><i className="ms ms-schedule" aria-hidden="true" /> {text.datesNeeded}</p> : null}
            <div className="post-field"><label htmlFor="groupbuy-closes">{text.closesAt}</label><input id="groupbuy-closes" name="closes" type="datetime-local" required /></div>
            <div className="post-field"><label htmlFor="groupbuy-handover">{text.handover}</label><input id="groupbuy-handover" name="handover" type="datetime-local" required /></div>
          </div>
        </section>

        <section className="post-description-field">
          <div className="post-section-heading"><span>2</span><h2>{text.itemsStep}</h2></div>
          <p className="groupbuy-hint"><i className="ms ms-inventory-2" aria-hidden="true" /> {isKorean ? "상품은 몇 개든 추가할 수 있습니다. 참여자는 이 목록에서 필요한 만큼 담습니다." : "Add as many items as you need. Buyers pick quantities from this list."}</p>

          <div className="groupbuy-item-editor" role="group" aria-label={text.itemsStep}>
            <div className="groupbuy-item-editor-head" aria-hidden="true">
              <span>{text.itemPhoto}</span><span>{text.itemName}</span><span>{text.itemNote}</span><span>{text.itemPrice}</span><span>{text.itemUnit}</span><span>{text.itemLimit}</span><span />
            </div>
            {items.map((item, index) => (
              <div className="groupbuy-item-row" key={item.id}>
                <span className="groupbuy-item-index" aria-hidden="true">{index + 1}</span>
                {item.photo ? (
                  <span className="groupbuy-item-photo has-photo">
                    <Image src={item.photo.url} alt="" fill sizes="56px" unoptimized={item.photo.isUploaded} />
                    <button type="button" aria-label={`${text.removePhoto} ${index + 1}`} onClick={() => setPhoto(item.id, null)}><i className="ms ms-close" aria-hidden="true" /></button>
                  </span>
                ) : (
                  <button type="button" className="groupbuy-item-photo" aria-label={`${text.addPhoto} ${index + 1}`} onClick={() => choosePhoto(item.id)}>
                    <i className="ms ms-photo-camera" aria-hidden="true" />
                  </button>
                )}
                <input aria-label={`${text.itemName} ${index + 1}`} placeholder={isKorean ? "예: 사워도우" : "e.g. Country sourdough"} value={item.name} onChange={(event) => updateItem(item.id, { name: event.target.value })} />
                <input aria-label={`${text.itemNote} ${index + 1}`} placeholder={isKorean ? "예: 800g 한 덩이" : "e.g. 800g whole loaf"} value={item.note} onChange={(event) => updateItem(item.id, { note: event.target.value })} />
                <input aria-label={`${text.itemPrice} ${index + 1}`} inputMode="decimal" placeholder="12.00" value={item.price} onChange={(event) => updateItem(item.id, { price: event.target.value })} />
                <input aria-label={`${text.itemUnit} ${index + 1}`} placeholder={isKorean ? "개" : "each"} value={item.unit} onChange={(event) => updateItem(item.id, { unit: event.target.value })} />
                <input aria-label={`${text.itemLimit} ${index + 1}`} inputMode="numeric" placeholder="—" value={item.limit} onChange={(event) => updateItem(item.id, { limit: event.target.value })} />
                <button type="button" className="groupbuy-item-remove" aria-label={`${text.removeItem} ${index + 1}`} disabled={items.length === 1} onClick={() => { if (item.photo?.isUploaded) URL.revokeObjectURL(item.photo.url); setItems((current) => current.filter((candidate) => candidate.id !== item.id)); }}>
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

          <div className="post-field"><label htmlFor="groupbuy-minimum">{isKorean ? "최소 주문 금액 (선택)" : "Minimum order (optional)"}</label><input id="groupbuy-minimum" name="minimum" inputMode="decimal" defaultValue={template?.minimumOrderCents ? (template.minimumOrderCents / 100).toFixed(2) : ""} placeholder="20.00" /></div>
        </section>

        <section className="post-description-field">
          <div className="post-section-heading"><span>3</span><h2>{text.fulfilmentStep}</h2></div>

          <label className="groupbuy-switch">
            <input type="checkbox" checked={offersPickup} onChange={(event) => setOffersPickup(event.target.checked)} />
            <span><strong><i className="ms ms-storefront" aria-hidden="true" />{text.pickup}</strong><small>{isKorean ? "참여자가 직접 가지러 옵니다." : "Buyers collect from you."}</small></span>
          </label>
          {offersPickup ? (
            <div className="groupbuy-field-grid groupbuy-switch-body">
              <div className="post-field groupbuy-field-wide"><label htmlFor="groupbuy-pickup-address">{isKorean ? "수령 주소" : "Pickup address"}</label><input id="groupbuy-pickup-address" name="pickupAddress" defaultValue={template?.pickup.address ?? ""} placeholder={isKorean ? "예: 12 Grey Street, Hamilton East" : "e.g. 12 Grey Street, Hamilton East"} /></div>
              <div className="post-field"><label htmlFor="groupbuy-pickup-window">{isKorean ? "수령 시간" : "Pickup window"}</label><input id="groupbuy-pickup-window" name="pickupWindow" defaultValue={template?.pickup.window ?? ""} placeholder={isKorean ? "예: 금요일 15:00–18:00" : "e.g. Friday 3pm – 6pm"} /></div>
              <div className="post-field"><label htmlFor="groupbuy-pickup-note">{isKorean ? "수령 안내 (선택)" : "Pickup note (optional)"}</label><input id="groupbuy-pickup-note" name="pickupNote" defaultValue={template?.pickup.note ?? ""} placeholder={isKorean ? "예: 옆문으로 오세요." : "e.g. Come to the side door."} /></div>
            </div>
          ) : null}

          <label className="groupbuy-switch">
            <input type="checkbox" checked={offersDelivery} onChange={(event) => setOffersDelivery(event.target.checked)} />
            <span><strong><i className="ms ms-local-shipping" aria-hidden="true" />{text.delivery}</strong><small>{isKorean ? "직접 배달하거나 택배로 보냅니다." : "You drop off or post the order."}</small></span>
          </label>
          {offersDelivery ? (
            <div className="groupbuy-field-grid groupbuy-switch-body">
              <div className="post-field"><label htmlFor="groupbuy-delivery-fee">{isKorean ? "배송비 (NZD)" : "Delivery fee (NZD)"}</label><input id="groupbuy-delivery-fee" name="deliveryFee" inputMode="decimal" defaultValue={template?.delivery.feeCents ? (template.delivery.feeCents / 100).toFixed(2) : ""} placeholder="6.00" /></div>
              <div className="post-field"><label htmlFor="groupbuy-delivery-free">{isKorean ? "무료 배송 기준 (선택)" : "Free over (optional)"}</label><input id="groupbuy-delivery-free" name="deliveryFree" inputMode="decimal" defaultValue={template?.delivery.freeOverCents ? (template.delivery.freeOverCents / 100).toFixed(2) : ""} placeholder="80.00" /></div>
              <div className="post-field groupbuy-field-wide"><label htmlFor="groupbuy-delivery-areas">{isKorean ? "배송 가능 지역" : "Delivery areas"}</label><input id="groupbuy-delivery-areas" name="deliveryAreas" defaultValue={template?.delivery.areas.join(", ") ?? ""} placeholder={isKorean ? "예: Hamilton East, Rototuna" : "e.g. Hamilton East, Rototuna"} /></div>
            </div>
          ) : null}
        </section>

        <section className="post-description-field">
          <div className="post-section-heading"><span>4</span><h2>{text.paymentStep}</h2></div>
          <p className="groupbuy-hint"><i className="ms ms-payments" aria-hidden="true" /> {isKorean ? "Tada는 결제를 대행하지 않습니다. 참여자는 아래 계좌로 직접 입금하고, 주문마다 발급되는 레퍼런스를 적습니다." : "Tada takes no payment. Buyers transfer to you and quote the reference issued with their order."}</p>
          <div className="groupbuy-field-grid">
            <div className="post-field">
              <label htmlFor="groupbuy-prefix">{isKorean ? "레퍼런스 앞글자" : "Reference prefix"}</label>
              <input id="groupbuy-prefix" name="prefix" required minLength={2} maxLength={4} placeholder="BR" value={prefix} onChange={(event) => setPrefix(event.target.value.replace(/[^a-zA-Z]/g, "").toUpperCase())} />
            </div>
            <div className="post-field"><label htmlFor="groupbuy-account-name">{text.accountName}</label><input id="groupbuy-account-name" name="accountName" defaultValue={template?.bank.accountName ?? ""} placeholder={isKorean ? "예: 해밀턴 홈베이커리" : "e.g. Hamilton Home Bakery"} /></div>
            <div className="post-field groupbuy-field-wide"><label htmlFor="groupbuy-account-number">{text.accountNumber}</label><input id="groupbuy-account-number" name="accountNumber" defaultValue={template?.bank.accountNumber ?? ""} placeholder="12-3456-0789012-00" /></div>
          </div>
          <p className="groupbuy-reference-preview">
            <span>{isKorean ? "발급 예시" : "Buyers will see"}</span>
            <strong>{groupBuyReference(prefix || "BR", 1)}</strong>
            <strong>{groupBuyReference(prefix || "BR", 2)}</strong>
            <strong>{groupBuyReference(prefix || "BR", 3)}</strong>
          </p>
        </section>

        <div className="post-submit-row">
          <label className="terms-row"><input type="checkbox" name="terms" /><span>{isKorean ? "직접 판매하는 상품이며 Tada 가이드라인을 지킵니다." : "I sell these items myself and follow Tada's guidelines."}</span></label>
          {submitError ? <p className="post-create-status" role="alert">{submitError}</p> : null}
          <button className="post-submit-button" type="submit" disabled={isSubmitting}><span>{isSubmitting ? (isKorean ? "게시 중…" : "Publishing…") : text.publish}</span></button>
        </div>
      </form>

      {namedItems && pricedCents.length ? (
        <p className="groupbuy-create-footnote">
          {isKorean ? `상품 ${namedItems}개 · 최저 ` : `${namedItems} items · from `}
          {formatMarketPrice(Math.min(...pricedCents))}
        </p>
      ) : null}
    </section>
  );
}
