"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type CSSProperties, FormEvent, Suspense, useEffect, useRef, useState } from "react";
import { MobileDrawerBackdrop } from "@/components/MobileDrawer";
import { DashboardMenuItems } from "@/components/dashboard/DashboardMenuItems";
import { languageOptions, translateForLocale, type SupportedLocale, useLanguage } from "@/components/LanguageProvider";
import { createHeartParticles, SaveHeartBurst, saveFeedbackClasses, type HeartParticle } from "@/components/SaveHeartBurst";
import { Avatar } from "@/components/ui/Avatar";
import { DialogOverlay } from "@/components/ui/DialogOverlay";
import { MobileDock, type MobileDockItem } from "@/components/ui/MobileDock";
import { MobileCreateMenu, type CreateMenuSection } from "@/components/layout/MobileCreateMenu";
import { communityCreateHref } from "@/components/community/CommunityFilterSidebar";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { marketSearchTermsResponseSchema } from "@/contracts/api";
import { readApiResponse } from "@/lib/api/client";

const authlessRoutes = new Set(["/login", "/signup"]);
const LISTING_ACTION_DOCK = false;
declare global {
  interface Window {
    __tadaOnlineMemberIds?: string[];
    __tadaListingDockConfig?: { isOwner: boolean; isSaved: boolean };
  }
}

/** Mirrors the `q` query param into the header's search box.
 *
 *   is what obliges a Suspense boundary, and a boundary
 *  around the whole header made it hydrate in a later pass than
 *  LanguageProvider — by which time the locale had already flipped, so the
 *  header hydrated Korean text against English server markup. Isolating the
 *  hook here keeps the boundary down to a component that renders nothing. */
function SearchQuerySync({ onQueryChange, onCommunityCategoryChange }: { onQueryChange: (query: string) => void; onCommunityCategoryChange: (category: string | null) => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    onQueryChange(params.get("q") ?? "");
    onCommunityCategoryChange(params.get("category"));
  }, [pathname, searchParams, onQueryChange, onCommunityCategoryChange]);

  return null;
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isDashboardMenuOpen, setIsDashboardMenuOpen] = useState(false);
  const [isDesktopDashboardOpen, setIsDesktopDashboardOpen] = useState(false);
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
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
  const [communityCategory, setCommunityCategory] = useState<string | null>(null);
  const [trendingSearches, setTrendingSearches] = useState<string[]>([]);
  const [isSearchSuggestionsOpen, setIsSearchSuggestionsOpen] = useState(false);
  const [listingDockConfig, setListingDockConfig] = useState<{ isOwner: boolean; isSaved: boolean } | null>(null);
  const [dockHeartParticles, setDockHeartParticles] = useState<HeartParticle[]>([]);
  const [isDockHeartPopping, setIsDockHeartPopping] = useState(false);
  const [isListingShareCopied, setIsListingShareCopied] = useState(false);
  const dockHeartTimer = useRef<number | null>(null);
  const shareCopiedTimer = useRef<number | null>(null);
  const desktopProfileButtonRef = useRef<HTMLButtonElement>(null);
  const [desktopPopoverPosition, setDesktopPopoverPosition] = useState<{ top: number; right: number } | null>(null);
  const { locale, setLocale, t } = useLanguage();

  const positionDesktopPopover = (button: HTMLButtonElement | null) => {
    if (!button) return;
    const bounds = button.getBoundingClientRect();
    setDesktopPopoverPosition({ top: bounds.bottom, right: window.innerWidth - bounds.right });
  };

  useEffect(() => {
    if (!isLanguageMenuOpen && !isDesktopDashboardOpen) return;
    const updatePosition = () => {
      if (window.innerWidth < 1024) {
        setIsDesktopDashboardOpen(false);
        return;
      }
      positionDesktopPopover(desktopProfileButtonRef.current);
    };
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isLanguageMenuOpen, isDesktopDashboardOpen]);

  const desktopPopoverStyle = desktopPopoverPosition ? {
    "--header-popover-top": `${desktopPopoverPosition.top}px`,
    "--header-popover-right": `${desktopPopoverPosition.right}px`,
  } as CSSProperties : undefined;

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
        const avatarPath = user.user_metadata?.avatar_path;
        const [{ count: messageCount }, { count: notificationCount }, { data: role }, { data: signedAvatar }] = await Promise.all([
          supabase.from("market_messages").select("id", { count: "exact", head: true }).eq("recipient_id", user.id).is("read_at", null),
          supabase.from("market_notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null),
          supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle(),
          avatarPath ? supabase.storage.from("profile-avatars").createSignedUrl(avatarPath, 3600) : Promise.resolve({ data: null }),
        ]);
        if (isMounted) {
          setUnreadMessageCount(messageCount ?? 0);
          setUnreadNotificationCount(notificationCount ?? 0);
          setIsAdmin(role?.role === "admin" || role?.role === "moderator");
          setAvatarUrl(signedAvatar?.signedUrl ?? null);
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
    let notificationRefreshTimer: ReturnType<typeof setTimeout> | null = null;
    const queueNotificationRefresh = () => {
      if (notificationRefreshTimer) clearTimeout(notificationRefreshTimer);
      notificationRefreshTimer = setTimeout(() => { void refreshNotificationCount(); }, 150);
    };
    const channel = supabase
      .channel(`market-unread-count:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "market_messages", filter: `recipient_id=eq.${userId}` }, () => { void refreshUnreadCount(); })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "market_messages", filter: `recipient_id=eq.${userId}` }, () => { void refreshUnreadCount(); })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "market_notifications", filter: `user_id=eq.${userId}` }, queueNotificationRefresh)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "market_notifications", filter: `user_id=eq.${userId}` }, queueNotificationRefresh)
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "market_notifications" }, queueNotificationRefresh)
      .subscribe();
    return () => { if (notificationRefreshTimer) clearTimeout(notificationRefreshTimer); void supabase.removeChannel(channel).catch(() => undefined); };
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

  // Phones only: the search row slides away once the reader is 15% of the way down the page
  // and comes back on the first upward scroll, so it is out of the way while reading and one flick
  // from use. The class sits on <html>; styles.css moves the sticky header, so nothing reflows.
  useEffect(() => {
    const root = document.documentElement;
    const phone = window.matchMedia("(max-width: 767.98px)");
    const HIDE_AFTER = 0.15;
    const IGNORE_BELOW = 6;
    let lastY = window.scrollY;
    let frame: number | null = null;

    const update = () => {
      frame = null;
      if (!phone.matches) {
        root.classList.remove("site-search-hidden");
        return;
      }
      const y = Math.max(0, window.scrollY);
      const delta = y - lastY;
      const range = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      if (y <= 8 || delta < -IGNORE_BELOW) root.classList.remove("site-search-hidden");
      else if (delta > IGNORE_BELOW && y / range >= HIDE_AFTER) root.classList.add("site-search-hidden");
      if (Math.abs(delta) > IGNORE_BELOW || y <= 8) lastY = y;
    };
    const onScroll = () => { if (frame === null) frame = window.requestAnimationFrame(update); };

    root.classList.remove("site-search-hidden");
    lastY = window.scrollY;
    window.addEventListener("scroll", onScroll, { passive: true });
    phone.addEventListener("change", update);
    return () => {
      window.removeEventListener("scroll", onScroll);
      phone.removeEventListener("change", update);
      if (frame !== null) window.cancelAnimationFrame(frame);
      root.classList.remove("site-search-hidden");
    };
  }, [pathname]);

  useEffect(() => {
    const hasMobileDock = !authlessRoutes.has(pathname);
    document.body.classList.toggle("has-mobile-bottom-dock", hasMobileDock);
    return () => {
      document.body.classList.remove("has-mobile-bottom-dock");
    };
  }, [pathname]);

  useEffect(() => {
    const root = document.documentElement;
    const mobileQuery = window.matchMedia("(max-width: 767.98px)");
    const visualViewport = window.visualViewport;

    // The browser toolbar animates for a few hundred milliseconds and reports a new viewport on
    // every frame of it. Following each report made the dock chase the toolbar in small jumps, so
    // the inset is applied once the viewport has been still for a moment, and the dock's own
    // transform transition does the gliding.
    let settleTimer: number | null = null;

    const updateMobileViewportInset = () => {
      if (!mobileQuery.matches || !visualViewport) {
        root.style.removeProperty("--mobile-viewport-bottom-inset");
        return;
      }

      // iOS Chrome keeps its browser controls outside the visual viewport.
      // Reserve that covered area while visible, then let the dock use the
      // newly available space as the controls collapse on scroll.
      //
      // Two things move the visual viewport without any browser control covering the page, and
      // neither may lift the dock: the rubber band at the top (pull to refresh) pushes `offsetTop`
      // below zero, and pinch zoom shrinks the visible height. Both made the dock float up.
      const layoutViewportHeight = document.documentElement.clientHeight;
      const isZoomed = visualViewport.scale > 1.01;
      const visibleViewportBottom = Math.max(0, visualViewport.offsetTop) + visualViewport.height;
      const next = isZoomed ? "0px" : `${Math.max(0, Math.round(layoutViewportHeight - visibleViewportBottom))}px`;

      // This drives the `bottom` of the dock and the listing action bar. Writing
      // it when nothing moved invalidates style on every scroll frame.
      if (root.style.getPropertyValue("--mobile-viewport-bottom-inset") === next) return;
      root.style.setProperty("--mobile-viewport-bottom-inset", next);
    };

    const scheduleMobileViewportInsetUpdate = () => {
      if (settleTimer !== null) window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(updateMobileViewportInset, 90);
    };

    updateMobileViewportInset();
    visualViewport?.addEventListener("resize", scheduleMobileViewportInsetUpdate);
    visualViewport?.addEventListener("scroll", scheduleMobileViewportInsetUpdate);
    window.addEventListener("resize", scheduleMobileViewportInsetUpdate);
    mobileQuery.addEventListener("change", scheduleMobileViewportInsetUpdate);

    return () => {
      if (settleTimer !== null) window.clearTimeout(settleTimer);
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
    let settleTimer: number | null = null;

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

      // Read the lift from the variable that drives it rather than from the dock's rectangle: the
      // dock glides to its new place, and a rectangle measured mid-glide is a number nobody asked for.
      const dockBottomInset = Math.max(0, Math.round(parseFloat(root.style.getPropertyValue("--mobile-viewport-bottom-inset")) || 0));
      const next = `${Math.ceil(dock.offsetHeight + dockBottomInset + 32)}px`;

      // Compare against what is actually set rather than a cached number, so
      // the value is still restored if anything else clears the property.
      if (root.style.getPropertyValue("--mobile-dock-content-clearance") === next) return;
      root.style.setProperty("--mobile-dock-content-clearance", next);
    };

    // After the inset effect above has settled, so the lift it just applied is the one measured.
    const scheduleMobileDockClearanceUpdate = () => {
      if (settleTimer !== null) window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(updateMobileDockClearance, 140);
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
      if (settleTimer !== null) window.clearTimeout(settleTimer);
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
    setIsCreateMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isDesktopDashboardOpen && !isLanguageMenuOpen && !isCreateMenuOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setIsDesktopDashboardOpen(false);
      setIsLanguageMenuOpen(false);
      setIsCreateMenuOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isDesktopDashboardOpen, isLanguageMenuOpen, isCreateMenuOpen]);

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
  const dockSection: "bargain" | "market" | "community" = isCommunity ? "community" : isBargainShopType ? "bargain" : "market";
  const isPostAd = pathname.startsWith("/market/create") || pathname.startsWith("/community/create") || pathname.startsWith("/services/create") || /^\/market\/[^/]+\/edit$/.test(pathname);
  // The dock's create button opens a menu for all three; the row for the surface you are browsing is marked.
  const createSection: CreateMenuSection = isCommunity ? "community" : isServices ? "services" : "market";
  const createHrefs: Record<CreateMenuSection, string> = {
    market: isBargainShopType ? "/market/create/bargain" : "/market/create",
    community: communityCreateHref(isCommunity ? communityCategory : null),
    services: "/services/create",
  };
  const isListingDetail = /^\/market\/[^/]+$/.test(pathname);
  const dashboardBase = `/${isJobs ? "jobs" : "market"}/dashboard`;
  const isSignedIn = Boolean(userEmail);
  // Language lives in the profile menu at every screen size; this row opens the picker from there.
  const openLanguagePicker = () => { setIsOpen(false); setIsDashboardMenuOpen(false); setIsDesktopDashboardOpen(false); setIsLanguageMenuOpen(true); };
  const languageItem = { label: t("languageLabel"), value: languageOptions.find((option) => option.code === locale)?.nativeLabel ?? locale, onOpen: openLanguagePicker };
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
      setLanguageStatus(translateForLocale("languageSavedDevice", nextLocale));
      return;
    }

    setIsSavingLanguage(true);
    try {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        setLanguageStatus(translateForLocale("languageSavedDeviceSignIn", nextLocale));
        return;
      }

      const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
      const fallbackName = user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "Tada member";
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        display_name: profile?.display_name ?? displayName ?? fallbackName,
        preferred_locale: nextLocale,
      });
      setLanguageStatus(translateForLocale(error ? "languageSavedAccountRetry" : "languageSavedAccount", nextLocale));
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

  const unreadBadge = unreadMessageCount > 99 ? "99+" : unreadMessageCount > 0 ? String(unreadMessageCount) : undefined;
  const isOnDashboard = pathname.startsWith(dashboardBase);
  const standardDockItems: MobileDockItem[] = [
    { id: "market", label: t("market"), icon: "market", href: "/market", active: isMarket && !isPostAd && !isOnDashboard },
    { id: "community", label: t("community"), icon: "community", href: "/community", active: isCommunity && !isPostAd },
    { id: "create", label: locale === "ko" ? "등록" : "Create", icon: isCreateMenuOpen ? "close" : "create", onClick: toggleCreateMenu, expanded: isCreateMenuOpen, controls: "mobile-create-menu", variant: "create" },
    { id: "services", label: t("services"), icon: "services", href: "/services", active: isServices && !isPostAd },
    // Messages now live under My page, so their unread count rides on its icon.
    { id: "profile", label: t("myPage"), icon: "profile", onClick: openMobileDashboard, active: isDashboardMenuOpen || isOnDashboard, badge: unreadBadge },
  ];

  // The listing page keeps the standard dock; its offer, chat, share and save live in
  // the action panel under the description. Set LISTING_ACTION_DOCK to true to bring
  // back the dock that swapped to Market home, Message, Make offer, Copy link, Save.
  const listingDockItems: MobileDockItem[] | null = !LISTING_ACTION_DOCK || !isListingDetail || !listingDockConfig ? null : [
    { id: "home", label: t("listingDockMarketHome"), icon: "home", href: "/market" },
    { id: "message", label: t("listingDockMessageSeller"), icon: "message", onClick: () => triggerListingDockAction("message") },
    listingDockConfig.isOwner
      ? { id: "edit", label: t("listingDockEdit"), icon: "edit", onClick: () => triggerListingDockAction("edit"), variant: "offer" }
      : { id: "offer", label: t("listingDockOffer"), icon: "offer", onClick: () => triggerListingDockAction("offer"), variant: "offer" },
    { id: "share", label: isListingShareCopied ? t("listingDockLinkCopied") : t("listingDockCopyLink"), icon: isListingShareCopied ? "check" : "share", onClick: () => triggerListingDockAction("share") },
    listingDockConfig.isOwner
      ? { id: "delete", label: t("listingDelete"), icon: "delete", onClick: () => triggerListingDockAction("delete") }
      : { id: "save", label: listingDockConfig.isSaved ? t("listingUnsave") : t("listingSave"), icon: "heart", solidIcon: listingDockConfig.isSaved, active: listingDockConfig.isSaved, pressed: listingDockConfig.isSaved, variant: "save", className: `${saveFeedbackClasses.root} ${listingDockConfig.isSaved ? saveFeedbackClasses.saved : ""} ${isDockHeartPopping ? saveFeedbackClasses.popping : ""}`, onClick: () => triggerListingDockAction("save"), overlay: <SaveHeartBurst particles={dockHeartParticles} /> },
  ];

  /** The header's filter button opens the browse drawer of the section you are
   *  in (areas, subcategories, filters). Only the browse pages have a drawer to
   *  open; anywhere else the button takes you to one. */
  function openMobileCategories() {
    setIsOpen(false);
    setIsDashboardMenuOpen(false);
    setIsLanguageMenuOpen(false);
    setIsCreateMenuOpen(false);
    if (isCommunity) {
      if (pathname === "/community") window.dispatchEvent(new CustomEvent("mobile-category-menu-request", { detail: "community" }));
      else router.push("/community");
      return;
    }
    if (isServices) {
      if (pathname === "/services") window.dispatchEvent(new CustomEvent("mobile-category-menu-request", { detail: "services" }));
      else router.push("/services");
      return;
    }
    if (pathname === "/market" || /^\/market\/(secondhands|garage-sales|moving-sales|2dollarshop|groupbuy)$/.test(pathname)) {
      window.dispatchEvent(new CustomEvent("mobile-category-menu-request", { detail: dockSection }));
      return;
    }
    router.push("/market?filters=open");
  }

  function toggleCreateMenu() {
    setIsOpen(false);
    setIsDashboardMenuOpen(false);
    setIsLanguageMenuOpen(false);
    setIsCreateMenuOpen((current) => !current);
  }

  function openMobileDashboard() {
    setIsOpen(false);
    setIsLanguageMenuOpen(false);
    setIsCreateMenuOpen(false);
    window.dispatchEvent(new Event("mobile-category-menu-close"));
    setIsDashboardMenuOpen(true);
  }

  return (
    <>
      <Suspense fallback={null}><SearchQuerySync onQueryChange={setSearchQuery} onCommunityCategoryChange={setCommunityCategory} /></Suspense>
      <header className="site-header">
      <div className="site-nav global-shell">
        {/* Phones only: sits left of the logo and opens the browse drawer (areas, categories, filters). */}
        <button className="nav-search-filter" type="button" aria-label={locale === "ko" ? "지역, 카테고리, 필터" : "Areas, categories and filters"} onClick={openMobileCategories}>
          <i className="ms ms-menu" aria-hidden="true" />
        </button>

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
          {isAuthReady && userEmail ? (
            <button ref={desktopProfileButtonRef} className="nav-profile-link nav-profile-dashboard-trigger" type="button" title={userEmail} aria-label="Open dashboard menu" aria-expanded={isDesktopDashboardOpen} aria-controls="desktop-dashboard-menu" onClick={() => { positionDesktopPopover(desktopProfileButtonRef.current); setIsDesktopDashboardOpen(true); }}>
              <Avatar src={avatarUrl} name={displayName} alt="Profile" className="nav-avatar-initial" colored />
            </button>
          ) : isAuthReady ? (
            <>
              <Link className="nav-signup" href="/login">{t("logIn")}</Link>
              <button ref={desktopProfileButtonRef} className="nav-profile-link nav-profile-dashboard-trigger is-guest" type="button" aria-label="Open account menu" aria-expanded={isDesktopDashboardOpen} aria-controls="desktop-account-menu" onClick={() => { positionDesktopPopover(desktopProfileButtonRef.current); setIsDesktopDashboardOpen(true); }}>
                <i className="ms ms-account-circle" aria-hidden="true" />
              </button>
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
              languageItem={languageItem}
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
              <button type="button" className="profile-menu-language" aria-haspopup="dialog" onClick={languageItem.onOpen}><i className="ms ms-language" aria-hidden="true" /> <span>{languageItem.label}</span><span className="profile-menu-value">{languageItem.value}</span></button>
            </nav>
          </>
        )}

      </div>
      </header>
      {isLanguageMenuOpen ? (
        <DialogOverlay className="language-settings-dialog" style={desktopPopoverStyle} onClose={() => setIsLanguageMenuOpen(false)}>
          <section className="language-settings-card profile-popup-surface" id="language-settings-dialog" aria-label={t("languageSettings")}>
            <header>
              <div><i className="ms ms-language" aria-hidden="true" /><div><span className="language-settings-title">{t("languageSettings")}</span><span>{t("displayLanguage")}</span></div></div>
              <button type="button" aria-label={t("closeLanguageSettings")} onClick={() => setIsLanguageMenuOpen(false)}><i className="ms ms-close" aria-hidden="true" /></button>
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
      {isAuthReady && !userEmail && isDesktopDashboardOpen ? (
        <DialogOverlay className="desktop-dashboard-dialog" style={desktopPopoverStyle} onClose={() => setIsDesktopDashboardOpen(false)}>
          <nav className="mobile-profile-popover desktop-profile-popover profile-popup-surface" id="desktop-account-menu" aria-label="Account menu">
            <Link className="mobile-profile-popover-item" href="/login" onClick={() => setIsDesktopDashboardOpen(false)}><i className="ms ms-login" aria-hidden="true" /><span>{t("logIn")}</span></Link>
            <Link className="mobile-profile-popover-item" href="/signup" onClick={() => setIsDesktopDashboardOpen(false)}><i className="ms ms-person-add" aria-hidden="true" /><span>{t("signUp")}</span></Link>
            <button type="button" className="mobile-profile-popover-item profile-menu-language" aria-haspopup="dialog" onClick={languageItem.onOpen}><i className="ms ms-language" aria-hidden="true" /><span>{languageItem.label}</span><span className="profile-menu-value">{languageItem.value}</span></button>
          </nav>
        </DialogOverlay>
      ) : null}
      {userEmail && isDesktopDashboardOpen ? (
        <DialogOverlay className="desktop-dashboard-dialog" style={desktopPopoverStyle} onClose={() => setIsDesktopDashboardOpen(false)}>
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
              languageItem={languageItem}
            />
          </nav>
        </DialogOverlay>
      ) : null}
      {isCreateMenuOpen && !listingDockItems ? <MobileCreateMenu id="mobile-create-menu" ko={locale === "ko"} current={createSection} hrefs={createHrefs} onClose={() => setIsCreateMenuOpen(false)} /> : null}
      <MobileDock items={listingDockItems ?? standardDockItems} />
    </>
  );
}
