// Services preview data and copy. It lives outside the components so the page
// and its filter rail can share one source without importing each other.

export type ServiceCategoryId = "cleaning" | "moving" | "handyman" | "gardening" | "beauty" | "tutoring" | "petCare" | "auto";
export type ServiceId = "sparkle-clean" | "fixit-furniture" | "math-mentors" | "moving-help" | "garden-lawn" | "beauty-services" | "happy-paws" | "auto-repair";
export type TrustPointId = "verified" | "payments" | "support";
export type ServiceBadge = "verified" | "highlyRated" | "topRated" | "fastResponder" | "new" | "sponsored" | "popular";

export type ServiceListing = {
  id: string;
  category: ServiceCategoryId;
  badges: ServiceBadge[];
  provider: string;
  phone: string;
  providerType: "individuals" | "businesses";
  availability: "today" | "this-week";
  rating: number;
  reviewCount: number;
  image: string;
  location?: string;
  price?: string;
  imageAlt?: string;
};

export const serviceCategories: Array<{ id: ServiceCategoryId; icon: string }> = [
  { id: "cleaning", icon: "fa-utensils" },
  { id: "handyman", icon: "fa-hammer" },
  { id: "moving", icon: "fa-truck" },
  { id: "auto", icon: "fa-car" },
  { id: "gardening", icon: "fa-seedling" },
  { id: "tutoring", icon: "fa-graduation-cap" },
  { id: "beauty", icon: "fa-scissors" },
  { id: "petCare", icon: "fa-paw" },
];

const serviceCategoryLabels = {
  en: {
    cleaning: "Food & Catering", handyman: "Home & Trades", moving: "Moving & Transport", auto: "Automotive",
    gardening: "Gardening", tutoring: "Tutoring", beauty: "Beauty", petCare: "Pet Care",
  },
  ko: {
    cleaning: "음식·케이터링", handyman: "집수리·전문기술", moving: "이사·운송", auto: "자동차",
    gardening: "정원 관리", tutoring: "과외", beauty: "뷰티", petCare: "펫 케어",
  },
} as const satisfies Record<"en" | "ko", Record<ServiceCategoryId, string>>;

export const services: ServiceListing[] = [
  { id: "sparkle-clean", category: "cleaning", badges: ["verified", "highlyRated", "fastResponder", "popular"], provider: "Sparkle Clean", phone: "021 482 1936", providerType: "businesses", availability: "today", rating: 4.9, reviewCount: 126, image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=720&q=85" },
  { id: "fixit-furniture", category: "handyman", badges: ["verified", "highlyRated", "topRated"], provider: "FixIt Hamilton", phone: "021 391 2084", providerType: "individuals", availability: "this-week", rating: 4.9, reviewCount: 98, image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=720&q=85" },
  { id: "math-mentors", category: "tutoring", badges: ["highlyRated", "topRated", "fastResponder"], provider: "Math Mentors", phone: "021 705 4462", providerType: "individuals", availability: "today", rating: 4.8, reviewCount: 64, image: "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=720&q=85" },
  { id: "moving-help", category: "moving", badges: ["verified", "fastResponder", "new"], provider: "Move It", phone: "021 668 9201", providerType: "businesses", availability: "today", rating: 4.8, reviewCount: 46, image: "https://images.unsplash.com/photo-1600518464441-9154a4dea21b?auto=format&fit=crop&w=720&q=85" },
  { id: "garden-lawn", category: "gardening", badges: ["verified", "popular"], provider: "Green Thumb", phone: "021 295 1187", providerType: "individuals", availability: "this-week", rating: 4.7, reviewCount: 41, image: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=720&q=85" },
  { id: "beauty-services", category: "beauty", badges: ["highlyRated", "topRated", "sponsored"], provider: "Glow On The Go", phone: "021 864 5509", providerType: "individuals", availability: "this-week", rating: 4.9, reviewCount: 72, image: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=720&q=85" },
  { id: "happy-paws", category: "petCare", badges: ["verified", "highlyRated", "fastResponder"], provider: "Happy Paws", phone: "021 490 7761", providerType: "businesses", availability: "today", rating: 4.8, reviewCount: 53, image: "https://images.unsplash.com/photo-1558788353-f76d92427f16?auto=format&fit=crop&w=720&q=85" },
  { id: "auto-repair", category: "auto", badges: ["verified", "highlyRated", "popular"], provider: "Pro Auto Hamilton", phone: "021 329 6174", providerType: "businesses", availability: "this-week", rating: 4.9, reviewCount: 112, image: "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&w=720&q=85" },
];

export function serviceBadgeLabel(badge: ServiceBadge, locale: string) {
  const labels = locale === "ko"
    ? { verified: "인증됨", highlyRated: "높은 평점", topRated: "최고 평점", fastResponder: "빠른 응답", new: "신규", sponsored: "스폰서", popular: "인기" }
    : { verified: "Verified", highlyRated: "Highly Rated", topRated: "Top Rated", fastResponder: "Fast Responder", new: "New", sponsored: "Sponsored", popular: "Popular" };
  return labels[badge];
}

export const trustPoints: Array<{ id: TrustPointId; icon: string }> = [
  { id: "verified", icon: "fa-shield-halved" },
  { id: "payments", icon: "fa-lock" },
  { id: "support", icon: "fa-headset" },
];

const serviceCopy = {
  en: {
    heroTitle: "Find trusted local services near you.",
    heroDescription: "Browse local providers, compare reviews, and contact them directly.",
    filters: "Filters",
    serviceType: "Service type",
    allCategories: "All categories",
    priceRange: "Price range",
    anyPrice: "Any price",
    underFifty: "Under $50 / hr",
    fiftyToHundred: "$50–$100 / hr",
    overHundred: "Over $100 / hr",
    availability: "Availability",
    anytime: "Anytime",
    thisWeek: "This week",
    rating: "Rating",
    anyRating: "Any rating",
    fourFiveAbove: "4.5 and above",
    fourAbove: "4.0 and above",
    verified: "Verification",
    verifiedOnly: "Verified only",
    applyFilters: "Apply filters",
    popularServices: "Popular services near Hamilton",
    categoryNearby: (category: string) => `${category} near Hamilton`,
    serviceCount: (count: number) => `${count} ${count === 1 ? "service" : "services"} previewed`,
    saveService: (service: string) => `Save ${service}`,
    whyTadaServices: "Why use Tada Services",
    providerLabel: "For providers",
    providerTitle: "Grow your local service.",
    providerDescription: "Meet more local customers with a trusted Tada profile.",
    providerAction: "For service providers",
    sidebarAdLabel: "Sponsored",
    sidebarAdTitle: "A fresher home starts here.",
    sidebarAdDescription: "Find a trusted local cleaner on Tada Services.",
    sidebarAdAction: "Explore cleaning",
    trustAction: "How Tada Services works",
    requestEyebrow: "Can't find what you need?",
    requestTitle: "Tell local providers what you're looking for.",
    requestDescription: "Service requests will make it easy to get offers from the right people.",
    requestAction: "Request a service",
    saveNotice: (service: string) => `${service} can be saved when Services launches.`,
    providerNotice: "Provider profiles will be available when Services launches.",
    trustNotice: "More about Tada Services is coming soon.",
    requestNotice: "Service requests will be available when Services launches.",
    quickFilters: { availableToday: "Available today", verified: "Verified", topRated: "Top rated", lowPrice: "Low price", nearMe: "Near me" },
    trust: {
      verified: { title: "Verified & reviewed", description: "Every provider goes through our verification process." },
      payments: { title: "Safe payments", description: "Pay safely through Tada when booking opens." },
      support: { title: "Local support", description: "Our team is here to help before and after a service." },
    },
    listings: {
      "sparkle-clean": { badge: "Available today", title: "Home cleaning", charge: "Tada Charge 88%", location: "Hamilton Central", price: "From $40 / hr", imageAlt: "A cleaner making a bed in a bright home" },
      "fixit-furniture": { badge: "Verified", title: "Furniture assembly", charge: "Tada Charge 90%", location: "Frankton", price: "From $60 / hr", imageAlt: "A craftsman preparing furniture in a room" },
      "math-mentors": { badge: "Top rated", title: "Math tutoring", charge: "Tada Charge 91%", location: "Hamilton East", price: "From $35 / hr", imageAlt: "A tutor helping a student with schoolwork" },
      "moving-help": { badge: "Available today", title: "Moving help", charge: "Tada Charge 89%", location: "Hamilton North", price: "From $120 / hr", imageAlt: "A mover carrying a cardboard box" },
      "garden-lawn": { badge: "Verified", title: "Garden & lawn care", charge: "Tada Charge 83%", location: "Rototuna", price: "From $45 / hr", imageAlt: "A gardener working among green plants" },
      "beauty-services": { badge: "Top rated", title: "Mobile beauty services", charge: "Tada Charge 92%", location: "Hamilton Central", price: "From $60 / hr", imageAlt: "A beauty professional applying makeup" },
      "happy-paws": { badge: "Verified", title: "Pet sitting", charge: "Tada Charge 87%", location: "Hamilton East", price: "From $30 / hr", imageAlt: "A dog sitting with its owner outdoors" },
      "auto-repair": { badge: "Verified", title: "Auto repair & service", charge: "Tada Charge 94%", location: "Frankton", price: "From $80 / hr", imageAlt: "A mechanic working under a car bonnet" },
    },
    sponsored: "Sponsored",
    sponsorTitle: "Reach more local customers",
    sponsorDescription: "Promote your service on Tada and stand out locally.",
    benefits: ["Reach more locals", "Build trust and credibility", "More enquiries, locally"],
    learnMore: "Learn more",
    message: "Message",
    viewProfile: "View profile",
    providerType: "Provider type",
    allProviders: "All",
    individuals: "Individuals",
    businesses: "Businesses",
    serviceDescription: "Trusted help from local providers.",
    openFilters: "Open service filters",
    closeFilters: "Close service filters",
  },
  ko: {
    heroTitle: "가까운 곳에서 찾는 믿을 수 있는 도움.",
    heroDescription: "지역 전문가를 찾아보고 후기를 비교한 뒤 바로 연락해 보세요.",
    filters: "필터",
    serviceType: "서비스 종류",
    allCategories: "전체 카테고리",
    priceRange: "가격대",
    anyPrice: "가격 전체",
    underFifty: "시간당 $50 미만",
    fiftyToHundred: "시간당 $50–$100",
    overHundred: "시간당 $100 초과",
    availability: "이용 가능 시간",
    anytime: "언제든지",
    thisWeek: "이번 주",
    rating: "평점",
    anyRating: "평점 전체",
    fourFiveAbove: "4.5점 이상",
    fourAbove: "4.0점 이상",
    verified: "인증 여부",
    verifiedOnly: "인증된 제공자만",
    applyFilters: "필터 적용",
    popularServices: "해밀턴에서 인기 있는 서비스",
    categoryNearby: (category: string) => `해밀턴 주변 ${category}`,
    serviceCount: (count: number) => `${count}개 서비스 미리보기`,
    saveService: (service: string) => `${service} 찜하기`,
    whyTadaServices: "Tada 서비스를 이용하는 이유",
    providerLabel: "서비스 제공자용",
    providerTitle: "내 지역 서비스 고객을 만나보세요.",
    providerDescription: "신뢰할 수 있는 Tada 프로필로 더 많은 지역 고객에게 다가갈 수 있습니다.",
    providerAction: "서비스 제공자 안내",
    sidebarAdLabel: "광고",
    sidebarAdTitle: "더 산뜻한 우리 집, 오늘부터.",
    sidebarAdDescription: "Tada Services에서 믿을 수 있는 지역 청소 서비스를 찾아보세요.",
    sidebarAdAction: "청소 서비스 보기",
    trustAction: "Tada 서비스 이용 방법",
    requestEyebrow: "원하는 서비스를 찾지 못하셨나요?",
    requestTitle: "필요한 일을 지역 전문가에게 알려주세요.",
    requestDescription: "서비스 요청을 올리면 알맞은 전문가의 제안을 쉽게 받아볼 수 있습니다.",
    requestAction: "서비스 요청하기",
    saveNotice: (service: string) => `${service} 찜하기는 서비스 출시 후 이용할 수 있습니다.`,
    providerNotice: "서비스 제공자 프로필은 서비스 출시 후 이용할 수 있습니다.",
    trustNotice: "Tada 서비스에 대한 자세한 안내를 곧 제공할 예정입니다.",
    requestNotice: "서비스 요청 기능은 서비스 출시 후 이용할 수 있습니다.",
    quickFilters: { availableToday: "오늘 가능", verified: "인증됨", topRated: "높은 평점", lowPrice: "낮은 가격", nearMe: "내 주변" },
    trust: {
      verified: { title: "인증 및 후기 확인", description: "모든 제공자는 Tada의 확인 절차를 거칩니다." },
      payments: { title: "안전한 결제", description: "예약 기능이 열리면 Tada에서 안전하게 결제할 수 있습니다." },
      support: { title: "지역 고객 지원", description: "서비스 전후로 Tada 팀이 도와드립니다." },
    },
    listings: {
      "sparkle-clean": { badge: "오늘 가능", title: "집 청소", charge: "Tada Charge 88%", location: "해밀턴 센트럴", price: "시간당 $40부터", imageAlt: "밝은 집에서 침대를 정리하는 청소 전문가" },
      "fixit-furniture": { badge: "인증됨", title: "가구 조립", charge: "Tada Charge 90%", location: "프랭크턴", price: "시간당 $60부터", imageAlt: "실내에서 가구를 준비하는 전문가" },
      "math-mentors": { badge: "높은 평점", title: "수학 과외", charge: "Tada Charge 91%", location: "해밀턴 이스트", price: "시간당 $35부터", imageAlt: "학생의 공부를 돕는 과외 선생님" },
      "moving-help": { badge: "오늘 가능", title: "이사 도움", charge: "Tada Charge 89%", location: "해밀턴 노스", price: "시간당 $120부터", imageAlt: "상자를 들고 있는 이사 전문가" },
      "garden-lawn": { badge: "인증됨", title: "정원 및 잔디 관리", charge: "Tada Charge 83%", location: "로토투나", price: "시간당 $45부터", imageAlt: "초록 식물 사이에서 일하는 정원 관리사" },
      "beauty-services": { badge: "높은 평점", title: "방문 뷰티 서비스", charge: "Tada Charge 92%", location: "해밀턴 센트럴", price: "시간당 $60부터", imageAlt: "메이크업을 해주는 뷰티 전문가" },
      "happy-paws": { badge: "인증됨", title: "펫시팅", charge: "Tada Charge 87%", location: "해밀턴 이스트", price: "시간당 $30부터", imageAlt: "반려견과 함께 있는 펫시터" },
      "auto-repair": { badge: "인증됨", title: "자동차 정비 및 수리", charge: "Tada Charge 94%", location: "프랭크턴", price: "시간당 $80부터", imageAlt: "자동차 보닛 아래에서 작업하는 정비사" },
    },
    sponsored: "스폰서",
    sponsorTitle: "더 많은 지역 고객에게 서비스를 알려보세요",
    sponsorDescription: "Tada에서 내 서비스를 홍보하고 지역 고객을 만나보세요.",
    benefits: ["더 많은 지역 고객에게 노출", "신뢰도와 인지도 향상", "더 많은 지역 문의"],
    learnMore: "자세히 보기",
    message: "메시지",
    viewProfile: "프로필 보기",
    providerType: "제공자 유형",
    allProviders: "전체",
    individuals: "개인",
    businesses: "업체",
    serviceDescription: "가까운 곳에서 믿을 수 있는 서비스를 찾아보세요.",
    openFilters: "서비스 필터 열기",
    closeFilters: "서비스 필터 닫기",
  },
};

// Left un-narrowed on purpose: with `as const` every string becomes its own
// literal type and the Korean table stops matching the English shape.
export type ServicesText = (typeof serviceCopy)["en"];

export function servicesText(locale: string): ServicesText {
  return locale === "ko" ? serviceCopy.ko : serviceCopy.en;
}

export function servicesCategoryLabels(locale: string): Record<ServiceCategoryId, string> {
  return serviceCategoryLabels[locale === "ko" ? "ko" : "en"];
}

type ServiceDetailLocale = "en" | "ko";
type LocalizedText = Record<ServiceDetailLocale, string>;

type ServiceDetailOptionDefinition = {
  value: string;
  label: LocalizedText;
};

type ServiceDetailFieldDefinition = {
  key: string;
  input: "text" | "number" | "select";
  label: LocalizedText;
  placeholder?: LocalizedText;
  options?: readonly ServiceDetailOptionDefinition[];
  min?: number;
  step?: number;
};

export type ServiceDetailField = Omit<ServiceDetailFieldDefinition, "label" | "placeholder" | "options"> & {
  label: string;
  placeholder?: string;
  options?: ReadonlyArray<{ value: string; label: string }>;
};

const localized = (en: string, ko: string): LocalizedText => ({ en, ko });
const option = (value: string, en: string, ko: string): ServiceDetailOptionDefinition => ({ value, label: localized(en, ko) });

const priceFields = (units: readonly ServiceDetailOptionDefinition[]): readonly ServiceDetailFieldDefinition[] => [
  { key: "price_from", input: "number", label: localized("Starting price (NZD)", "시작 금액 (NZD)"), placeholder: localized("e.g. 45", "예: 45"), min: 0, step: 1 },
  { key: "price_unit", input: "select", label: localized("Price unit", "금액 기준"), options: units },
];

const serviceDetailDefinitions: Record<ServiceCategoryId, readonly ServiceDetailFieldDefinition[]> = {
  cleaning: [
    { key: "service_type", input: "select", label: localized("Catering service", "케이터링 서비스"), options: [option("catering", "Catering", "케이터링"), option("private-chef", "Private chef", "프라이빗 셰프"), option("meal-prep", "Meal preparation", "식사 준비"), option("food-stall", "Food stall", "푸드 스톨")] },
    { key: "minimum_guests", input: "number", label: localized("Minimum guests or orders", "최소 인원 또는 주문 수"), placeholder: localized("e.g. 10", "예: 10"), min: 1, step: 1 },
    ...priceFields([option("person", "Per person", "1인 기준"), option("job", "Per job", "건당"), option("quote", "Quote", "견적")]),
  ],
  handyman: [
    { key: "service_type", input: "select", label: localized("Specialty", "전문 서비스"), options: [option("repairs", "Repairs", "수리"), option("assembly", "Assembly", "조립"), option("painting", "Painting", "페인트"), option("electrical", "Electrical", "전기"), option("plumbing", "Plumbing", "배관")] },
    ...priceFields([option("hour", "Per hour", "시간당"), option("visit", "Per visit", "방문당"), option("job", "Per job", "건당")]),
  ],
  moving: [
    { key: "service_type", input: "select", label: localized("Moving service", "이사 서비스"), options: [option("house-move", "House move", "가정 이사"), option("furniture", "Furniture delivery", "가구 운송"), option("packing", "Packing help", "포장 도움"), option("rubbish", "Rubbish removal", "폐기물 처리")] },
    { key: "vehicle", input: "select", label: localized("Vehicle", "차량"), options: [option("ute", "Ute", "유트"), option("van", "Van", "밴"), option("truck", "Truck", "트럭"), option("multiple", "Multiple vehicles", "복수 차량")] },
    ...priceFields([option("hour", "Per hour", "시간당"), option("job", "Per job", "건당"), option("quote", "Quote", "견적")]),
  ],
  auto: [
    { key: "service_type", input: "select", label: localized("Automotive service", "자동차 서비스"), options: [option("repair", "Repairs", "정비·수리"), option("service", "Routine servicing", "정기 점검"), option("detailing", "Detailing", "디테일링"), option("tyres", "Tyres", "타이어")] },
    { key: "vehicle_types", input: "text", label: localized("Vehicle types served", "가능 차량"), placeholder: localized("e.g. Cars, SUVs", "예: 승용차, SUV") },
    ...priceFields([option("job", "Per job", "건당"), option("hour", "Per hour", "시간당"), option("quote", "Quote", "견적")]),
  ],
  gardening: [
    { key: "service_type", input: "select", label: localized("Garden service", "정원 서비스"), options: [option("lawn", "Lawn mowing", "잔디 관리"), option("tidy", "Garden tidy-up", "정원 정리"), option("hedges", "Hedge trimming", "울타리 전정"), option("landscaping", "Landscaping", "조경") ] },
    { key: "garden_size", input: "select", label: localized("Typical garden size", "주요 작업 규모"), options: [option("small", "Small", "소형"), option("medium", "Medium", "중형"), option("large", "Large", "대형"), option("any", "Any size", "규모 무관")] },
    ...priceFields([option("hour", "Per hour", "시간당"), option("visit", "Per visit", "방문당"), option("job", "Per job", "건당")]),
  ],
  tutoring: [
    { key: "subject", input: "text", label: localized("Subject", "과목"), placeholder: localized("e.g. NCEA Level 2 Maths", "예: NCEA Level 2 수학") },
    { key: "learner_level", input: "select", label: localized("Learner level", "학습 수준"), options: [option("primary", "Primary school", "초등"), option("secondary", "Secondary school", "중·고등"), option("ncea", "NCEA", "NCEA"), option("adult", "Adult", "성인")] },
    { key: "lesson_duration", input: "select", label: localized("Lesson duration", "수업 시간"), options: [option("30", "30 minutes", "30분"), option("45", "45 minutes", "45분"), option("60", "60 minutes", "60분"), option("90", "90 minutes", "90분")] },
    ...priceFields([option("hour", "Per hour", "시간당")]),
  ],
  beauty: [
    { key: "service_type", input: "select", label: localized("Beauty service", "뷰티 서비스"), options: [option("hair", "Hair", "헤어"), option("nails", "Nails", "네일"), option("makeup", "Makeup", "메이크업"), option("massage", "Massage", "마사지") ] },
    { key: "appointment_duration", input: "select", label: localized("Appointment length", "시술 시간"), options: [option("30", "30 minutes", "30분"), option("60", "60 minutes", "60분"), option("90", "90 minutes", "90분"), option("120", "120 minutes", "120분")] },
    ...priceFields([option("session", "Per session", "회당"), option("hour", "Per hour", "시간당")]),
  ],
  petCare: [
    { key: "service_type", input: "select", label: localized("Pet care service", "펫 케어 서비스"), options: [option("sitting", "Pet sitting", "펫시팅"), option("walking", "Dog walking", "산책"), option("grooming", "Grooming", "미용"), option("boarding", "Boarding", "호텔·위탁") ] },
    { key: "pet_types", input: "text", label: localized("Pets cared for", "돌봄 가능 반려동물"), placeholder: localized("e.g. Dogs, cats", "예: 강아지, 고양이") },
    ...priceFields([option("hour", "Per hour", "시간당"), option("day", "Per day", "하루당"), option("visit", "Per visit", "방문당")]),
  ],
};

export function serviceDetailFields(category: ServiceCategoryId, locale: string): ServiceDetailField[] {
  const language: ServiceDetailLocale = locale === "ko" ? "ko" : "en";
  return serviceDetailDefinitions[category].map((field) => ({
    ...field,
    label: field.label[language],
    placeholder: field.placeholder?.[language],
    options: field.options?.map((item) => ({ value: item.value, label: item.label[language] })),
  }));
}

export function serviceDetailsSummary(category: ServiceCategoryId, details: Record<string, unknown>, locale: string): Array<{ label: string; value: string }> {
  return serviceDetailFields(category, locale).flatMap((field) => {
    const rawValue = details[field.key];
    if (typeof rawValue !== "string" || !rawValue) return [];
    if (field.key === "price_from") return [];
    if (field.key === "price_unit") {
      const amount = details.price_from;
      if (typeof amount !== "string" || !amount) return [];
      const unit = field.options?.find((option) => option.value === rawValue)?.label ?? rawValue;
      return [{ label: locale === "ko" ? "가격" : "Price", value: `$${Number(amount).toLocaleString()} · ${unit}` }];
    }
    return [{ label: field.label, value: field.options?.find((option) => option.value === rawValue)?.label ?? rawValue }];
  });
}
