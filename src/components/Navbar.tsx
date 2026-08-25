"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { MobileDrawerBackdrop } from "@/components/MobileDrawer";
import { DashboardMenuItems } from "@/components/dashboard/DashboardMenuItems";
import { languageOptions, type SupportedLocale, useLanguage } from "@/components/LanguageProvider";
import { createHeartParticles, SaveHeartBurst, saveFeedbackClasses, type HeartParticle } from "@/components/SaveHeartBurst";
import { Avatar } from "@/components/ui/Avatar";
import { DialogOverlay } from "@/components/ui/DialogOverlay";
import { MobileDock, type MobileDockItem } from "@/components/ui/MobileDock";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { marketSearchTermsResponseSchema } from "@/contracts/api";
import { readApiResponse } from "@/lib/api/client";

const authlessRoutes = new Set(["/login", "/signup"]);
declare global {
  interface Window {
    __tadaOnlineMemberIds?: string[];
    __tadaListingDockConfig?: { isOwner: boolean; isSaved: boolean };
  }
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [isDashboardMenuOpen, setIsDashboardMenuOpen] = useState(false);
  const [isDesktopDashboardOpen, setIsDesktopDashboardOpen] = useState(false);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const [isSavingLanguage, setIsSavingLanguage] = useState(false);
  const [languageStatus, setLanguageStatus] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [trendingSearches, setTrendingSearches] = useState<string[]>([]);
  const [isSearchSuggestionsOpen, setIsSearchSuggestionsOpen] = useState(false);
  const [listingDockConfig, setListingDockConfig] = useState<{ isOwner: boolean; isSaved: boolean } | null>(null);
  const [dockHeartParticles, setDockHeartParticles] = useState<HeartParticle[]>([]);
  const [isDockHeartPopping, setIsDockHeartPopping] = useState(false);
  const [isListingShareCopied, setIsListingShareCopied] = useState(false);
  const dockHeartTimer = useRef<number | null>(null);
  const shareCopiedTimer = useRef<number | null>(null);
  const { locale, setLocale, t } = useLanguage();

  useEffect(() => {
    const query = new URLSearchParams(window.location.search).get("q") ?? "";
    setSearchQuery(query);
  }, [pathname, searchParams]);

  useEffect(() => {
    const showCopiedState = () => {
      setIsListingShareCopied(true);
      if (shareCopiedTimer.current) window.clearTimeout(shareCopiedTimer.current);
      shareCopiedTimer.current = window.setTimeout(() => setIsListingShareCopied(false), 2_000);
    };
    window.addEventListener("listing-share-copied", showCopiedState);
    return () => {
      window.removeEventListener("listing-share-copied", showCopiedState);
      if (shareCopiedTimer.current) window.clearTimeout(shareCopiedTimer.current);
    };
  }, []);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) { setIsAuthReady(true); return; }
    let isMounted = true;
    let syncPromise: Promise<void> | null = null;

    const syncUser = () => {
      if (syncPromise) return syncPromise;
      syncPromise = (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const user = data.user;
        if (!isMounted) return;
        setUserId(user?.id ?? null);
        setUserEmail(user?.email ?? null);
        setDisplayName(user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? null);
        if (!user) {
          setAvatarUrl(null);
          setUnreadMessageCount(0);
          setUnreadNotificationCount(0);
          setIsAdmin(false);
          return;
        }
        const [{ count: messageCount }, { count: notificationCount }, { data: role }] = await Promise.all([
          supabase.from("market_messages").select("id", { count: "exact", head: true }).eq("recipient_id", user.id).is("read_at", null),
          supabase.from("market_notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null),
          supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle(),
        ]);
        if (isMounted) {
          setUnreadMessageCount(messageCount ?? 0);
          setUnreadNotificationCount(notificationCount ?? 0);
          setIsAdmin(role?.role === "admin" || role?.role === "moderator");
        }
        const avatarPath = user.user_metadata?.avatar_path;
        if (avatarPath) {
          const { data: signed } = await supabase.storage.from("profile-avatars").createSignedUrl(avatarPath, 3600);
          if (isMounted) setAvatarUrl(signed?.signedUrl ?? null);
        } else {
          setAvatarUrl(null);
        }
      } finally {
        if (isMounted) setIsAuthReady(true);
        syncPromise = null;
      }
      })();
      return syncPromise;
    };

    void syncUser();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      void syncUser();
    });

    const updateAvatar = (event: Event) => {
      setAvatarUrl((event as CustomEvent<string | null>).detail ?? null);
    };
    window.addEventListener("profile-avatar-updated", updateAvatar);

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
      window.removeEventListener("profile-avatar-updated", updateAvatar);
    };
  }, []);

  useEffect(() => {
    if (!userId) return;
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    const refreshUnreadCount = async () => {
      const { count } = await supabase
        .from("market_messages")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", userId)
        .is("read_at", null);
      setUnreadMessageCount(count ?? 0);
    };
    const refreshNotificationCount = async () => {
      const { count } = await supabase
        .from("market_notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("read_at", null);
      setUnreadNotificationCount(count ?? 0);
    };
    const channel = supabase
      .channel(`market-unread-count:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "market_messages", filter: `recipient_id=eq.${userId}` }, () => { void refreshUnreadCount(); })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "market_messages", filter: `recipient_id=eq.${userId}` }, () => { void refreshUnreadCount(); })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "market_notifications", filter: `user_id=eq.${userId}` }, () => { void refreshNotificationCount(); })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "market_notifications", filter: `user_id=eq.${userId}` }, () => { void refreshNotificationCount(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel).catch(() => undefined); };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;

    const channel = supabase.channel("tada-member-presence", { config: { presence: { key: userId } } });
    const publishPresence = () => {
      const onlineMemberIds = Array.from(new Set(
        Object.values(channel.presenceState<{ userId?: string }>()).flatMap((presences) => presences.map((presence) => presence.userId).filter((memberId): memberId is string => Boolean(memberId))),
      ));
      window.__tadaOnlineMemberIds = onlineMemberIds;
      window.dispatchEvent(new Event("tada-member-presence"));
    };

    channel
      .on("presence", { event: "sync" }, publishPresence)
      .on("presence", { event: "join" }, publishPresence)
      .on("presence", { event: "leave" }, publishPresence)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void channel.track({ userId });
        }
      });

    return () => {
      window.__tadaOnlineMemberIds = undefined;
      window.dispatchEvent(new Event("tada-member-presence"));
      void channel.untrack().catch(() => undefined);
      void supabase.removeChannel(channel).catch(() => undefined);
    };
  }, [userId]);

  useEffect(() => {
    document.body.classList.toggle("post-ad-screen", pathname.startsWith("/market/create") || pathname.startsWith("/community/create") || pathname.startsWith("/services/create") || /^\/market\/[^/]+\/edit$/.test(pathname));
    return () => {
      document.body.classList.remove("post-ad-screen");
    };
  }, [pathname]);

  useEffect(() => {
    const hasMobileDock = !authlessRoutes.has(pathname) && !pathname.startsWith("/market/dashboard/messages");
    document.body.classList.toggle("has-mobile-bottom-dock", hasMobileDock);
    return () => {
      document.body.classList.remove("has-mobile-bottom-dock");
    };
  }, [pathname]);

  useEffect(() => {
    const root = document.documentElement;
    const mobileQuery = window.matchMedia("(max-width: 767.98px)");
    const visualViewport = window.visualViewport;

    let animationFrame: number | null = null;

    const updateMobileViewportInset = () => {
      if (!mobileQuery.matches || !visualViewport) {
        root.style.removeProperty("--mobile-viewport-bottom-inset");
        return;
      }

      // iOS Chrome keeps its browser controls outside the visual viewport.
      // Reserve that covered area while visible, then let the dock use the
      // newly available space as the controls collapse on scroll.
      const layoutViewportHeight = document.documentElement.clientHeight;
      const visibleViewportBottom = visualViewport.offsetTop + visualViewport.height;
      const next = `${Math.max(0, Math.round(layoutViewportHeight - visibleViewportBottom))}px`;

      // This drives the `bottom` of the dock and the listing action bar. Writing
      // it when nothing moved invalidates style on every scroll frame.
      if (root.style.getPropertyValue("--mobile-viewport-bottom-inset") === next) return;
      root.style.setProperty("--mobile-viewport-bottom-inset", next);
    };

    const scheduleMobileViewportInsetUpdate = () => {
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(updateMobileViewportInset);
    };

    updateMobileViewportInset();
    visualViewport?.addEventListener("resize", scheduleMobileViewportInsetUpdate);
    visualViewport?.addEventListener("scroll", scheduleMobileViewportInsetUpdate);
    window.addEventListener("resize", scheduleMobileViewportInsetUpdate);
    mobileQuery.addEventListener("change", scheduleMobileViewportInsetUpdate);

    return () => {
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
      visualViewport?.removeEventListener("resize", scheduleMobileViewportInsetUpdate);
      visualViewport?.removeEventListener("scroll", scheduleMobileViewportInsetUpdate);
      window.removeEventListener("resize", scheduleMobileViewportInsetUpdate);
      mobileQuery.removeEventListener("change", scheduleMobileViewportInsetUpdate);
      root.style.removeProperty("--mobile-viewport-bottom-inset");
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const mobileQuery = window.matchMedia("(max-width: 767.98px)");
    const visualViewport = window.visualViewport;
    let animationFrame: number | null = null;

    const updateMobileDockClearance = () => {
      if (!mobileQuery.matches) {
        root.style.removeProperty("--mobile-dock-content-clearance");
        return;
      }

      const dock = document.querySelector<HTMLElement>(".mobile-bottom-dock");
      if (!dock) {
        root.style.removeProperty("--mobile-dock-content-clearance");
        return;
      }

      const dockRect = dock.getBoundingClientRect();
      const dockBottomInset = Math.max(0, Math.round(window.innerHeight - dockRect.bottom));
      const next = `${Math.ceil(dockRect.height + dockBottomInset + 32)}px`;

      // Compare against what is actually set rather than a cached number, so
      // the value is still restored if anything else clears the property.
      if (root.style.getPropertyValue("--mobile-dock-content-clearance") === next) return;
      root.style.setProperty("--mobile-dock-content-clearance", next);
    };

    const scheduleMobileDockClearanceUpdate = () => {
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(updateMobileDockClearance);
    };

    scheduleMobileDockClearanceUpdate();
    // Deliberately not listening to viewport scroll. This value becomes the
    // bottom padding of the scrolling content, so recomputing it mid-scroll
    // changes the document height, which nudges the scroll offset, which fires
    // another scroll event — the page visibly shakes near the bottom. The dock
    // is a fixed-size element, so resize and orientation changes are enough.
    visualViewport?.addEventListener("resize", scheduleMobileDockClearanceUpdate);
    window.addEventListener("resize", scheduleMobileDockClearanceUpdate);
    window.addEventListener("orientationchange", scheduleMobileDockClearanceUpdate);
    mobileQuery.addEventListener("change", scheduleMobileDockClearanceUpdate);

    return () => {
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
      visualViewport?.removeEventListener("resize", scheduleMobileDockClearanceUpdate);
      window.removeEventListener("resize", scheduleMobileDockClearanceUpdate);
      window.removeEventListener("orientationchange", scheduleMobileDockClearanceUpdate);
      mobileQuery.removeEventListener("change", scheduleMobileDockClearanceUpdate);
      root.style.removeProperty("--mobile-dock-content-clearance");
    };
  }, [pathname]);

  useEffect(() => {
    setIsOpen(false);
    setIsDashboardMenuOpen(false);
    setIsDesktopDashboardOpen(false);
    setIsLanguageMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isDesktopDashboardOpen && !isLanguageMenuOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setIsDesktopDashboardOpen(false);
      setIsLanguageMenuOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isDesktopDashboardOpen, isLanguageMenuOpen]);

  useEffect(() => {
    const syncListingDock = () => setListingDockConfig(window.__tadaListingDockConfig ?? null);
    window.addEventListener("listing-mobile-dock-config", syncListingDock);
    syncListingDock();
    return () => window.removeEventListener("listing-mobile-dock-config", syncListingDock);
  }, [pathname]);

  useEffect(() => () => {
    if (dockHeartTimer.current) window.clearTimeout(dockHeartTimer.current);
  }, []);

  useEffect(() => {
    const closeDashboardDrawer = () => setIsDashboardMenuOpen(false);
    window.addEventListener("mobile-category-menu-request", closeDashboardDrawer);
    return () => {
      window.removeEventListener("mobile-category-menu-request", closeDashboardDrawer);
    };
  }, []);

  useEffect(() => {
    const isMobileMenuOpen = isDashboardMenuOpen && window.matchMedia("(max-width: 767.98px)").matches;
    const isGuestMenuOpen = isMobileMenuOpen && !userEmail;

    document.body.classList.toggle("has-open-mobile-drawer", isGuestMenuOpen);

    return () => {
      document.body.classList.remove("has-open-mobile-drawer");
    };
  }, [isDashboardMenuOpen, userEmail]);

  if (authlessRoutes.has(pathname)) {
    return null;
  }

  const recordSearch = (query: string) => {
    if (query.length < 2) return;
    void fetch("/api/market/searches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ term: query }),
    });
  };

  const runSearch = (query: string) => {
    const isSectionSearch = pathname.startsWith("/community") || pathname.startsWith("/services") || pathname.startsWith("/market");
    const params = new URLSearchParams(isSectionSearch ? window.location.search : "");
    params.delete("cursor");
    if (query) params.set("q", query);
    else params.delete("q");
    const search = params.toString();
    const isMarketBrowseRoute = pathname === "/market" || /^\/market\/(secondhands|garage-sales|moving-sales|2dollarshop|groupbuy)$/.test(pathname);
    const destination = pathname.startsWith("/community") ? "/community" : pathname.startsWith("/services") ? "/services" : isMarketBrowseRoute ? pathname : "/market";
    router.push(`${destination}${search ? `?${search}` : ""}`);
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchQuery.trim();
    if (pathname.startsWith("/market")) recordSearch(query);
    setIsSearchSuggestionsOpen(false);
    runSearch(query);
  };

  const loadTrendingSearches = async () => {
    try {
      const response = await fetch("/api/market/searches", { cache: "no-store" });
      const result = await readApiResponse(response, marketSearchTermsResponseSchema);
      if (!result.error) setTrendingSearches(result.data.terms);
    } catch {
      setTrendingSearches([]);
    }
  };

  const chooseTrendingSearch = (term: string) => {
    setSearchQuery(term);
    recordSearch(term);
    setIsSearchSuggestionsOpen(false);
    runSearch(term);
  };

  const updateSearchQuery = (value: string) => {
    setSearchQuery(value);
  };

  const isMarket = pathname.startsWith("/market");
  const isCommunity = pathname.startsWith("/community");
  const isJobs = pathname.startsWith("/jobs");
  const isServices = pathname.startsWith("/services");
  const searchPlaceholder = isCommunity ? t("searchCommunity") : isServices ? t("searchServices") : t("search");
  const isBargainShopType = pathname.startsWith("/market/garage-sales") || pathname.startsWith("/market/moving-sales") || pathname.startsWith("/market/2dollarshop");
  const dockSection: "community" | "bargain" | "market" = isCommunity ? "community" : isBargainShopType ? "bargain" : "market";
  const isPostAd = pathname.startsWith("/market/create") || pathname.startsWith("/community/create") || pathname.startsWith("/services/create") || /^\/market\/[^/]+\/edit$/.test(pathname);
  const createPath = isCommunity ? "/community/create" : isServices ? "/services/create" : isBargainShopType ? "/market/create/bargain" : "/market/create";
  // The create button names what it publishes on the surface you are browsing.
  const createLabel = isCommunity ? t("createPostAction") : isServices ? t("createServiceAction") : t("createListing");
  const isListingDetail = /^\/market\/[^/]+$/.test(pathname);
  const isMessagesPage = pathname.startsWith("/market/dashboard/messages");
  const dashboardBase = `/${isJobs ? "jobs" : "market"}/dashboard`;
  const isSignedIn = Boolean(userEmail);
  const languageButtonLabel = locale === "en" ? "EN" : locale === "ko" ? "한글" : null;
  const notificationBadge = unreadNotificationCount > 99 ? "99+" : String(unreadNotificationCount);

  const handleMobileProfileClick = () => {
    setIsOpen(false);
    setIsLanguageMenuOpen(false);
    setIsDashboardMenuOpen((current) => !current);
  };

  const handleLocaleSelection = async (nextLocale: SupportedLocale) => {
    if (nextLocale === locale || isSavingLanguage) {
      setIsLanguageMenuOpen(false);
      return;
    }

    setLocale(nextLocale);
    setLanguageStatus("");
    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setLanguageStatus("Saved on this device.");
      return;
    }

    setIsSavingLanguage(true);
    try {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        setLanguageStatus("Saved on this device. Sign in to save it to your account.");
        return;
      }

      const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
      const fallbackName = user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "Tada member";
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        display_name: profile?.display_name ?? displayName ?? fallbackName,
        preferred_locale: nextLocale,
      });
      setLanguageStatus(error ? "Language saved on this device. Account sync will retry next time." : "Language saved to your account.");
    } finally {
      setIsSavingLanguage(false);
    }
  };

  const handleSignOut = async () => {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;

    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) return;

    setUserEmail(null);
    setUserId(null);
    setDisplayName(null);
    setAvatarUrl(null);
    setUnreadNotificationCount(0);
    setIsDashboardMenuOpen(false);
    setIsDesktopDashboardOpen(false);
  };

  const triggerListingDockAction = (action: "message" | "offer" | "share" | "save" | "edit" | "delete") => {
    if (action === "save") {
      setIsDockHeartPopping(true);
      setDockHeartParticles(createHeartParticles());
      if (dockHeartTimer.current) window.clearTimeout(dockHeartTimer.current);
      dockHeartTimer.current = window.setTimeout(() => {
        setDockHeartParticles([]);
        setIsDockHeartPopping(false);
      }, 1_050);
    }
    window.dispatchEvent(new CustomEvent("listing-mobile-dock-action", { detail: action }));
  };

  const standardDockItems: MobileDockItem[] = [
    { id: "home", label: isCommunity ? "Community home" : t("home"), icon: "home", href: isCommunity ? "/community" : "/market", active: isCommunity ? pathname === "/community" : isMarket && !isPostAd && !pathname.startsWith("/market/dashboard") },
    { id: "messages", label: t("messages"), icon: "message", href: `${dashboardBase}/messages`, active: isMessagesPage },
    { id: "create", label: createLabel, icon: "create", href: createPath, active: isPostAd, variant: "create" },
    { id: "categories", label: isCommunity ? "Browse community categories" : "Browse categories", icon: "categories", onClick: openMobileCategories },
    { id: "profile", label: "Open dashboard menu", icon: "profile", onClick: openMobileDashboard, active: isDashboardMenuOpen },
  ];

  const listingDockItems: MobileDockItem[] | null = !isListingDetail || !listingDockConfig ? null : [
    { id: "home", label: "Market home", icon: "home", href: "/market" },
    { id: "message", label: "Message seller", icon: "message", onClick: () => triggerListingDockAction("message") },
    listingDockConfig.isOwner
      ? { id: "edit", label: "Edit listing", icon: "edit", onClick: () => triggerListingDockAction("edit"), variant: "offer" }
      : { id: "offer", label: "Make an offer", icon: "offer", actionLabel: "Offer", onClick: () => triggerListingDockAction("offer"), variant: "offer" },
    { id: "share", label: isListingShareCopied ? "Listing link copied" : "Copy listing link", icon: isListingShareCopied ? "check" : "share", onClick: () => triggerListingDockAction("share") },
    listingDockConfig.isOwner
      ? { id: "delete", label: "Delete listing", icon: "delete", onClick: () => triggerListingDockAction("delete") }
      : { id: "save", label: listingDockConfig.isSaved ? "Remove saved listing" : "Save listing", icon: "heart", solidIcon: listingDockConfig.isSaved, active: listingDockConfig.isSaved, pressed: listingDockConfig.isSaved, variant: "save", className: `${saveFeedbackClasses.root} ${listingDockConfig.isSaved ? saveFeedbackClasses.saved : ""} ${isDockHeartPopping ? saveFeedbackClasses.popping : ""}`, onClick: () => triggerListingDockAction("save"), overlay: <SaveHeartBurst particles={dockHeartParticles} /> },
  ];

  function openMobileCategories() {
    setIsOpen(false);
    setIsDashboardMenuOpen(false);
    setIsLanguageMenuOpen(false);
    if (isCommunity) {
      window.dispatchEvent(new CustomEvent("mobile-category-menu-request", { detail: "community" }));
      return;
    }
    if (isServices) {
      window.dispatchEvent(new CustomEvent("mobile-category-menu-request", { detail: "services" }));
      return;
    }
    if (!pathname.startsWith("/market")) {
      router.push("/market?filters=open");
      return;
    }
    window.dispatchEvent(new CustomEvent("mobile-category-menu-request", { detail: dockSection }));
  }

  function openMobileDashboard() {
    setIsOpen(false);
    setIsLanguageMenuOpen(false);
    window.dispatchEvent(new Event("mobile-category-menu-close"));
    setIsDashboardMenuOpen(true);
  }

  return (
    <>
      <header className="site-header">
      <div className="site-nav global-shell">
        <Link className="site-logo" href="/" aria-label="Tada home">
          <img src="/images/logo.png" alt="Tada" />
        </Link>

        <form className="nav-search" action="#" role="search" onSubmit={submitSearch}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path d="m16 16 4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input value={searchQuery} onChange={(event) => updateSearchQuery(event.target.value)} onFocus={() => { if (!isMarket) return; setIsSearchSuggestionsOpen(true); if (!trendingSearches.length) void loadTrendingSearches(); }} onBlur={() => window.setTimeout(() => setIsSearchSuggestionsOpen(false), 120)} type="search" role="combobox" placeholder={searchPlaceholder} aria-autocomplete={isMarket ? "list" : "none"} aria-expanded={isMarket && isSearchSuggestionsOpen && trendingSearches.length > 0} aria-controls={isMarket ? "trending-searches" : undefined} />
          <button className="nav-search-submit" type="submit" aria-label="Search">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path d="m16 16 4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
          {isMarket && isSearchSuggestionsOpen && trendingSearches.length > 0 ? (
            <div className="nav-search-suggestions" id="trending-searches" role="listbox" aria-label="Popular searches">
              <span>Popular searches</span>
              {trendingSearches.map((term) => (
                <button key={term} type="button" role="option" aria-selected={false} onMouseDown={(event) => event.preventDefault()} onClick={() => chooseTrendingSearch(term)}>{term}</button>
              ))}
            </div>
          ) : null}
        </form>

        <button
          className={`nav-menu-button ${isOpen ? "is-open" : ""}`}
          type="button"
          aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={isOpen}
          aria-controls="mobile-nav-menu"
          onClick={() => setIsOpen((current) => !current)}
        >
          <span />
          <span />
          <span />
        </button>

        {isAuthReady && (
          <button className={`mobile-profile-link ${!isSignedIn ? "is-guest" : ""} ${isDashboardMenuOpen ? "is-open" : ""}`} type="button" aria-label={isDashboardMenuOpen ? "Close account menu" : isSignedIn ? "Open my dashboard menu" : "Open account menu"} aria-expanded={isDashboardMenuOpen} aria-controls={isSignedIn ? "mobile-dashboard-menu" : "mobile-account-menu"} title={userEmail ?? "Account"} onClick={handleMobileProfileClick}>
            {isSignedIn ? <Avatar src={avatarUrl} name={displayName} alt="Profile" className="nav-avatar-initial" colored /> : <i className="ms ms-account-circle" aria-hidden="true" />}
          </button>
        )}
        <Link className={`mobile-notifications nav-notifications ${unreadNotificationCount ? "has-unread" : ""}`} href="/market/dashboard/notifications" aria-label={`${unreadNotificationCount} unread notifications`}>
          <i className="ms ms-notifications" aria-hidden="true" />
          {unreadNotificationCount ? <span>{notificationBadge}</span> : null}
        </Link>
        <button className="mobile-language-button" type="button" aria-label="Open language settings" aria-expanded={isLanguageMenuOpen} aria-controls="language-settings-dialog" onClick={() => { setIsOpen(false); setIsDashboardMenuOpen(false); setIsDesktopDashboardOpen(false); setIsLanguageMenuOpen(true); }}>
          {languageButtonLabel ? <span>{languageButtonLabel}</span> : <i className="ms ms-language" aria-hidden="true" />}
        </button>

        <nav className="primary-nav" aria-label="Main navigation">
          <Link className={isMarket ? "is-active" : ""} href="/market">
            <i className="ms ms-storefront" aria-hidden="true" />
            <span>{t("market")}</span>
          </Link>
          <Link className={isCommunity ? "is-active" : ""} href="/community">
            <i className="ms ms-group" aria-hidden="true" />
            <span>{t("community")}</span>
          </Link>
          <Link className={isServices ? "is-active" : ""} href="/services">
            <i className="ms ms-build" aria-hidden="true" />
            <span>{t("services")}</span>
          </Link>
        </nav>

        <div className="nav-actions">
          <Link className={`nav-notifications ${unreadNotificationCount ? "has-unread" : ""}`} href="/market/dashboard/notifications" aria-label={`${unreadNotificationCount} unread notifications`}>
            <i className="ms ms-notifications" aria-hidden="true" />
            {unreadNotificationCount ? <span>{notificationBadge}</span> : null}
          </Link>
          <button className="nav-language-button" type="button" aria-label="Open language settings" aria-expanded={isLanguageMenuOpen} aria-controls="language-settings-dialog" onClick={() => { setIsDesktopDashboardOpen(false); setIsLanguageMenuOpen(true); }}>
            {languageButtonLabel ? <span>{languageButtonLabel}</span> : <i className="ms ms-language" aria-hidden="true" />}
          </button>
          {isAuthReady && userEmail ? (
            <button className="nav-profile-link nav-profile-dashboard-trigger" type="button" title={userEmail} aria-label="Open dashboard menu" aria-expanded={isDesktopDashboardOpen} aria-controls="desktop-dashboard-menu" onClick={() => setIsDesktopDashboardOpen(true)}>
              <Avatar src={avatarUrl} name={displayName} alt="Profile" className="nav-avatar-initial" colored />
            </button>
          ) : isAuthReady ? (
            <>
              <Link className="nav-signup" href="/login">{t("logIn")}</Link>
            </>
          ) : null}
        </div>

        <MobileDrawerBackdrop open={isOpen} ariaLabel="Close navigation menu" className="mobile-menu-backdrop" onClose={() => { setIsOpen(false); setIsDashboardMenuOpen(false); }} />

        <nav className={`mobile-nav-menu profile-popup-surface ${isOpen ? "is-open" : ""}`} id="mobile-nav-menu" aria-label="Mobile navigation">
          <Link className={isMarket ? "is-active" : ""} href="/market" onClick={() => setIsOpen(false)}>
            <i className="ms ms-storefront" aria-hidden="true" />
            {t("market")}
          </Link>
          <Link className={isCommunity ? "is-active" : ""} href="/community" onClick={() => setIsOpen(false)}>
            <i className="ms ms-group" aria-hidden="true" />
            {t("community")}
          </Link>
          <Link className={isServices ? "is-active" : ""} href="/services" onClick={() => setIsOpen(false)}>
            <i className="ms ms-build" aria-hidden="true" />
            {t("services")}
          </Link>
        </nav>

        {userEmail && (
          isDashboardMenuOpen ? <DialogOverlay className="mobile-profile-popover-dialog" onClose={() => setIsDashboardMenuOpen(false)}>
            <nav className="mobile-profile-popover profile-popup-surface" id="mobile-dashboard-menu" aria-label="Dashboard menu">
              <div className="mobile-profile-popover-header">
                <div className="mobile-profile-popover-avatar" aria-hidden="true"><Avatar src={avatarUrl} name={displayName} colored /></div>
                <div><span>{displayName ?? userEmail}</span><small>{userEmail}</small></div>
              </div>
              <DashboardMenuItems
                variant="mobile"
                pathname={pathname}
                isJobs={isJobs}
                unreadMessageCount={unreadMessageCount}
                unreadNotificationCount={unreadNotificationCount}
                isAdmin={isAdmin}
                onNavigate={() => setIsDashboardMenuOpen(false)}
                onSignOut={() => void handleSignOut()}
              />
            </nav>
          </DialogOverlay> : null
        )}
        {isAuthReady && !userEmail && (
          <>
            <MobileDrawerBackdrop open={isDashboardMenuOpen} onClose={() => setIsDashboardMenuOpen(false)} ariaLabel="Close account menu" className="mobile-auth-backdrop" />
            <nav className={`mobile-auth-menu ${isDashboardMenuOpen ? "is-open" : ""}`} id="mobile-account-menu" aria-label="Account menu">
              <p>{t("accountMenu")}</p>
              <Link href="/login" onClick={() => setIsDashboardMenuOpen(false)}><i className="ms ms-login" aria-hidden="true" /> {t("logIn")}</Link>
              <Link href="/signup" onClick={() => setIsDashboardMenuOpen(false)}><i className="ms ms-person-add" aria-hidden="true" /> {t("signUp")}</Link>
            </nav>
          </>
        )}

      </div>
      </header>
      {isLanguageMenuOpen ? (
        <DialogOverlay className="language-settings-dialog" onClose={() => setIsLanguageMenuOpen(false)}>
          <section className="language-settings-card profile-popup-surface" id="language-settings-dialog" aria-label="Language settings">
            <header>
              <div><i className="ms ms-language" aria-hidden="true" /><div><span className="language-settings-title">{t("languageSettings")}</span><span>{t("displayLanguage")}</span></div></div>
              <button type="button" aria-label="Close language settings" onClick={() => setIsLanguageMenuOpen(false)}><i className="ms ms-close" aria-hidden="true" /></button>
            </header>
            <div className="language-settings-options" role="radiogroup" aria-label={t("displayLanguage")}>
              {languageOptions.map((option) => (
                <button className={locale === option.code ? "is-selected" : ""} type="button" role="radio" aria-checked={locale === option.code} key={option.code} disabled={isSavingLanguage} onClick={() => void handleLocaleSelection(option.code)}>
                  <span className="language-settings-flag">{option.flag}</span>
                  <span><span className="language-settings-option-label">{option.label}</span><small>{option.nativeLabel}</small></span>
                  {locale === option.code ? <i className="ms ms-check" aria-hidden="true" /> : null}
                </button>
              ))}
            </div>
            <p className="language-settings-status" role="status">{languageStatus || t("supportedNow")}</p>
          </section>
        </DialogOverlay>
      ) : null}
      {userEmail && isDesktopDashboardOpen ? (
        <DialogOverlay className="desktop-dashboard-dialog" onClose={() => setIsDesktopDashboardOpen(false)}>
          <nav className="mobile-profile-popover desktop-profile-popover profile-popup-surface" id="desktop-dashboard-menu" aria-label="Dashboard menu">
            <div className="mobile-profile-popover-header">
              <div className="mobile-profile-popover-avatar" aria-hidden="true">
                <Avatar src={avatarUrl} name={displayName} colored />
              </div>
              <div>
                <span>{displayName ?? userEmail}</span>
                <small>{userEmail}</small>
              </div>
            </div>
            <DashboardMenuItems
              variant="mobile"
              pathname={pathname}
              isJobs={isJobs}
              unreadMessageCount={unreadMessageCount}
              unreadNotificationCount={unreadNotificationCount}
              isAdmin={isAdmin}
              onNavigate={() => setIsDesktopDashboardOpen(false)}
              onSignOut={() => void handleSignOut()}
            />
          </nav>
        </DialogOverlay>
      ) : null}
      {!isMessagesPage ? <MobileDock items={listingDockItems ?? standardDockItems} /> : null}
    </>
  );
}
