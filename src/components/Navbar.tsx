"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { MobileDrawerBackdrop } from "@/components/MobileDrawer";
import { languageOptions, type SupportedLocale, useLanguage } from "@/components/LanguageProvider";
import { createHeartParticles, SaveHeartBurst, saveFeedbackClasses, type HeartParticle } from "@/components/SaveHeartBurst";
import { DialogOverlay } from "@/components/ui/DialogOverlay";
import { MobileDock, type MobileDockItem } from "@/components/ui/MobileDock";
import { getAvatarFallback } from "@/lib/avatar-fallback";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

const authlessRoutes = new Set(["/login", "/signup"]);
const dashboardMenuItems = [
  ["fa-border-all", "Dashboard", ""],
  ["fa-circle-user", "Profile Settings", "/profile"],
  ["fa-bell", "Notifications", "/notifications"],
  ["fa-message", "Messages", "/messages"],
  ["fa-heart", "Wishlist", "/wishlist"],
  ["fa-key", "Keywords", "/keywords"],
  ["fa-rectangle-list", "Manage Listings", "/listings"],
] as const;
const dashboardMenuDescriptions = {
  Dashboard: "Overview and account activity",
  "Profile Settings": "Profile, language and preferences",
  Notifications: "Updates and account alerts",
  Messages: "Your conversations",
  Wishlist: "Listings you have saved",
  Keywords: "Saved search alerts",
  "Manage Listings": "Create and manage listings",
} as const;

declare global {
  interface Window {
    __tadaOnlineMemberIds?: string[];
    __tadaListingDockConfig?: { isOwner: boolean; isSaved: boolean };
  }
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
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
  }, [pathname]);

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
    document.body.classList.toggle("post-ad-screen", pathname.startsWith("/market/create") || /^\/market\/[^/]+\/edit$/.test(pathname));
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
      const bottomInset = Math.max(0, Math.round(layoutViewportHeight - visibleViewportBottom));
      root.style.setProperty("--mobile-viewport-bottom-inset", `${bottomInset}px`);
    };

    updateMobileViewportInset();
    visualViewport?.addEventListener("resize", updateMobileViewportInset);
    visualViewport?.addEventListener("scroll", updateMobileViewportInset);
    window.addEventListener("resize", updateMobileViewportInset);
    mobileQuery.addEventListener("change", updateMobileViewportInset);

    return () => {
      visualViewport?.removeEventListener("resize", updateMobileViewportInset);
      visualViewport?.removeEventListener("scroll", updateMobileViewportInset);
      window.removeEventListener("resize", updateMobileViewportInset);
      mobileQuery.removeEventListener("change", updateMobileViewportInset);
      root.style.removeProperty("--mobile-viewport-bottom-inset");
    };
  }, []);

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

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchQuery.trim();
    if (pathname !== "/market") {
      router.push(`/market${query ? `?q=${encodeURIComponent(query)}` : ""}`);
      return;
    }
    window.dispatchEvent(new CustomEvent("market-search-query-change", { detail: searchQuery }));
  };

  const updateSearchQuery = (value: string) => {
    setSearchQuery(value);
    if (pathname === "/market") {
      window.dispatchEvent(new CustomEvent("market-search-query-change", { detail: value }));
    }
  };

  const isMarket = pathname.startsWith("/market");
  const isJobs = pathname.startsWith("/jobs");
  const isPostAd = pathname.startsWith("/market/create") || /^\/market\/[^/]+\/edit$/.test(pathname);
  const isListingDetail = /^\/market\/[^/]+$/.test(pathname);
  const isMessagesPage = pathname.startsWith("/market/dashboard/messages");
  const dashboardBase = `/${isJobs ? "jobs" : "market"}/dashboard`;
  const avatarFallback = getAvatarFallback(displayName);
  const isSignedIn = Boolean(userEmail);
  const languageButtonLabel = locale === "en" ? "EN" : locale === "ko" ? "한글" : null;
  const unreadBadge = unreadMessageCount > 99 ? "99+" : String(unreadMessageCount);
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
    { id: "home", label: t("home"), icon: "home", href: "/market", active: isMarket && !isPostAd && !pathname.startsWith("/market/dashboard") },
    { id: "messages", label: t("messages"), icon: "message", href: `${dashboardBase}/messages`, active: isMessagesPage },
    { id: "create", label: t("create"), icon: "create", href: "/market/create", active: isPostAd, variant: "create" },
    { id: "categories", label: "Browse categories", icon: "categories", onClick: openMobileCategories },
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
      : { id: "save", label: listingDockConfig.isSaved ? "Remove saved listing" : "Save listing", icon: "heart", solidIcon: listingDockConfig.isSaved, active: listingDockConfig.isSaved, pressed: listingDockConfig.isSaved, variant: "save", className: `${saveFeedbackClasses.root} ${isDockHeartPopping ? saveFeedbackClasses.popping : ""}`, onClick: () => triggerListingDockAction("save"), overlay: <SaveHeartBurst particles={dockHeartParticles} /> },
  ];

  function openMobileCategories() {
    setIsOpen(false);
    setIsDashboardMenuOpen(false);
    setIsLanguageMenuOpen(false);
    if (pathname !== "/market") {
      router.push("/market?filters=open");
      return;
    }
    window.dispatchEvent(new Event("mobile-category-menu-request"));
  }

  function openMobileDashboard() {
    setIsOpen(false);
    setIsLanguageMenuOpen(false);
    window.dispatchEvent(new Event("mobile-category-menu-close"));
    setIsDashboardMenuOpen(true);
  }

  return (
    <>
      <header className={`site-header ${isMessagesPage ? "is-messages-page" : ""}`}>
      <div className="site-nav">
        <Link className="site-logo" href="/" aria-label="Tada home">
          <img src="/images/logo.png" alt="Tada" />
        </Link>

        <form className="nav-search" action="#" role="search" onSubmit={submitSearch}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path d="m16 16 4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input value={searchQuery} onChange={(event) => updateSearchQuery(event.target.value)} type="search" placeholder={t("search")} />
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
            {isSignedIn ? (avatarUrl ? <img src={avatarUrl} alt="Profile" /> : <span className="nav-avatar-initial" style={{ backgroundColor: avatarFallback.color }}>{avatarFallback.initial}</span>) : <i className="fa-regular fa-circle-user" aria-hidden="true" />}
          </button>
        )}
        <Link className={`mobile-notifications nav-notifications ${unreadNotificationCount ? "has-unread" : ""}`} href="/market/dashboard/notifications" aria-label={`${unreadNotificationCount} unread notifications`}>
          <i className="fa-regular fa-bell" aria-hidden="true" />
          {unreadNotificationCount ? <span>{notificationBadge}</span> : null}
        </Link>
        <button className="mobile-language-button" type="button" aria-label="Open language settings" aria-expanded={isLanguageMenuOpen} aria-controls="language-settings-dialog" onClick={() => { setIsOpen(false); setIsDashboardMenuOpen(false); setIsDesktopDashboardOpen(false); setIsLanguageMenuOpen(true); }}>
          {languageButtonLabel ? <span>{languageButtonLabel}</span> : <i className="fa-solid fa-language" aria-hidden="true" />}
        </button>

        <nav className="primary-nav" aria-label="Main navigation">
          <Link className={isMarket ? "is-active" : ""} href="/market">
            <i className="fa-solid fa-store" aria-hidden="true" />
            <span>{t("market")}</span>
          </Link>
          <Link className={isJobs ? "is-active" : ""} href="/jobs">
            <i className="fa-solid fa-briefcase" aria-hidden="true" />
            <span>{t("jobs")}</span>
          </Link>
        </nav>

        <div className="nav-actions">
          <Link className="nav-post" href="/market/create" aria-current={isPostAd ? "page" : undefined}>
            <i className="fa-solid fa-plus" aria-hidden="true" />
            <span>{t("create")}</span>
          </Link>
          <Link className={`nav-notifications ${unreadNotificationCount ? "has-unread" : ""}`} href="/market/dashboard/notifications" aria-label={`${unreadNotificationCount} unread notifications`}>
            <i className="fa-regular fa-bell" aria-hidden="true" />
            {unreadNotificationCount ? <span>{notificationBadge}</span> : null}
          </Link>
          <button className="nav-language-button" type="button" aria-label="Open language settings" aria-expanded={isLanguageMenuOpen} aria-controls="language-settings-dialog" onClick={() => { setIsDesktopDashboardOpen(false); setIsLanguageMenuOpen(true); }}>
            {languageButtonLabel ? <span>{languageButtonLabel}</span> : <i className="fa-solid fa-language" aria-hidden="true" />}
          </button>
          {isAuthReady && userEmail ? (
            <button className="nav-profile-link nav-profile-dashboard-trigger" type="button" title={userEmail} aria-label="Open dashboard menu" aria-expanded={isDesktopDashboardOpen} aria-controls="desktop-dashboard-menu" onClick={() => setIsDesktopDashboardOpen(true)}>
              {avatarUrl ? <img src={avatarUrl} alt="Profile" /> : <span className="nav-avatar-initial" style={{ backgroundColor: avatarFallback.color }}>{avatarFallback.initial}</span>}
            </button>
          ) : isAuthReady ? (
            <>
              <Link className="nav-signup" href="/login">Log in</Link>
            </>
          ) : null}
        </div>

        <MobileDrawerBackdrop open={isOpen} ariaLabel="Close navigation menu" className="mobile-menu-backdrop" onClose={() => { setIsOpen(false); setIsDashboardMenuOpen(false); }} />

        <nav className={`mobile-nav-menu ${isOpen ? "is-open" : ""}`} id="mobile-nav-menu" aria-label="Mobile navigation">
          <Link className={isMarket ? "is-active" : ""} href="/market" onClick={() => setIsOpen(false)}>
            <i className="fa-solid fa-store" aria-hidden="true" />
            Market
          </Link>
          <Link className={isJobs ? "is-active" : ""} href="/jobs" onClick={() => setIsOpen(false)}>
            <i className="fa-solid fa-briefcase" aria-hidden="true" />
            Jobs
          </Link>
        </nav>

        {userEmail && (
          isDashboardMenuOpen ? <DialogOverlay className="mobile-profile-popover-dialog" onClose={() => setIsDashboardMenuOpen(false)}>
            <nav className="mobile-profile-popover" id="mobile-dashboard-menu" aria-label="Dashboard menu">
              <div className="mobile-profile-popover-header">
                <div className="mobile-profile-popover-avatar" aria-hidden="true">{avatarUrl ? <img src={avatarUrl} alt="" /> : <span style={{ backgroundColor: avatarFallback.color }}>{avatarFallback.initial}</span>}</div>
                <div><span>{displayName ?? userEmail}</span><small>{userEmail}</small></div>
              </div>
            {dashboardMenuItems.map(([icon, label, suffix]) => (
              <Link className={`mobile-profile-popover-item ${pathname === (label === "Wishlist" && !isJobs ? "/market/wishlist" : `${dashboardBase}${suffix}`) ? "is-active" : ""}`} href={label === "Wishlist" && !isJobs ? "/market/wishlist" : `${dashboardBase}${suffix}`} key={label} onClick={() => setIsDashboardMenuOpen(false)}>
                <i className={`fa-solid ${icon}`} aria-hidden="true" />
                <span>{label}</span>
                {label === "Messages" && unreadMessageCount ? <b>{unreadBadge}</b> : label === "Notifications" && unreadNotificationCount ? <b>{notificationBadge}</b> : <i className="fa-solid fa-chevron-right" aria-hidden="true" />}
              </Link>
            ))}
            {isAdmin ? <Link className={`mobile-profile-popover-item ${pathname.startsWith("/admin") ? "is-active" : ""}`} href="/admin" onClick={() => setIsDashboardMenuOpen(false)}><i className="fa-solid fa-shield-halved" aria-hidden="true" /><span>Admin centre</span><i className="fa-solid fa-chevron-right" aria-hidden="true" /></Link> : null}
            <button className="mobile-profile-popover-logout" type="button" onClick={() => void handleSignOut()}><i className="fa-solid fa-right-from-bracket" aria-hidden="true" /> Log out</button>
            </nav>
          </DialogOverlay> : null
        )}
        {isAuthReady && !userEmail && (
          <>
            <MobileDrawerBackdrop open={isDashboardMenuOpen} onClose={() => setIsDashboardMenuOpen(false)} ariaLabel="Close account menu" className="mobile-auth-backdrop" />
            <nav className={`mobile-auth-menu ${isDashboardMenuOpen ? "is-open" : ""}`} id="mobile-account-menu" aria-label="Account menu">
              <p>Account</p>
              <Link href="/login" onClick={() => setIsDashboardMenuOpen(false)}><i className="fa-solid fa-right-to-bracket" aria-hidden="true" /> Log in</Link>
              <Link href="/signup" onClick={() => setIsDashboardMenuOpen(false)}><i className="fa-solid fa-user-plus" aria-hidden="true" /> Sign up</Link>
            </nav>
          </>
        )}

      </div>
      </header>
      {isLanguageMenuOpen ? (
        <DialogOverlay className="language-settings-dialog" onClose={() => setIsLanguageMenuOpen(false)}>
          <section className="language-settings-card" id="language-settings-dialog" aria-label="Language settings">
            <header>
              <div><i className="fa-solid fa-language" aria-hidden="true" /><div><span className="language-settings-title">{t("languageSettings")}</span><span>{t("displayLanguage")}</span></div></div>
              <button type="button" aria-label="Close language settings" onClick={() => setIsLanguageMenuOpen(false)}><i className="fa-solid fa-xmark" aria-hidden="true" /></button>
            </header>
            <div className="language-settings-options" role="radiogroup" aria-label={t("displayLanguage")}>
              {languageOptions.map((option) => (
                <button className={locale === option.code ? "is-selected" : ""} type="button" role="radio" aria-checked={locale === option.code} key={option.code} disabled={isSavingLanguage} onClick={() => void handleLocaleSelection(option.code)}>
                  <span className="language-settings-flag">{option.flag}</span>
                  <span><span className="language-settings-option-label">{option.label}</span><small>{option.nativeLabel}</small></span>
                  {locale === option.code ? <i className="fa-solid fa-check" aria-hidden="true" /> : null}
                </button>
              ))}
            </div>
            <p className="language-settings-status" role="status">{languageStatus || t("supportedNow")}</p>
          </section>
        </DialogOverlay>
      ) : null}
      {userEmail && isDesktopDashboardOpen ? (
        <DialogOverlay className="desktop-dashboard-dialog" onClose={() => setIsDesktopDashboardOpen(false)}>
          <nav className="desktop-dashboard-menu" id="desktop-dashboard-menu" aria-label="Dashboard menu">
            <div className="desktop-dashboard-profile">
              <div className="desktop-dashboard-avatar" aria-hidden="true">
                {avatarUrl ? <img src={avatarUrl} alt="" /> : <span style={{ backgroundColor: avatarFallback.color }}>{avatarFallback.initial}</span>}
              </div>
              <div>
                <span className="desktop-dashboard-name">{displayName ?? userEmail}</span>
                <span>{userEmail}</span>
                <span className="desktop-dashboard-member">Member</span>
              </div>
            </div>
            {dashboardMenuItems.map(([icon, label, suffix]) => {
              const href = label === "Wishlist" && !isJobs ? "/market/wishlist" : `${dashboardBase}${suffix}`;
              return (
                <Link className={`desktop-dashboard-menu-item ${pathname === href ? "is-active" : ""}`} href={href} key={label} onClick={() => setIsDesktopDashboardOpen(false)}>
                  <i className={`fa-solid ${icon}`} aria-hidden="true" />
                  <span className="desktop-dashboard-menu-label">{label}</span>
                  {label === "Messages" && unreadMessageCount ? <b>{unreadBadge}</b> : label === "Notifications" && unreadNotificationCount ? <b>{notificationBadge}</b> : <i className="fa-solid fa-chevron-right desktop-dashboard-chevron" aria-hidden="true" />}
                </Link>
              );
            })}
            {isAdmin ? <Link className={`desktop-dashboard-menu-item ${pathname.startsWith("/admin") ? "is-active" : ""}`} href="/admin" onClick={() => setIsDesktopDashboardOpen(false)}><i className="fa-solid fa-shield-halved" aria-hidden="true" /><span className="desktop-dashboard-menu-label">Admin centre</span><i className="fa-solid fa-chevron-right desktop-dashboard-chevron" aria-hidden="true" /></Link> : null}
            <button className="desktop-dashboard-logout" type="button" onClick={() => void handleSignOut()}><i className="fa-solid fa-right-from-bracket" aria-hidden="true" /> Log out</button>
          </nav>
        </DialogOverlay>
      ) : null}
      {!isMessagesPage ? <MobileDock items={listingDockItems ?? standardDockItems} /> : null}
    </>
  );
}
