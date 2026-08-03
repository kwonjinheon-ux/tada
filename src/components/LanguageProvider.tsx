"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export const supportedLocales = ["en", "ko", "zh", "ja", "es", "hi", "ar"] as const;
export type SupportedLocale = (typeof supportedLocales)[number];

export const languageOptions: Array<{ code: SupportedLocale; flag: string; label: string; nativeLabel: string }> = [
  { code: "en", flag: "🇳🇿", label: "English", nativeLabel: "English" },
  { code: "ko", flag: "🇰🇷", label: "Korean", nativeLabel: "한국어" },
  { code: "zh", flag: "🇨🇳", label: "Chinese", nativeLabel: "中文" },
  { code: "ja", flag: "🇯🇵", label: "Japanese", nativeLabel: "日本語" },
  { code: "es", flag: "🇪🇸", label: "Spanish", nativeLabel: "Español" },
  { code: "hi", flag: "🇮🇳", label: "Hindi", nativeLabel: "हिन्दी" },
  { code: "ar", flag: "🇸🇦", label: "Arabic", nativeLabel: "العربية" },
];

const copy = {
  en: {
    search: "Search for items...", market: "Market", jobs: "Jobs", create: "Create", home: "Home", messages: "Messages", categories: "Categories", more: "More",
    dashboard: "Dashboard", profileSettings: "Profile Settings", notifications: "Notifications", wishlist: "Wishlist", keywords: "Keywords", manageListings: "Manage Listings", nearbyMap: "Nearby Map", logOut: "Log out",
    languageSettings: "Language Settings", displayLanguage: "Display language", supportedNow: "English and Korean are available now. Other languages are saved for upcoming translations.", languageSaved: "Language preference saved.",
    account: "Account", security: "Security", emailAddress: "Email Address", phoneNumber: "Phone Number", nickname: "Nickname", password: "Password", currentPassword: "Current Password", newPassword: "New Password", confirmNewPassword: "Confirm New Password", updatePassword: "Update Password", save: "Save", cancel: "Cancel", update: "Update", verify: "Verify", verified: "Verified", changeEmail: "Change Email", changePhoneNumber: "Change Phone Number", verifyCode: "Verify code",
    contactPreferences: "Contact Preferences", allowChat: "Allow Chat", showPhoneNumber: "Show Phone Number", receiveEmailNotifications: "Receive Email Notifications", chatMessages: "Chat messages", inAppNotifications: "In-app notifications for new chats", priceUpdates: "Price Updates", weeklyNewsletter: "Weekly newsletters and transaction info", smsAlerts: "SMS Alerts", criticalAlerts: "Critical account alerts via text", reviews: "Reviews",
    locationPrivacy: "Location & Privacy", locationAccess: "Location access", usingCurrentLocation: "Using your current location", setManually: "Set manually", useCurrentLocation: "Use current location", enterManually: "Enter manually", city: "City", suburbArea: "Suburb / Area", selectCity: "Select a city", selectSuburb: "Select a suburb", locationPrivacyNote: "Your location data is encrypted and never shared with third-party advertisers.", saveChanges: "Save changes", discard: "Discard", saving: "Saving...", logout: "Logout", loggingOut: "Logging out...",
    all: "All", unread: "Unread", buying: "Buying", selling: "Selling", marketplace: "Marketplace", accountOverview: "Account overview", listings: "Listings", active: "Active", items: "Items", tracked: "Tracked", new: "New", trustPower: "Trust Power", earnTrade: "Earn 1% for every completed trade", performanceInsights: "Performance Insights", totalViews: "Total Views", totalSaves: "Total Saves", sales: "Sales", allTime: "All time", activeListings: "Active Listings", activeJobPosts: "Active Job Posts", viewAll: "View all", activity: "Activity", showAllActivity: "Show All Activity", recentActivityEmpty: "Your recent marketplace activity will appear here.", boostSales: "Boost Your Sales", boostSalesCopy: "Professional photos help listings get noticed.", tryTadaLens: "Try Tada Lens", inTrade: "In trade", viewTrade: "View trade", manage: "Manage", edit: "Edit", postNewListing: "Post New Listing", postNewJob: "Post New Job", postListingHint: "Show the world what you have", manageActivity: "Manage activity", openProfileSettings: "Open profile settings",
    createListing: "Create listing", totalListings: "total listings", noListingsYet: "No listings yet", firstListingHint: "Create your first listing to start selling on Tada.", available: "Available", pending: "Pending", soldOut: "Sold out", noMatchingListings: "No matching listings", tryDifferentSearch: "Try a different search or category.", category: "Category", condition: "Condition", applyFilters: "Apply Filters", maxPrice: "Max Price (NZD)", any: "Any", newest: "Newest", lowToHigh: "Low to High", highToLow: "High to Low", recommended: "Recommended", markAllRead: "Mark all read", keywordAlerts: "Keyword alerts", keywordAlertsHint: "Get notified when new marketplace listings match what you are looking for.", addKeyword: "Add keyword", yourKeywords: "Your keywords", noKeywordAlerts: "No keyword alerts yet", addKeywordHint: "Add a keyword to receive new listing alerts.", keywordPlaceholder: "e.g. Laptop, Sofa, Bicycle", keywordInputLabel: "Keyword", keywordNoticeLabel: "Keyword alert information", keywordNotice: "Add up to 20 keywords to make your marketplace search more personal.",
  },
  ko: {
    search: "물품 검색...", market: "마켓", jobs: "일자리", create: "등록", home: "홈", messages: "메시지", categories: "카테고리", more: "더보기",
    dashboard: "대시보드", profileSettings: "프로필 설정", notifications: "알림", wishlist: "찜 목록", keywords: "키워드", manageListings: "판매 관리", nearbyMap: "내 주변 지도", logOut: "로그아웃",
    languageSettings: "언어 설정", displayLanguage: "표시 언어", supportedNow: "영어와 한국어는 지금 바로 지원됩니다. 다른 언어는 향후 번역을 위해 설정값만 저장됩니다.", languageSaved: "언어 설정이 저장되었습니다.",
    account: "계정", security: "보안", emailAddress: "이메일 주소", phoneNumber: "전화번호", nickname: "닉네임", password: "비밀번호", currentPassword: "현재 비밀번호", newPassword: "새 비밀번호", confirmNewPassword: "새 비밀번호 확인", updatePassword: "비밀번호 변경", save: "저장", cancel: "취소", update: "수정", verify: "인증", verified: "인증됨", changeEmail: "이메일 변경", changePhoneNumber: "전화번호 변경", verifyCode: "인증 코드 확인",
    contactPreferences: "연락처 설정", allowChat: "채팅 허용", showPhoneNumber: "전화번호 표시", receiveEmailNotifications: "이메일 알림 받기", chatMessages: "채팅 메시지", inAppNotifications: "새 채팅 인앱 알림", priceUpdates: "가격 업데이트", weeklyNewsletter: "주간 뉴스레터 및 거래 정보", smsAlerts: "SMS 알림", criticalAlerts: "중요 계정 알림 문자", reviews: "후기",
    locationPrivacy: "위치 및 개인정보", locationAccess: "위치 접근", usingCurrentLocation: "현재 위치 사용 중", setManually: "직접 설정", useCurrentLocation: "현재 위치 사용", enterManually: "직접 입력", city: "도시", suburbArea: "지역 / 동네", selectCity: "도시 선택", selectSuburb: "지역 선택", locationPrivacyNote: "위치 데이터는 암호화되며 제3자 광고주와 공유되지 않습니다.", saveChanges: "변경사항 저장", discard: "변경 취소", saving: "저장 중...", logout: "로그아웃", loggingOut: "로그아웃 중...",
    all: "전체", unread: "읽지 않음", buying: "구매", selling: "판매", marketplace: "마켓플레이스", accountOverview: "계정 개요", listings: "등록 상품", active: "판매 중", items: "개", tracked: "추적 중", new: "새 메시지", trustPower: "신뢰도", earnTrade: "완료된 거래마다 1%를 획득합니다", performanceInsights: "성과 인사이트", totalViews: "총 조회수", totalSaves: "총 찜 수", sales: "판매 완료", allTime: "전체 기간", activeListings: "판매 중인 상품", activeJobPosts: "활성 채용 공고", viewAll: "전체 보기", activity: "활동", showAllActivity: "모든 활동 보기", recentActivityEmpty: "최근 마켓 활동이 이곳에 표시됩니다.", boostSales: "판매를 늘려보세요", boostSalesCopy: "전문 사진은 상품이 더 눈에 띄도록 도와줍니다.", tryTadaLens: "Tada Lens 사용", inTrade: "거래 진행 중", viewTrade: "거래 보기", manage: "관리", edit: "수정", postNewListing: "새 상품 등록", postNewJob: "새 채용 공고 등록", postListingHint: "내 상품을 세상에 보여주세요", manageActivity: "활동 관리", openProfileSettings: "프로필 설정 열기",
    createListing: "상품 등록", totalListings: "개 등록 상품", noListingsYet: "등록된 상품이 없습니다", firstListingHint: "첫 상품을 등록하고 Tada에서 판매를 시작해 보세요.", available: "판매 가능", pending: "거래 대기", soldOut: "판매 완료", noMatchingListings: "일치하는 상품이 없습니다", tryDifferentSearch: "다른 검색어나 카테고리를 시도해 보세요.", category: "카테고리", condition: "상품 상태", applyFilters: "필터 적용", maxPrice: "최대 가격 (NZD)", any: "전체", newest: "최신순", lowToHigh: "낮은 가격순", highToLow: "높은 가격순", recommended: "추천순", markAllRead: "모두 읽음 처리", keywordAlerts: "키워드 알림", keywordAlertsHint: "원하는 조건과 일치하는 새 마켓 상품이 등록되면 알려드립니다.", addKeyword: "키워드 추가", yourKeywords: "내 키워드", noKeywordAlerts: "아직 키워드 알림이 없습니다", addKeywordHint: "새 상품 알림을 받으려면 키워드를 추가하세요.", keywordPlaceholder: "예: 노트북, 소파, 자전거", keywordInputLabel: "키워드", keywordNoticeLabel: "키워드 알림 안내", keywordNotice: "최대 20개의 키워드를 추가해 마켓 검색을 더 개인화하세요.",
  },
} as const;

type TranslationKey = keyof typeof copy.en;
type LanguageContextValue = { locale: SupportedLocale; setLocale: (locale: SupportedLocale) => void; t: (key: TranslationKey) => string; isLiveTranslation: boolean };
const LanguageContext = createContext<LanguageContextValue | null>(null);
const STORAGE_KEY = "tada-preferred-locale";

const validLocale = (value: unknown): value is SupportedLocale => typeof value === "string" && supportedLocales.includes(value as SupportedLocale);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>("en");

  const setLocale = (nextLocale: SupportedLocale) => {
    setLocaleState(nextLocale);
    window.localStorage.setItem(STORAGE_KEY, nextLocale);
  };

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (validLocale(stored)) setLocaleState(stored);

    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    void supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: profile } = await supabase.from("profiles").select("preferred_locale").eq("id", data.user.id).maybeSingle();
      if (validLocale(profile?.preferred_locale)) setLocaleState(profile.preferred_locale);
    });
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);

  const value = useMemo<LanguageContextValue>(() => ({
    locale,
    setLocale,
    t: (key) => (locale === "ko" ? copy.ko[key] : copy.en[key]),
    isLiveTranslation: locale === "en" || locale === "ko",
  }), [locale]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}

export function TranslatedText({ translationKey }: { translationKey: TranslationKey }) {
  const { t } = useLanguage();
  return <>{t(translationKey)}</>;
}
