// Group Buy preview data and copy. Design only: nothing here is persisted, and
// the screens that read it keep their state in the URL or in local component
// state so the flow can be walked end to end before any of it is wired up.
//
// Tada takes no payment. A group buy therefore ends at a reference number the
// buyer puts on their own bank transfer, and a list the seller can hand to
// their own accounting — that constraint is what shapes every screen here.

export type GroupBuyStatus = "open" | "closing-soon" | "closed";
export type GroupBuyFulfilment = "pickup" | "delivery";

export type GroupBuyItem = {
  id: string;
  name: string;
  note: string;
  priceCents: number;
  unitLabel: string;
  /** null means no cap. Sellers set this per item when they post. */
  limitPerPerson: number | null;
  image: string;
  imageAlt: string;
  orderedCount: number;
};

export type GroupBuy = {
  id: string;
  title: string;
  summary: string;
  description: string[];
  status: GroupBuyStatus;
  /** The seller's own prefix. Every order reference is prefix + sequence. */
  referencePrefix: string;
  coverImage: string;
  coverAlt: string;
  seller: { name: string; location: string; phone: string; joinedLabel: string; avatarUrl?: string | null };
  pickup: { available: boolean; address: string; window: string; note: string };
  delivery: { available: boolean; feeCents: number; freeOverCents: number | null; areas: string[]; note: string };
  closesLabel: string;
  handoverLabel: string;
  bank: { accountName: string; accountNumber: string };
  minimumOrderCents: number | null;
  participantCount: number;
  items: GroupBuyItem[];
};

export type GroupBuyOrderLine = { itemId: string; quantity: number };

export type GroupBuyOrder = {
  reference: string;
  buyerName: string;
  phone: string;
  fulfilment: GroupBuyFulfilment;
  address: string | null;
  placedLabel: string;
  isPaid: boolean;
  lines: GroupBuyOrderLine[];
};

export function groupBuyReference(prefix: string, sequence: number) {
  return `${prefix.toUpperCase()}${String(sequence).padStart(4, "0")}`;
}

const bakeryItems: GroupBuyItem[] = [
  { id: "sourdough", name: "Country sourdough", note: "800g whole loaf, baked Friday morning", priceCents: 1200, unitLabel: "per loaf", limitPerPerson: 4, image: "/images/home/journey-market.png", imageAlt: "A round sourdough loaf", orderedCount: 34 },
  { id: "milk-bread", name: "Hokkaido milk bread", note: "Soft white loaf, sliced on request", priceCents: 1100, unitLabel: "per loaf", limitPerPerson: 4, image: "/images/home/journey-community.png", imageAlt: "A pale milk bread loaf", orderedCount: 28 },
  { id: "red-bean", name: "Red bean bun", note: "Pack of 4, house-made paste", priceCents: 900, unitLabel: "per pack", limitPerPerson: 6, image: "/images/home/journey-services.png", imageAlt: "Red bean buns on a tray", orderedCount: 41 },
  { id: "garlic-baguette", name: "Garlic baguette", note: "Half baked, finish at home", priceCents: 850, unitLabel: "each", limitPerPerson: 6, image: "/images/home/journey-market.png", imageAlt: "A garlic baguette", orderedCount: 19 },
  { id: "croissant", name: "Butter croissant", note: "Pack of 6, French butter", priceCents: 1800, unitLabel: "per pack", limitPerPerson: 3, image: "/images/home/journey-community.png", imageAlt: "A tray of croissants", orderedCount: 23 },
  { id: "cheese-scone", name: "Cheese scone", note: "Pack of 4, Kāpiti cheddar", priceCents: 1000, unitLabel: "per pack", limitPerPerson: null, image: "/images/home/journey-services.png", imageAlt: "Cheese scones", orderedCount: 12 },
];

export const groupBuys: GroupBuy[] = [
  {
    id: "hamilton-bakery-run",
    title: "Hamilton bakery run — week 12",
    summary: "One bulk bake, one pickup. Order by Thursday night.",
    description: [
      "We bake to order every Friday, so the price stays the same whether you take one loaf or six. Orders close Thursday 9pm and everything is baked fresh the next morning.",
      "Pay by bank transfer using the reference on your order page. Tada does not handle payment — the reference is how I match your transfer to your bag.",
    ],
    status: "closing-soon",
    referencePrefix: "BR",
    coverImage: "/images/home/journey-market.png",
    coverAlt: "Fresh bread cooling on a rack",
    seller: { name: "Hamilton Home Bakery", location: "Hamilton East", phone: "021 482 1936", joinedLabel: "Hosting group buys since 2023" },
    pickup: { available: true, address: "12 Grey Street, Hamilton East", window: "Friday 3pm – 6pm", note: "Park on Grey Street and come to the side door." },
    delivery: { available: true, feeCents: 600, freeOverCents: 8000, areas: ["Hamilton East", "Hamilton Central", "Rototuna", "Frankton"], note: "Delivered Friday evening between 5pm and 8pm." },
    closesLabel: "Thursday 9:00pm",
    handoverLabel: "Friday 3:00pm",
    bank: { accountName: "Hamilton Home Bakery", accountNumber: "12-3456-0789012-00" },
    minimumOrderCents: 2000,
    participantCount: 38,
    items: bakeryItems,
  },
  {
    id: "korean-pantry",
    title: "Korean pantry restock",
    summary: "Bulk gochujang, sesame oil and dried seaweed, split by the box.",
    description: ["A monthly box order split between neighbours so nobody pays the single-unit price."],
    status: "open",
    referencePrefix: "KP",
    coverImage: "/images/home/journey-community.png",
    coverAlt: "Korean pantry staples",
    seller: { name: "Waikato Korean Grocers", location: "Frankton", phone: "021 329 6174", joinedLabel: "Hosting group buys since 2024" },
    pickup: { available: true, address: "5 Kent Street, Frankton", window: "Saturday 10am – 2pm", note: "Ring the bell at the roller door." },
    delivery: { available: false, feeCents: 0, freeOverCents: null, areas: [], note: "Pickup only for this round." },
    closesLabel: "Sunday 11:59pm",
    handoverLabel: "Next Saturday 10:00am",
    bank: { accountName: "Waikato Korean Grocers", accountNumber: "02-0100-0123456-00" },
    minimumOrderCents: null,
    participantCount: 21,
    items: bakeryItems.slice(0, 4),
  },
  {
    id: "citrus-box",
    title: "Bay of Plenty citrus box",
    summary: "Ten kilo mandarin boxes straight from the orchard.",
    description: ["Picked Wednesday, in Hamilton Thursday."],
    status: "open",
    referencePrefix: "CB",
    coverImage: "/images/home/journey-services.png",
    coverAlt: "A crate of mandarins",
    seller: { name: "Kiwi Orchard Direct", location: "Hamilton Central", phone: "021 705 4462", joinedLabel: "Hosting group buys since 2022" },
    pickup: { available: true, address: "88 Victoria Street, Hamilton Central", window: "Thursday 4pm – 7pm", note: "Loading bay at the rear." },
    delivery: { available: true, feeCents: 800, freeOverCents: null, areas: ["Hamilton Central", "Chartwell"], note: "Boxes are heavy — delivery is a flat fee per box." },
    closesLabel: "Tuesday 6:00pm",
    handoverLabel: "Thursday 4:00pm",
    bank: { accountName: "Kiwi Orchard Direct", accountNumber: "06-0501-0987654-00" },
    minimumOrderCents: null,
    participantCount: 54,
    items: bakeryItems.slice(2, 6),
  },
  {
    id: "winter-firewood",
    title: "Winter firewood — closed",
    summary: "Two cubic metre bundles, split between eleven households.",
    description: ["This round has closed. Follow the seller to hear about the next one."],
    status: "closed",
    referencePrefix: "FW",
    coverImage: "/images/home/journey-market.png",
    coverAlt: "Stacked firewood",
    seller: { name: "Waikato Firewood Co", location: "Rototuna", phone: "021 668 9201", joinedLabel: "Hosting group buys since 2021" },
    pickup: { available: true, address: "40 Thomas Road, Rototuna", window: "Saturday 9am – 12pm", note: "Bring a trailer." },
    delivery: { available: true, feeCents: 4500, freeOverCents: null, areas: ["Rototuna", "Flagstaff"], note: "Tipped on your driveway." },
    closesLabel: "Closed",
    handoverLabel: "Completed",
    bank: { accountName: "Waikato Firewood Co", accountNumber: "15-3948-0192837-00" },
    minimumOrderCents: null,
    participantCount: 11,
    items: bakeryItems.slice(1, 4),
  },
];

/** The seller's view of a running round. Sequence order is the reference order. */
export const groupBuyOrders: GroupBuyOrder[] = [
  { reference: "BR0001", buyerName: "Jimin Park", phone: "021 555 0101", fulfilment: "pickup", address: null, placedLabel: "Mon 9:12am", isPaid: true, lines: [{ itemId: "sourdough", quantity: 2 }, { itemId: "red-bean", quantity: 1 }] },
  { reference: "BR0002", buyerName: "Aroha Ngata", phone: "021 555 0142", fulfilment: "delivery", address: "18 Clyde Street, Hamilton East", placedLabel: "Mon 6:40pm", isPaid: true, lines: [{ itemId: "milk-bread", quantity: 1 }, { itemId: "croissant", quantity: 1 }, { itemId: "cheese-scone", quantity: 2 }] },
  { reference: "BR0003", buyerName: "Tom Whitfield", phone: "021 555 0188", fulfilment: "pickup", address: null, placedLabel: "Tue 8:05am", isPaid: false, lines: [{ itemId: "garlic-baguette", quantity: 3 }] },
  { reference: "BR0004", buyerName: "Soyeon Han", phone: "021 555 0210", fulfilment: "delivery", address: "6 Snell Drive, Rototuna", placedLabel: "Tue 1:22pm", isPaid: true, lines: [{ itemId: "sourdough", quantity: 1 }, { itemId: "milk-bread", quantity: 2 }, { itemId: "red-bean", quantity: 2 }] },
  { reference: "BR0005", buyerName: "Liam Carter", phone: "021 555 0233", fulfilment: "pickup", address: null, placedLabel: "Wed 7:58am", isPaid: false, lines: [{ itemId: "croissant", quantity: 2 }, { itemId: "cheese-scone", quantity: 1 }] },
  { reference: "BR0006", buyerName: "Mele Tupou", phone: "021 555 0277", fulfilment: "pickup", address: null, placedLabel: "Wed 4:31pm", isPaid: true, lines: [{ itemId: "red-bean", quantity: 3 }, { itemId: "garlic-baguette", quantity: 1 }] },
];

export function findGroupBuy(id: string) {
  return groupBuys.find((groupBuy) => groupBuy.id === id) ?? null;
}

const copy = {
  en: {
    heroTitle: "Buy together, pay less.",
    heroDescription: "Neighbours pool one order so everyone gets the bulk price.",
    browseLabel: "Open group buys",
    count: (n: number) => `${n} ${n === 1 ? "group buy" : "group buys"}`,
    startAction: "Start a group buy",
    status: { open: "Open", "closing-soon": "Closing soon", closed: "Closed" } as Record<GroupBuyStatus, string>,
    closesAt: "Orders close",
    handover: "Ready",
    participants: (n: number) => `${n} joined`,
    pickup: "Pickup",
    delivery: "Delivery",
    pickupOnly: "Pickup only",
    deliveryFee: "Delivery",
    freeOver: (amount: string) => `Free over ${amount}`,
    perPerson: (n: number) => `Max ${n} per person`,
    ordered: (n: number) => `${n} ordered`,
    addToOrder: "Add",
    yourOrder: "Your order",
    emptyOrder: "Nothing added yet. Pick your items above.",
    itemsTotal: "Items",
    subtotal: "Subtotal",
    total: "Total to pay",
    minimumNotice: (amount: string) => `Minimum order is ${amount}.`,
    reviewOrder: "Review order",
    backToGroupBuy: "Back to the group buy",
    orderTitle: "Your group buy order",
    orderIntro: "Check the list, choose how you want it, then pay by bank transfer using your reference.",
    howToGetIt: "How do you want it?",
    pickupNote: "Pickup",
    deliveryNote: "Delivery",
    yourDetails: "Your details",
    name: "Name",
    phone: "Phone",
    deliveryAddress: "Delivery address",
    note: "Note for the seller (optional)",
    payment: "Payment",
    paymentIntro: "Tada does not take payment. Transfer to the seller directly and put your reference in the transfer details so they can match it.",
    reference: "Reference",
    accountName: "Account name",
    accountNumber: "Account number",
    submitOrder: "Place order",
    submitNote: "The seller sees your order the moment you place it.",
    sellerOrdersTitle: "Orders in this round",
    sellerOrdersIntro: "Everyone who has joined, what they ordered and how they want it.",
    exportCsv: "Download as spreadsheet",
    paid: "Paid",
    awaitingPayment: "Awaiting payment",
    confirmingPayment: "Confirming payment…",
    paymentUpdateFailed: "Could not update the payment status. Please try again.",
    totals: "Round totals",
    packingList: "Packing list",
    packingIntro: "How many of each item to bake or pack in total.",
    buyer: "Buyer",
    items: "Items",
    method: "Method",
    orderTotal: "Total",
    placed: "Placed",
    createTitle: "Start a group buy",
    createDescription: "Set the items and the price once. Everyone orders from the same list.",
    basics: "The basics",
    itemsStep: "Items and prices",
    fulfilmentStep: "Pickup and delivery",
    paymentStep: "Payment reference",
    reviewStep: "Before you post",
    addItem: "Add another item",
    removeItem: "Remove item",
    itemName: "Item name",
    itemNote: "Short note",
    itemPrice: "Price (NZD)",
    itemUnit: "Unit",
    itemLimit: "Limit per person (optional)",
    itemPhoto: "Photo",
    addPhoto: "Add photo",
    removePhoto: "Remove photo",
    reuseTitle: "Run it again",
    reuseIntro: "Load the items, prices and handover details from a round you have already run. Set the new dates and post.",
    reuseAction: "Use this round",
    reuseApplied: (title: string) => `Loaded from "${title}". Set the new dates below — everything else is ready.`,
    reuseClear: "Start from blank",
    reuseItemCount: (n: number) => `${n} items`,
    datesNeeded: "New dates",
    publish: "Post group buy",
  },
  ko: {
    heroTitle: "같이 사면 더 쌉니다.",
    heroDescription: "이웃끼리 한 번에 주문해서 모두 도매가로 받아요.",
    browseLabel: "진행 중인 공동구매",
    count: (n: number) => `공동구매 ${n}건`,
    startAction: "공동구매 열기",
    status: { open: "진행 중", "closing-soon": "마감 임박", closed: "마감" } as Record<GroupBuyStatus, string>,
    closesAt: "주문 마감",
    handover: "수령",
    participants: (n: number) => `${n}명 참여`,
    pickup: "직접 수령",
    delivery: "택배·배달",
    pickupOnly: "직접 수령만",
    deliveryFee: "배송비",
    freeOver: (amount: string) => `${amount} 이상 무료`,
    perPerson: (n: number) => `1인 최대 ${n}개`,
    ordered: (n: number) => `${n}개 주문됨`,
    addToOrder: "담기",
    yourOrder: "내 주문",
    emptyOrder: "아직 담은 상품이 없습니다. 위에서 골라 주세요.",
    itemsTotal: "상품",
    subtotal: "상품 합계",
    total: "결제할 금액",
    minimumNotice: (amount: string) => `최소 주문 금액은 ${amount}입니다.`,
    reviewOrder: "주문서 작성",
    backToGroupBuy: "공동구매로 돌아가기",
    orderTitle: "공동구매 신청서",
    orderIntro: "상품을 확인하고 수령 방법을 고른 뒤, 레퍼런스를 넣어 계좌로 입금해 주세요.",
    howToGetIt: "어떻게 받으시겠어요?",
    pickupNote: "직접 수령",
    deliveryNote: "택배·배달",
    yourDetails: "신청자 정보",
    name: "이름",
    phone: "연락처",
    deliveryAddress: "배송지 주소",
    note: "판매자에게 남길 말 (선택)",
    payment: "입금",
    paymentIntro: "Tada는 결제를 대행하지 않습니다. 판매자 계좌로 직접 입금하시고, 입금자명 또는 메모에 레퍼런스를 꼭 적어 주세요.",
    reference: "레퍼런스",
    accountName: "예금주",
    accountNumber: "계좌번호",
    submitOrder: "신청서 제출",
    submitNote: "제출하는 즉시 판매자에게 주문이 전달됩니다.",
    sellerOrdersTitle: "이번 회차 주문 현황",
    sellerOrdersIntro: "참여자와 주문 내역, 수령 방법을 한눈에 봅니다.",
    exportCsv: "엑셀로 저장",
    paid: "입금 확인",
    awaitingPayment: "입금 대기",
    confirmingPayment: "입금 확인 중…",
    paymentUpdateFailed: "입금 상태를 변경하지 못했습니다. 다시 시도해 주세요.",
    totals: "회차 합계",
    packingList: "준비 수량",
    packingIntro: "상품별로 총 몇 개를 준비해야 하는지 보여줍니다.",
    buyer: "신청자",
    items: "주문 상품",
    method: "수령",
    orderTotal: "합계",
    placed: "신청 시각",
    createTitle: "공동구매 열기",
    createDescription: "상품과 가격을 한 번만 정하면, 모두 같은 목록에서 주문합니다.",
    basics: "기본 정보",
    itemsStep: "상품과 가격",
    fulfilmentStep: "수령 방법",
    paymentStep: "입금 레퍼런스",
    reviewStep: "게시 전 확인",
    addItem: "상품 추가",
    removeItem: "상품 삭제",
    itemName: "상품명",
    itemNote: "짧은 설명",
    itemPrice: "가격 (NZD)",
    itemUnit: "단위",
    itemLimit: "1인 최대 수량 (선택)",
    itemPhoto: "사진",
    addPhoto: "사진 추가",
    removePhoto: "사진 삭제",
    reuseTitle: "지난 공구 다시 열기",
    reuseIntro: "전에 진행한 공구의 상품·가격·수령 방법을 그대로 불러옵니다. 날짜만 새로 정해서 올리세요.",
    reuseAction: "이 공구로 열기",
    reuseApplied: (title: string) => `'${title}'에서 불러왔습니다. 아래 날짜만 새로 정하면 됩니다.`,
    reuseClear: "처음부터 쓰기",
    reuseItemCount: (n: number) => `상품 ${n}개`,
    datesNeeded: "새 일정",
    publish: "공동구매 게시",
  },
} as const;

export function groupBuyText(locale: string) {
  return locale === "ko" ? copy.ko : copy.en;
}
