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
    location: "Location", comingSoon: "Coming soon", createPostAction: "New post", createServiceAction: "List your service",
    marketIntroTitle: "Good deals, close to home.", marketIntroDescription: "Find what is new in your neighbourhood and trade with the people next door.", marketIntroSecondhandTitle: "Give a great find its next chapter.", marketIntroSecondhandDescription: "Browse pre-loved finds nearby, or list the things you are ready to pass on.", marketIntroGarageSaleTitle: "Your next great find is in the garage.", marketIntroGarageSaleDescription: "Explore local garage sales, save your favourites, and plan a stop this weekend.", marketIntroMovingSaleTitle: "Make room. Make someone’s day.", marketIntroMovingSaleDescription: "Find moving-sale bargains nearby, or list the things you would rather not take with you.", marketIntroTwoDollarShopTitle: "Small prices, satisfying finds.", marketIntroTwoDollarShopDescription: "Discover everyday $2 deals and share a bargain your neighbours will love.", marketIntroGroupBuyTitle: "Better prices are better together.", marketIntroGroupBuyDescription: "Join neighbours to unlock a better deal, or start a group buy worth sharing.",
    communityIntroTitle: "Your neighbourhood, in conversation.", communityIntroDescription: "Local notices, questions, everyday tips — share them with your neighbours and learn together.",
    marketType: "Market type", mainLocationLabel: "Main Location", subLocationLabel: "Sub Location", allNewZealand: "All New Zealand", anySubLocation: "Any sub location",
    shopTypeSecondhand: "Second Hands", shopTypeGarageSale: "Garage Sale", shopTypeMovingSale: "Moving Sale", shopTypeTwoDollarShop: "2 Dollar Shop", shopTypeGroupBuy: "Group Buy",
    sellerProfileEyebrow: "Seller profile", sellerRatingLabel: "Rating", sellerReviewsLabel: "Reviews", sellerListingsLabel: "Listings", sellerNoRatings: "No ratings yet", sellerVerifiedReviews: "Verified buyer reviews", sellerNoReviews: "No verified reviews yet.",
    sellerSortLabel: "Sort reviews", sellerSortHighest: "Highest rated", sellerSortLowest: "Lowest rated", sellerPaginationLabel: "Review pages", sellerPreviousPage: "Previous page", sellerNextPage: "Next page",
    bargainBackToListings: "Back to listings", bargainNavigation: "Bargain navigation", bargainEventLogistics: "Event logistics", bargainDate: "Date", bargainTime: "Time", bargainGetDirections: "Get directions", bargainMapLabel: "Map", bargainOpenInGoogleMaps: "Open in Google Maps",
    bargainPickupLocationPrivacy: "Exact pickup location is shared after the seller confirms your visit.", bargainSellerInfo: "Seller info", bargainLocalSeller: "Local Tada seller", bargainMessageSeller: "Message", bargainAboutSale: "About this sale", bargainPaymentNote: "Cash and card payments welcome", bargainBagsNote: "Bring your own bags for larger finds",
    bargainSaleInventory: "Sale inventory", bargainItemCountSuffix: "items", bargainInventoryHint: "Choose a time to plan a visit. A seller confirmation creates the temporary hold.", bargainSearchInventoryLabel: "Search sale inventory", bargainSearchInventoryPlaceholder: "Search inventory...", bargainFilterItems: "Filter sale items", bargainAllItems: "All items", bargainPhotoGallery: "photo gallery",
    bargainReviewPickup: "Review pickup", bargainEditItem: "Edit item", bargainNoItemsInCategory: "No items in this category", bargainChooseAnotherCategory: "Choose another category to see the sale inventory.", bargainPickupNotAllowed: "You are not allowed to change this pickup.", bargainPickupMissing: "This pickup commitment no longer exists.",
    bargainItemLoginRequired: "Please log in to edit this item.", bargainItemNotSeller: "Only the seller can edit this item.", bargainItemMissing: "This sale item could not be found.",
    bargainBackToSale: "Back to sale", bargainPhoto: "Photo", bargainItemPreview: "Item preview", bargainItemTitle: "Item title", bargainPriceNzd: "Price (NZD)", bargainDescription: "Description", bargainSaveItem: "Save item", bargainNoTimeSelected: "No time selected",
    bargainPickupCommitments: "Pickup commitments", bargainPickupCommitmentsHint: "Confirming creates a temporary hold until the requested pickup time. Mark it picked up only when the buyer arrives.", bargainRequestedFor: "Requested for", bargainConfirmedFor: "Confirmed for", bargainBuyerOnTheWay: "Buyer is on the way", bargainConfirmPickup: "Confirm pickup", bargainDecline: "Decline", bargainMarkPickedUp: "Mark picked up", bargainNoShow: "No-show",
    bargainItemValidation: "Enter a title, description, and valid price.", bargainImageTypeHint: "Use a JPG, PNG, or WebP image up to 5MB.", bargainImagePrepFailed: "Unable to prepare this image.", bargainPhotoUnavailable: "Photo uploads are unavailable right now.", bargainLoginBeforeSaving: "Please log in again before saving.", bargainItemSaveFailed: "Unable to save this item.", bargainOfferUpdateFailed: "Unable to update this offer.",
    bargainPlanVisit: "Plan a visit", bargainRequestPickup: "Request pickup", bargainPickupTime: "Pickup time", bargainSending: "Sending…", bargainHeldForPickup: "Held for pickup", bargainSold: "Sold", bargainSelectedTime: "the selected time",
    bargainPlanVisitIntro: "Request a 30-minute pickup for this item. This is a visit request, not a completed purchase. The seller must confirm it.", bargainPickupPrivacyNote: "The exact address is shared only after confirmation.", confirmOk: "OK",
    bargainPickupRequestedStatus: "Pickup requested", bargainOnYourWay: "On your way", bargainPickupConfirmed: "Pickup confirmed", bargainImOnMyWay: "I'm on my way", bargainCancelPickup: "Cancel pickup",
    bargainNoticeTitle: "Pickup update", bargainErrorTitle: "Something went wrong", bargainPickupRequestSent: "Pickup request sent. The seller will confirm your time.", bargainPickupCancelledNotice: "Your pickup commitment has been cancelled.", bargainOnTheWayNotice: "The seller has been told you are on the way.",
    bargainPickupLoginRequired: "Please log in to plan a visit.", bargainPickupConflict: "This item is already held for another pickup.", bargainPickupInvalidTime: "Choose a future 30-minute pickup time.", bargainPickupFailed: "Unable to send your pickup request right now.", bargainPickupUpdateFailed: "Unable to update your pickup.", bargainShareFailed: "Unable to copy this listing link. Please try again.",
    marketCategoryMobilePhonesTablets: "Mobile Phones & Tablets", marketCategoryComputersLaptops: "Computers & Laptops", marketCategoryElectronicsAppliances: "Electronics & Appliances", marketCategoryFurnitureHomeDecor: "Furniture & Home Decor", marketCategoryHomeKitchen: "Home & Kitchen", marketCategoryClothingFashion: "Clothing & Fashion", marketCategoryBabyKids: "Baby & Kids", marketCategoryBooksMusicMedia: "Books, Music & Media", marketCategoryHobbiesCollectables: "Hobbies & Collectables", marketCategoryGamesToys: "Games & Toys", marketCategorySportsLeisure: "Sports & Leisure", marketCategoryMusicalInstruments: "Musical Instruments", marketCategoryGardenToolsDiy: "Garden, Tools & DIY", marketCategoryPetSupplies: "Pet Supplies", marketCategoryHealthBeauty: "Health & Beauty",
    communityCategoryLocalNoticeboard: "New Zealand Life", communityCategoryEvents: "Events", communityCategoryQnA: "Q&A", communityCategoryRecommendations: "Rec", communityCategoryTogether: "Let's Do It Together", communityCategoryImmigration: "Immigration, Visa & Working Holiday", communityCategoryFreeBoard: "Free Board",
    communityChipTrending: "Trending", communityChipRecent: "Recent", communityChipQuestions: "Questions", communityChipFree: "Free", communityChipNeighbours: "Neighbours",
    communityTogetherParenting: "Parenting", communityTogetherSports: "Sports", communityTogetherStudy: "Study", communityTogetherBookClub: "Book club",
    communityTypeEvent: "Event", communityTypeQuestion: "Question", communityTypeRecommendation: "Rec", communityTypeNotice: "Notice", communityTypeHousing: "Housing",
    communityViewsLabel: "Views",
    communityRecentPostsHeading: "Recent Posts", communityNewPost: "New", communityNoResponsesYet: "No responses yet", communityResponses: "responses", communityPostsCount: "posts", communityNoPosts: "No community posts yet", communityFirstPostHint: "Start the conversation — be the first to share something with your neighbours.", communityCreateFirstPost: "Write the first post",
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
    location: "위치", comingSoon: "준비 중", createPostAction: "새글 등록", createServiceAction: "서비스 등록",
    marketIntroTitle: "가까운 곳에서 찾는, 좋은 거래.", marketIntroDescription: "우리 동네의 새로운 상품을 발견하고, 이웃과 쉽고 빠르게 거래해 보세요.", marketIntroSecondhandTitle: "좋은 물건의 다음 주인을 찾아보세요.", marketIntroSecondhandDescription: "우리 동네의 알뜰한 중고 물건을 둘러보고, 더 이상 쓰지 않는 물건도 이웃에게 전해 보세요.", marketIntroGarageSaleTitle: "다음 보물은 동네 차고에 있어요.", marketIntroGarageSaleDescription: "가까운 차고 세일을 둘러보고 찜한 물건을 저장해, 이번 주말 방문 계획을 세워 보세요.", marketIntroMovingSaleTitle: "비우는 순간, 누군가에겐 필요한 물건이 됩니다.", marketIntroMovingSaleDescription: "이사 세일의 알뜰한 물건을 찾거나, 가져가지 않을 물건을 이웃에게 연결해 보세요.", marketIntroTwoDollarShopTitle: "작은 가격, 기분 좋은 발견.", marketIntroTwoDollarShopDescription: "일상에 필요한 2달러 상품을 발견하고, 이웃도 좋아할 알뜰한 거래를 공유해 보세요.", marketIntroGroupBuyTitle: "함께 살수록 더 좋은 가격.", marketIntroGroupBuyDescription: "이웃과 함께 더 좋은 가격을 만들거나, 함께하고 싶은 공동구매를 시작해 보세요.",
    communityIntroTitle: "가까운 곳에서 나누는, 우리들의 이야기.", communityIntroDescription: "동네 소식부터 질문과 생활 정보까지, 이웃과 편하게 나누고 함께 알아가 보세요.",
    marketType: "마켓 유형", mainLocationLabel: "주요 지역", subLocationLabel: "세부 지역", allNewZealand: "뉴질랜드 전체", anySubLocation: "세부 지역 전체",
    shopTypeSecondhand: "중고 거래", shopTypeGarageSale: "차고 세일", shopTypeMovingSale: "이사 세일", shopTypeTwoDollarShop: "2달러 샵", shopTypeGroupBuy: "공동구매",
    sellerProfileEyebrow: "판매자 프로필", sellerRatingLabel: "평점", sellerReviewsLabel: "후기", sellerListingsLabel: "판매 중", sellerNoRatings: "평점 없음", sellerVerifiedReviews: "구매자 인증 후기", sellerNoReviews: "아직 인증된 후기가 없습니다.",
    sellerSortLabel: "후기 정렬", sellerSortHighest: "최고 점수순", sellerSortLowest: "최저 점수순", sellerPaginationLabel: "후기 페이지", sellerPreviousPage: "이전 페이지", sellerNextPage: "다음 페이지",
    bargainBackToListings: "목록으로 돌아가기", bargainNavigation: "세일 탐색", bargainEventLogistics: "행사 정보", bargainDate: "날짜", bargainTime: "시간", bargainGetDirections: "길찾기", bargainMapLabel: "지도", bargainOpenInGoogleMaps: "Google 지도에서 열기",
    bargainPickupLocationPrivacy: "정확한 픽업 위치는 판매자가 방문을 확인한 후에 공개됩니다.", bargainSellerInfo: "판매자 정보", bargainLocalSeller: "동네 Tada 판매자", bargainMessageSeller: "메시지 보내기", bargainAboutSale: "이 세일 안내", bargainPaymentNote: "현금과 카드 결제 모두 가능합니다", bargainBagsNote: "부피가 큰 물건은 담을 가방을 준비해 오세요",
    bargainSaleInventory: "판매 물품", bargainItemCountSuffix: "개", bargainInventoryHint: "방문할 시간을 선택하세요. 판매자가 확인하면 임시 예약이 확정됩니다.", bargainSearchInventoryLabel: "판매 물품 검색", bargainSearchInventoryPlaceholder: "물품 검색...", bargainFilterItems: "판매 물품 필터", bargainAllItems: "전체 물품", bargainPhotoGallery: "사진 갤러리",
    bargainReviewPickup: "픽업 확인", bargainEditItem: "물품 수정", bargainNoItemsInCategory: "이 카테고리에는 물품이 없습니다", bargainChooseAnotherCategory: "다른 카테고리를 선택해 판매 물품을 확인해 보세요.", bargainPickupNotAllowed: "이 픽업을 변경할 권한이 없습니다.", bargainPickupMissing: "이 픽업 예약을 찾을 수 없습니다.",
    bargainItemLoginRequired: "이 물품을 수정하려면 로그인해 주세요.", bargainItemNotSeller: "판매자만 이 물품을 수정할 수 있습니다.", bargainItemMissing: "이 판매 물품을 찾을 수 없습니다.",
    bargainBackToSale: "세일로 돌아가기", bargainPhoto: "사진", bargainItemPreview: "물품 미리보기", bargainItemTitle: "물품 제목", bargainPriceNzd: "가격 (NZD)", bargainDescription: "설명", bargainSaveItem: "물품 저장", bargainNoTimeSelected: "선택된 시간 없음",
    bargainPickupCommitments: "픽업 예약", bargainPickupCommitmentsHint: "확정하면 요청한 픽업 시간까지 임시로 예약됩니다. 구매자가 실제로 도착했을 때만 픽업 완료로 처리하세요.", bargainRequestedFor: "요청 시간", bargainConfirmedFor: "확정 시간", bargainBuyerOnTheWay: "구매자가 오는 중입니다", bargainConfirmPickup: "픽업 확정", bargainDecline: "거절", bargainMarkPickedUp: "픽업 완료 처리", bargainNoShow: "노쇼 처리",
    bargainItemValidation: "제목, 설명, 올바른 가격을 입력해 주세요.", bargainImageTypeHint: "5MB 이하의 JPG, PNG, WebP 이미지를 사용해 주세요.", bargainImagePrepFailed: "이 이미지를 처리할 수 없습니다.", bargainPhotoUnavailable: "지금은 사진을 업로드할 수 없습니다.", bargainLoginBeforeSaving: "저장하기 전에 다시 로그인해 주세요.", bargainItemSaveFailed: "이 물품을 저장할 수 없습니다.", bargainOfferUpdateFailed: "이 요청을 변경할 수 없습니다.",
    bargainPlanVisit: "방문 예약", bargainRequestPickup: "픽업 요청", bargainPickupTime: "픽업 시간", bargainSending: "보내는 중…", bargainHeldForPickup: "픽업 예약됨", bargainSold: "판매 완료", bargainSelectedTime: "선택한 시간",
    bargainPlanVisitIntro: "이 상품에 대해 30분 픽업을 요청합니다. 구매 확정이 아니라 방문 요청이며, 판매자가 확인해야 합니다.", bargainPickupPrivacyNote: "정확한 주소는 판매자가 확인한 후에만 공개됩니다.", confirmOk: "확인",
    bargainPickupRequestedStatus: "픽업 요청됨", bargainOnYourWay: "가는 중", bargainPickupConfirmed: "픽업 확정", bargainImOnMyWay: "지금 가는 중이에요", bargainCancelPickup: "픽업 취소",
    bargainNoticeTitle: "픽업 안내", bargainErrorTitle: "문제가 발생했습니다", bargainPickupRequestSent: "픽업 요청을 보냈습니다. 판매자가 시간을 확인해 드립니다.", bargainPickupCancelledNotice: "픽업 예약이 취소되었습니다.", bargainOnTheWayNotice: "가는 중이라고 판매자에게 알렸습니다.",
    bargainPickupLoginRequired: "방문을 예약하려면 로그인해 주세요.", bargainPickupConflict: "이 상품은 이미 다른 픽업으로 예약되어 있습니다.", bargainPickupInvalidTime: "앞으로의 30분 단위 픽업 시간을 선택해 주세요.", bargainPickupFailed: "지금은 픽업 요청을 보낼 수 없습니다.", bargainPickupUpdateFailed: "픽업 정보를 변경할 수 없습니다.", bargainShareFailed: "링크를 복사할 수 없습니다. 다시 시도해 주세요.",
    marketCategoryMobilePhonesTablets: "휴대폰 & 태블릿", marketCategoryComputersLaptops: "컴퓨터 & 노트북", marketCategoryElectronicsAppliances: "전자제품 & 가전", marketCategoryFurnitureHomeDecor: "가구 & 인테리어", marketCategoryHomeKitchen: "생활 & 주방", marketCategoryClothingFashion: "의류 & 패션", marketCategoryBabyKids: "유아 & 아동", marketCategoryBooksMusicMedia: "도서 · 음반 · 미디어", marketCategoryHobbiesCollectables: "취미 & 수집품", marketCategoryGamesToys: "게임 & 장난감", marketCategorySportsLeisure: "스포츠 & 레저", marketCategoryMusicalInstruments: "악기", marketCategoryGardenToolsDiy: "정원 · 공구 · DIY", marketCategoryPetSupplies: "반려동물 용품", marketCategoryHealthBeauty: "건강 & 뷰티",
    communityCategoryLocalNoticeboard: "뉴질랜드 생활", communityCategoryEvents: "이벤트", communityCategoryQnA: "질문답변", communityCategoryRecommendations: "추천", communityCategoryTogether: "같이해요", communityCategoryImmigration: "이민, 비자, 워홀", communityCategoryFreeBoard: "자유게시판",
    communityChipTrending: "인기", communityChipRecent: "최신", communityChipQuestions: "질문", communityChipFree: "무료", communityChipNeighbours: "이웃",
    communityTogetherParenting: "육아", communityTogetherSports: "스포츠", communityTogetherStudy: "스터디", communityTogetherBookClub: "북클럽",
    communityTypeEvent: "이벤트", communityTypeQuestion: "질문", communityTypeRecommendation: "추천", communityTypeNotice: "공지", communityTypeHousing: "주거",
    communityViewsLabel: "조회수",
    communityRecentPostsHeading: "최근 게시물", communityNewPost: "새 글", communityNoResponsesYet: "아직 응답 없음", communityResponses: "개 응답", communityPostsCount: "개 게시물", communityNoPosts: "아직 게시물이 없습니다", communityFirstPostHint: "우리 동네 첫 이야기를 들려주세요. 첫 게시글의 주인공이 되어보세요.", communityCreateFirstPost: "첫 게시글 작성하기",
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
