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
    search: "Search for items...", searchCommunity: "Search community posts...", searchServices: "Search local services...", market: "Market", jobs: "Jobs", services: "Services", community: "Community", create: "Create", home: "Home", messages: "Messages", categories: "Categories", more: "More",
    dashboard: "Dashboard", profileSettings: "Profile Settings", notifications: "Notifications", wishlist: "Wishlist", keywords: "Keywords", manageListings: "Manage Listings", nearbyMap: "Nearby Map", logOut: "Log out", adminCentre: "Admin centre", accountMenu: "Account", logIn: "Log in", signUp: "Sign up",
    languageSettings: "Language Settings", displayLanguage: "Display language", supportedNow: "English and Korean are available now. Other languages are saved for upcoming translations.", languageSaved: "Language preference saved.",
    account: "Account", security: "Security", emailAddress: "Email Address", phoneNumber: "Phone Number", nickname: "Nickname", password: "Password", currentPassword: "Current Password", newPassword: "New Password", confirmNewPassword: "Confirm New Password", updatePassword: "Update Password", save: "Save", cancel: "Cancel", update: "Update", verify: "Verify", verified: "Verified", changeEmail: "Change Email", changePhoneNumber: "Change Phone Number", verifyCode: "Verify code",
    contactPreferences: "Contact Preferences", allowChat: "Allow Chat", showPhoneNumber: "Show Phone Number", receiveEmailNotifications: "Receive Email Notifications", chatMessages: "Chat messages", inAppNotifications: "In-app notifications for new chats", priceUpdates: "Price Updates", weeklyNewsletter: "Weekly newsletters and transaction info", smsAlerts: "SMS Alerts", criticalAlerts: "Critical account alerts via text", reviews: "Reviews",
    locationPrivacy: "Location & Privacy", locationAccess: "Location access", usingCurrentLocation: "Using your current location", setManually: "Set manually", useCurrentLocation: "Use current location", enterManually: "Enter manually", city: "City", suburbArea: "Suburb / Area", selectCity: "Select a city", selectSuburb: "Select a suburb", locationPrivacyNote: "Your location data is encrypted and never shared with third-party advertisers.", saveChanges: "Save changes", discard: "Discard", saving: "Saving...", logout: "Logout", loggingOut: "Logging out...",
    all: "All", unread: "Unread", buying: "Buying", selling: "Selling", marketplace: "Marketplace", accountOverview: "Account overview", listings: "Listings", active: "Active", items: "Items", tracked: "Tracked", new: "New", trustPower: "Trust Power", earnTrade: "Earn 1% for every completed trade", performanceInsights: "Performance Insights", totalViews: "Total Views", totalSaves: "Total Saves", sales: "Sales", allTime: "All time", activeListings: "Active Listings", activeJobPosts: "Active Job Posts", viewAll: "View all", activity: "Activity", showAllActivity: "Show All Activity", recentActivityEmpty: "Your recent marketplace activity will appear here.", boostSales: "Boost Your Sales", boostSalesCopy: "Professional photos help listings get noticed.", tryTadaLens: "Try Tada Lens", inTrade: "In trade", viewTrade: "View trade", manage: "Manage", edit: "Edit", postNewListing: "Post New Listing", postNewJob: "Post New Job", postListingHint: "Show the world what you have", manageActivity: "Manage activity", openProfileSettings: "Open profile settings",
    createListing: "Create listing", totalListings: "total listings", noListingsYet: "No listings yet", firstListingHint: "Create your first listing to start selling on Tada.", available: "Available", pending: "Pending", soldOut: "Sold out", noMatchingListings: "No matching listings", tryDifferentSearch: "Try a different search or category.", loadingMoreListings: "Loading more listings...", category: "Category", condition: "Condition", applyFilters: "Apply Filters", maxPrice: "Max Price (NZD)", any: "Any", newest: "Newest", lowToHigh: "Low to High", highToLow: "High to Low", recommended: "Recommended", brandNew: "Brand new", likeNew: "Like new", excellent: "Excellent", good: "Good", fair: "Fair", newlyListed: "Newly listed", promotion: "Promotion", viewListing: "View listing", imageUnavailable: "Image unavailable", saveListing: "Save listing", viewMode: "View mode", listView: "List view", gridView: "Grid view", quickCategories: "Quick categories", sortListings: "Sort listings", markAllRead: "Mark all read", deleteAll: "Delete all", deleteAllConfirm: "Delete all?", select: "Select", selectAll: "Select all", selected: "selected", archive: "Archive", archived: "Archived", restore: "Restore", delete: "Delete", deleteConfirm: "Delete?", deleteArchived: "Delete archive", keywordAlerts: "Keyword alerts", keywordAlertsHint: "Get notified when new marketplace listings match what you are looking for.", addKeyword: "Add keyword", yourKeywords: "Your keywords", noKeywordAlerts: "No keyword alerts yet", addKeywordHint: "Add a keyword to receive new listing alerts.", keywordPlaceholder: "e.g. Laptop, Sofa, Bicycle", keywordInputLabel: "Keyword", keywordNoticeLabel: "Keyword alert information", keywordNotice: "Add up to 20 keywords to make your marketplace search more personal.",
    activeJourney: "Active Journey", previousJourney: "Previous journey", nextJourney: "Next journey", journeyOffer: "Offer", journeyPending: "Pending", journeyAccepted: "Accepted", journeyMeet: "Meet", journeyComplete: "Complete", newOffers: "new offers", bestOffer: "Best offer", reviewOffers: "Review offers", openConversation: "Open conversation",
    location: "Location", comingSoon: "Coming soon",
    communityCategoryLocalNoticeboard: "New Zealand Life", communityCategoryEvents: "Events", communityCategoryQnA: "Q&A", communityCategoryRecommendations: "Recommendations", communityCategoryTogether: "Let's Do It Together", communityCategoryImmigration: "Immigration, Visa & Working Holiday", communityCategoryFreeBoard: "Free Board",
    communityChipTrending: "Trending", communityChipRecent: "Recent", communityChipQuestions: "Questions", communityChipFree: "Free", communityChipNeighbours: "Neighbours",
    communityTypeEvent: "Event", communityTypeQuestion: "Question", communityTypeRecommendation: "Recommendation", communityTypeNotice: "Notice", communityTypeHousing: "Housing",
    communityRecentPostsHeading: "Recent Posts", communityNewPost: "New", communityNoResponsesYet: "No responses yet", communityResponses: "responses", communityPostsCount: "posts",
    communityCreateTitle: "Create a community post", communityCreateDescription: "Choose a category, add the details, and share your post with the local community.",
    communityCreateCategoryRequired: "Choose a category before publishing.", communityCreateTitleRequired: "Add a title with at least 4 characters.", communityCreateBodyRequired: "Add at least 20 characters of detail to your post.", communityCreateLocationRequired: "Choose a main location before publishing.",
    communityMemberFallback: "Community member", communityChooseCategory: "Choose a category", communitySameCategoriesHint: "This uses the same categories as the community sidebar.", communityWriteYourPost: "Write your post", communityTitleLabel: "Title", communityTitlePlaceholder: "What would you like to share?", communityDetailsLabel: "Details", communityDetailsPlaceholder: "Include the important details for your neighbours.", communityAddImages: "Add images", communityImagesLegend: "Images",
    communityImageTypeHint: "Choose PNG, JPG, or WebP images up to 5MB.", communitySignInForImages: "Sign in before adding images.", communityUploadingImages: "Uploading images…", communityImagesReady: "Images will be attached when you publish.", communityImagesFailed: "Images could not be uploaded.",
    communityBackToCommunity: "Back to community", communityPublishing: "Publishing…", communityPublishPost: "Publish post",
    communityTipsHeading: "Tips for a helpful post", communityTipLocalTitle: "Be local", communityTipLocalDesc: "Add a location so nearby neighbours can find your post.", communityTipClearTitle: "Keep it clear", communityTipClearDesc: "A specific title and useful details make replies easier.", communityTipSafeTitle: "Stay safe", communityTipSafeDesc: "Do not include private contact or payment information.",
    communityOpenPost: "Open post", communityEditPostHeading: "Edit post", communityEditPostDesc: "Update the title and details shared with your community.", communityDeletePostHeading: "Delete this post?", communityDeletePostWarning: "This cannot be undone. The post, its images, and comments will be permanently removed.", communityDeletingPost: "Deleting...", communityDeletePostAction: "Delete post", communityUnableToDelete: "Unable to delete this post.", communityUnableToUpdate: "Unable to update this post.",
    communityMoreInCategory: "More in this category", communityMorePosts: "More community posts", communityPostOptions: "Post options", communityHideComments: "Hide comments", communityOpenComments: "Open comments", communitySharePost: "Share post", communityCopied: "Copied", communityShare: "Share",
  },
  ko: {
    search: "물품 검색", searchCommunity: "커뮤니티 전체 검색", searchServices: "서비스 검색", market: "마켓", jobs: "일자리", services: "서비스", community: "커뮤니티", create: "등록", home: "홈", messages: "메시지", categories: "카테고리", more: "더보기",
    dashboard: "대시보드", profileSettings: "프로필 설정", notifications: "알림", wishlist: "찜 목록", keywords: "키워드", manageListings: "판매 관리", nearbyMap: "내 주변 지도", logOut: "로그아웃", adminCentre: "관리자 센터", accountMenu: "계정", logIn: "로그인", signUp: "회원가입",
    languageSettings: "언어 설정", displayLanguage: "표시 언어", supportedNow: "영어와 한국어는 지금 바로 지원됩니다. 다른 언어는 향후 번역을 위해 설정값만 저장됩니다.", languageSaved: "언어 설정이 저장되었습니다.",
    account: "계정", security: "보안", emailAddress: "이메일 주소", phoneNumber: "전화번호", nickname: "닉네임", password: "비밀번호", currentPassword: "현재 비밀번호", newPassword: "새 비밀번호", confirmNewPassword: "새 비밀번호 확인", updatePassword: "비밀번호 변경", save: "저장", cancel: "취소", update: "수정", verify: "인증", verified: "인증됨", changeEmail: "이메일 변경", changePhoneNumber: "전화번호 변경", verifyCode: "인증 코드 확인",
    contactPreferences: "연락처 설정", allowChat: "채팅 허용", showPhoneNumber: "전화번호 표시", receiveEmailNotifications: "이메일 알림 받기", chatMessages: "채팅 메시지", inAppNotifications: "새 채팅 인앱 알림", priceUpdates: "가격 업데이트", weeklyNewsletter: "주간 뉴스레터 및 거래 정보", smsAlerts: "SMS 알림", criticalAlerts: "중요 계정 알림 문자", reviews: "후기",
    locationPrivacy: "위치 및 개인정보", locationAccess: "위치 접근", usingCurrentLocation: "현재 위치 사용 중", setManually: "직접 설정", useCurrentLocation: "현재 위치 사용", enterManually: "직접 입력", city: "도시", suburbArea: "지역 / 동네", selectCity: "도시 선택", selectSuburb: "지역 선택", locationPrivacyNote: "위치 데이터는 암호화되며 제3자 광고주와 공유되지 않습니다.", saveChanges: "변경사항 저장", discard: "변경 취소", saving: "저장 중...", logout: "로그아웃", loggingOut: "로그아웃 중...",
    all: "전체", unread: "읽지 않음", buying: "구매", selling: "판매", marketplace: "마켓플레이스", accountOverview: "계정 개요", listings: "등록 상품", active: "판매 중", items: "개", tracked: "추적 중", new: "새 메시지", trustPower: "신뢰도", earnTrade: "완료된 거래마다 1%를 획득합니다", performanceInsights: "성과 인사이트", totalViews: "총 조회수", totalSaves: "총 찜 수", sales: "판매 완료", allTime: "전체 기간", activeListings: "판매 중인 상품", activeJobPosts: "활성 채용 공고", viewAll: "전체 보기", activity: "활동", showAllActivity: "모든 활동 보기", recentActivityEmpty: "최근 마켓 활동이 이곳에 표시됩니다.", boostSales: "판매를 늘려보세요", boostSalesCopy: "전문 사진은 상품이 더 눈에 띄도록 도와줍니다.", tryTadaLens: "Tada Lens 사용", inTrade: "거래 진행 중", viewTrade: "거래 보기", manage: "관리", edit: "수정", postNewListing: "새 상품 등록", postNewJob: "새 채용 공고 등록", postListingHint: "내 상품을 세상에 보여주세요", manageActivity: "활동 관리", openProfileSettings: "프로필 설정 열기",
    createListing: "상품 등록", totalListings: "개 등록 상품", noListingsYet: "등록된 상품이 없습니다", firstListingHint: "첫 상품을 등록하고 Tada에서 판매를 시작해 보세요.", available: "판매 가능", pending: "거래 대기", soldOut: "판매 완료", noMatchingListings: "일치하는 상품이 없습니다", tryDifferentSearch: "다른 검색어나 카테고리를 시도해 보세요.", loadingMoreListings: "새 콘텐츠를 불러오는 중...", category: "카테고리", condition: "상품 상태", applyFilters: "필터 적용", maxPrice: "최대 가격 (NZD)", any: "전체", newest: "최신순", lowToHigh: "낮은 가격순", highToLow: "높은 가격순", recommended: "추천순", brandNew: "새 상품", likeNew: "새것 같은 상태", excellent: "매우 좋음", good: "좋음", fair: "보통", newlyListed: "새로 등록됨", promotion: "프로모션", viewListing: "상품 보기", imageUnavailable: "이미지를 불러올 수 없음", saveListing: "상품 찜하기", viewMode: "보기 방식", listView: "목록 보기", gridView: "격자 보기", quickCategories: "빠른 카테고리", sortListings: "정렬", markAllRead: "모두 읽음 처리", deleteAll: "모두 삭제", deleteAllConfirm: "모두 삭제할까요?", select: "선택", selectAll: "전체 선택", selected: "개 선택됨", archive: "보관", archived: "보관함", restore: "보관 해제", delete: "삭제", deleteConfirm: "삭제할까요?", deleteArchived: "보관함 비우기", keywordAlerts: "키워드 알림", keywordAlertsHint: "원하는 조건과 일치하는 새 마켓 상품이 등록되면 알려드립니다.", addKeyword: "키워드 추가", yourKeywords: "내 키워드", noKeywordAlerts: "아직 키워드 알림이 없습니다", addKeywordHint: "새 상품 알림을 받으려면 키워드를 추가하세요.", keywordPlaceholder: "예: 노트북, 소파, 자전거", keywordInputLabel: "키워드", keywordNoticeLabel: "키워드 알림 안내", keywordNotice: "최대 20개의 키워드를 추가해 마켓 검색을 더 개인화하세요.",
    activeJourney: "진행 중인 거래", previousJourney: "이전 거래", nextJourney: "다음 거래", journeyOffer: "제안", journeyPending: "대기중", journeyAccepted: "수락됨", journeyMeet: "만남", journeyComplete: "완료", newOffers: "개의 새 제안", bestOffer: "최고 제안가", reviewOffers: "제안 확인하기", openConversation: "대화 열기",
    location: "위치", comingSoon: "준비 중",
    communityCategoryLocalNoticeboard: "뉴질랜드 생활", communityCategoryEvents: "이벤트", communityCategoryQnA: "질문답변", communityCategoryRecommendations: "추천", communityCategoryTogether: "같이해요", communityCategoryImmigration: "이민, 비자, 워홀", communityCategoryFreeBoard: "자유게시판",
    communityChipTrending: "인기", communityChipRecent: "최신", communityChipQuestions: "질문", communityChipFree: "무료", communityChipNeighbours: "이웃",
    communityTypeEvent: "이벤트", communityTypeQuestion: "질문", communityTypeRecommendation: "추천", communityTypeNotice: "공지", communityTypeHousing: "주거",
    communityRecentPostsHeading: "최근 게시물", communityNewPost: "새 글", communityNoResponsesYet: "아직 응답 없음", communityResponses: "개 응답", communityPostsCount: "개 게시물",
    communityCreateTitle: "커뮤니티 글쓰기", communityCreateDescription: "카테고리와 내용을 입력해 우리 동네 커뮤니티에 글을 공유해 보세요.",
    communityCreateCategoryRequired: "게시하기 전에 카테고리를 선택해 주세요.", communityCreateTitleRequired: "제목을 4자 이상 입력해 주세요.", communityCreateBodyRequired: "글 내용을 20자 이상 입력해 주세요.", communityCreateLocationRequired: "게시하기 전에 주요 지역을 선택해 주세요.",
    communityMemberFallback: "커뮤니티 회원", communityChooseCategory: "카테고리 선택", communitySameCategoriesHint: "커뮤니티 사이드바와 동일한 카테고리를 사용합니다.", communityWriteYourPost: "글 작성", communityTitleLabel: "제목", communityTitlePlaceholder: "무엇을 공유하고 싶으신가요?", communityDetailsLabel: "내용", communityDetailsPlaceholder: "이웃들에게 필요한 중요한 내용을 적어주세요.", communityAddImages: "사진 추가", communityImagesLegend: "사진",
    communityImageTypeHint: "PNG, JPG, WebP 형식의 5MB 이하 이미지를 선택하세요.", communitySignInForImages: "이미지를 추가하려면 로그인해 주세요.", communityUploadingImages: "이미지 업로드 중…", communityImagesReady: "게시할 때 이미지가 첨부됩니다.", communityImagesFailed: "이미지를 업로드하지 못했습니다.",
    communityBackToCommunity: "커뮤니티로 돌아가기", communityPublishing: "게시 중…", communityPublishPost: "게시하기",
    communityTipsHeading: "도움이 되는 글 작성 팁", communityTipLocalTitle: "동네 정보를 담아보세요", communityTipLocalDesc: "위치를 추가하면 근처 이웃이 글을 더 쉽게 찾을 수 있어요.", communityTipClearTitle: "명확하게 작성해요", communityTipClearDesc: "구체적인 제목과 유용한 내용을 적으면 답변받기 쉬워요.", communityTipSafeTitle: "안전하게 이용해요", communityTipSafeDesc: "개인 연락처나 결제 정보는 포함하지 마세요.",
    communityOpenPost: "게시글 열기", communityEditPostHeading: "게시글 수정", communityEditPostDesc: "커뮤니티에 공유된 제목과 내용을 수정하세요.", communityDeletePostHeading: "이 게시글을 삭제할까요?", communityDeletePostWarning: "이 작업은 되돌릴 수 없습니다. 게시글, 이미지, 댓글이 모두 영구적으로 삭제됩니다.", communityDeletingPost: "삭제 중...", communityDeletePostAction: "게시글 삭제", communityUnableToDelete: "게시글을 삭제할 수 없습니다.", communityUnableToUpdate: "게시글을 수정할 수 없습니다.",
    communityMoreInCategory: "이 카테고리의 다른 글", communityMorePosts: "커뮤니티 글 더 보기", communityPostOptions: "게시글 옵션", communityHideComments: "댓글 숨기기", communityOpenComments: "댓글 열기", communitySharePost: "게시글 공유", communityCopied: "복사됨", communityShare: "공유",
  },
} as const;

export type TranslationKey = keyof typeof copy.en;
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
