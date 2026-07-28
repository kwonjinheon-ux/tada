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
    dashboard: "Dashboard", profileSettings: "Profile Settings", notifications: "Notifications", wishlist: "Wishlist", keywords: "Keywords", manageListings: "Manage Listings", logOut: "Log out",
    languageSettings: "Language Settings", displayLanguage: "Display language", supportedNow: "English and Korean are available now. Other languages are saved for upcoming translations.", languageSaved: "Language preference saved.",
  },
  ko: {
    search: "물품 검색...", market: "마켓", jobs: "일자리", create: "등록", home: "홈", messages: "메시지", categories: "카테고리", more: "더보기",
    dashboard: "대시보드", profileSettings: "프로필 설정", notifications: "알림", wishlist: "찜 목록", keywords: "키워드", manageListings: "판매 관리", logOut: "로그아웃",
    languageSettings: "언어 설정", displayLanguage: "표시 언어", supportedNow: "영어와 한국어는 지금 바로 지원됩니다. 다른 언어는 향후 번역을 위해 설정값만 저장됩니다.", languageSaved: "언어 설정이 저장되었습니다.",
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
