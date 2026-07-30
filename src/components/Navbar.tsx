"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { MobileDrawer, MobileDrawerBackdrop, mobileDrawerClasses, mobileDrawerEvents } from "@/components/MobileDrawer";
import { useLanguage } from "@/components/LanguageProvider";
import { createHeartParticles, SaveHeartBurst, saveFeedbackClasses, type HeartParticle } from "@/components/SaveHeartBurst";
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
  const dockHeartTimer = useRef<number | null>(null);
  const { t } = useLanguage();

  useEffect(() => {
    const query = new URLSearchParams(window.location.search).get("q") ?? "";
    setSearchQuery(query);
  }, [pathname]);

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
  }, [pathname]);

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
    window.addEventListener(mobileDrawerEvents.dashboardClose, closeDashboardDrawer);
    return () => {
      window.removeEventListener("mobile-category-menu-request", closeDashboardDrawer);
      window.removeEventListener(mobileDrawerEvents.dashboardClose, closeDashboardDrawer);
    };
  }, []);

  useEffect(() => {
    const isMobileMenuOpen = isDashboardMenuOpen && window.matchMedia("(max-width: 767.98px)").matches;
    const isDashboardDrawerOpen = isMobileMenuOpen && Boolean(userEmail);
    const isGuestMenuOpen = isMobileMenuOpen && !userEmail;

    document.body.classList.toggle("has-mobile-dashboard-drawer", isDashboardDrawerOpen);
    document.body.classList.toggle("has-open-mobile-drawer", isGuestMenuOpen);
    window.dispatchEvent(new CustomEvent(mobileDrawerEvents.dashboardState, { detail: isDashboardDrawerOpen }));

    return () => {
      document.body.classList.remove("has-mobile-dashboard-drawer");
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
  const unreadBadge = unreadMessageCount > 99 ? "99+" : String(unreadMessageCount);
  const notificationBadge = unreadNotificationCount > 99 ? "99+" : String(unreadNotificationCount);

  const handleMobileProfileClick = () => {
    setIsOpen(false);
    setIsDashboardMenuOpen((current) => !current);
  };

  const handleMobileSignOut = async () => {
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
    { id: "share", label: "Share listing", icon: "share", onClick: () => triggerListingDockAction("share") },
    listingDockConfig.isOwner
      ? { id: "delete", label: "Delete listing", icon: "delete", onClick: () => triggerListingDockAction("delete") }
      : { id: "save", label: listingDockConfig.isSaved ? "Remove saved listing" : "Save listing", icon: "heart", solidIcon: listingDockConfig.isSaved, active: listingDockConfig.isSaved, pressed: listingDockConfig.isSaved, variant: "save", className: `${saveFeedbackClasses.root} ${isDockHeartPopping ? saveFeedbackClasses.popping : ""}`, onClick: () => triggerListingDockAction("save"), overlay: <SaveHeartBurst particles={dockHeartParticles} /> },
  ];

  function openMobileCategories() {
    setIsOpen(false);
    setIsDashboardMenuOpen(false);
    if (pathname !== "/market") {
      router.push("/market?filters=open");
      return;
    }
    window.dispatchEvent(new Event("mobile-category-menu-request"));
  }

  function openMobileDashboard() {
    setIsOpen(false);
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
          {isAuthReady && userEmail ? (
            <Link className="nav-profile-link" href={pathname.startsWith("/jobs") ? "/jobs/dashboard" : "/market/dashboard"} title={userEmail} aria-label="Open my dashboard">
              {avatarUrl ? <img src={avatarUrl} alt="Profile" /> : <span className="nav-avatar-initial" style={{ backgroundColor: avatarFallback.color }}>{avatarFallback.initial}</span>}
            </Link>
          ) : isAuthReady ? (
            <>
              <Link className="nav-signup" href="/login">Log in</Link>
            </>
          ) : null}
        </div>

        <button className={`mobile-menu-backdrop ${isOpen ? "is-open" : ""}`} type="button" aria-label="Close navigation menu" onClick={() => { setIsOpen(false); setIsDashboardMenuOpen(false); }} />

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
          <>
            <MobileDrawer open={isDashboardMenuOpen} onClose={() => setIsDashboardMenuOpen(false)} ariaLabel="Close dashboard menu" className="mobile-dashboard-backdrop" panelClassName="mobile-dashboard-menu" as="nav" id="mobile-dashboard-menu">
            <button className={`mobile-dashboard-close ${mobileDrawerClasses.closeButton} ${mobileDrawerClasses.staggerItem}`} type="button" aria-label="Close dashboard menu" onClick={() => setIsDashboardMenuOpen(false)}><i className="fa-solid fa-xmark" aria-hidden="true" /></button>
            {dashboardMenuItems.map(([icon, label, suffix]) => (
              <Link className={`${mobileDrawerClasses.menuItem} ${mobileDrawerClasses.staggerItem} ${pathname === (label === "Wishlist" && !isJobs ? "/market/wishlist" : `${dashboardBase}${suffix}`) ? "is-active" : ""}`} href={label === "Wishlist" && !isJobs ? "/market/wishlist" : `${dashboardBase}${suffix}`} key={label} onClick={() => setIsDashboardMenuOpen(false)}>
                <i className={`fa-solid ${icon}`} aria-hidden="true" />
                <span className={mobileDrawerClasses.menuLabel}>{label}{label === "Messages" && unreadMessageCount ? <b>{unreadBadge}</b> : label === "Notifications" && unreadNotificationCount ? <b>{notificationBadge}</b> : null}</span>
              </Link>
            ))}
            {isAdmin ? <Link className={`${mobileDrawerClasses.menuItem} ${mobileDrawerClasses.staggerItem} ${pathname.startsWith("/admin") ? "is-active" : ""}`} href="/admin" onClick={() => setIsDashboardMenuOpen(false)}><i className="fa-solid fa-shield-halved" aria-hidden="true" /><span className={mobileDrawerClasses.menuLabel}>Admin centre</span></Link> : null}
            <button className={`mobile-dashboard-logout ${mobileDrawerClasses.staggerItem}`} type="button" onClick={() => void handleMobileSignOut()}><i className="fa-solid fa-right-from-bracket" aria-hidden="true" /> Log out</button>
            </MobileDrawer>
          </>
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
      {!isMessagesPage ? <MobileDock items={listingDockItems ?? standardDockItems} /> : null}
    </>
  );
}
