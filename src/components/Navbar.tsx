"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { MobileDrawer, mobileDrawerClasses, mobileDrawerEvents } from "@/components/MobileDrawer";
import { getAvatarFallback } from "@/lib/avatar-fallback";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

const authlessRoutes = new Set(["/login", "/signup"]);
const dashboardMenuItems = [
  ["fa-border-all", "Dashboard", ""],
  ["fa-circle-user", "Profile Settings", "/profile"],
  ["fa-message", "Messages", "/messages"],
  ["fa-heart", "Wishlist", "/wishlist"],
  ["fa-key", "Keywords", "/keywords"],
  ["fa-rectangle-list", "Manage Listings", "/listings"],
] as const;

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isDashboardMenuOpen, setIsDashboardMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const query = new URLSearchParams(window.location.search).get("q") ?? "";
    setSearchQuery(query);
  }, [pathname]);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) { setIsAuthReady(true); return; }
    let isMounted = true;

    const syncUser = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const user = data.user;
        if (!isMounted) return;
        setUserEmail(user?.email ?? null);
        setDisplayName(user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? null);
        if (!user) { setAvatarUrl(null); setUnreadMessageCount(0); return; }
        const { count } = await supabase
          .from("market_messages")
          .select("id", { count: "exact", head: true })
          .eq("recipient_id", user.id)
          .is("read_at", null);
        if (isMounted) setUnreadMessageCount(count ?? 0);
        const avatarPath = user.user_metadata?.avatar_path;
        if (avatarPath) {
          const { data: signed } = await supabase.storage.from("profile-avatars").createSignedUrl(avatarPath, 3600);
          if (isMounted) setAvatarUrl(signed?.signedUrl ?? null);
        } else {
          setAvatarUrl(null);
        }
      } finally {
        if (isMounted) setIsAuthReady(true);
      }
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
    const isAndroidMobile =
      /Android/i.test(navigator.userAgent) && window.matchMedia("(max-width: 767.98px)").matches;
    document.body.classList.toggle("is-android-mobile", isAndroidMobile);
    document.body.classList.toggle("post-ad-screen", pathname.startsWith("/market/create"));
    return () => {
      document.body.classList.remove("post-ad-screen");
    };
  }, [pathname]);

  useEffect(() => {
    setIsOpen(false);
    setIsDashboardMenuOpen(false);
  }, [pathname]);

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
    const isMobileDrawerOpen = isDashboardMenuOpen && Boolean(userEmail) && window.matchMedia("(max-width: 767.98px)").matches;
    document.body.classList.toggle("has-mobile-dashboard-drawer", isMobileDrawerOpen);
    window.dispatchEvent(new CustomEvent(mobileDrawerEvents.dashboardState, { detail: isMobileDrawerOpen }));
    return () => document.body.classList.remove("has-mobile-dashboard-drawer");
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
  const isPostAd = pathname.startsWith("/market/create");
  const isMessagesPage = pathname.startsWith("/market/dashboard/messages");
  const dashboardBase = `/${isJobs ? "jobs" : "market"}/dashboard`;
  const avatarFallback = getAvatarFallback(displayName);
  const isSignedIn = Boolean(userEmail);
  const unreadBadge = unreadMessageCount > 99 ? "99+" : String(unreadMessageCount);

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
    setDisplayName(null);
    setAvatarUrl(null);
    setIsDashboardMenuOpen(false);
  };

  const openMobileCategories = () => {
    setIsOpen(false);
    setIsDashboardMenuOpen(false);
    window.dispatchEvent(new Event("mobile-category-menu-request"));
  };

  const openMobileDashboard = () => {
    setIsOpen(false);
    window.dispatchEvent(new Event("mobile-category-menu-close"));
    setIsDashboardMenuOpen(true);
  };

  return (
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
          <input value={searchQuery} onChange={(event) => updateSearchQuery(event.target.value)} type="search" placeholder="Search for items..." />
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
        <button className="mobile-notifications nav-notifications" type="button" aria-label={`${unreadMessageCount} unread messages`}>
          <i className="fa-regular fa-bell" aria-hidden="true" />
          {unreadMessageCount ? <span>{unreadBadge}</span> : null}
        </button>

        <nav className="primary-nav" aria-label="Main navigation">
          <Link className={isMarket ? "is-active" : ""} href="/market">
            <i className="fa-solid fa-store" aria-hidden="true" />
            <span>Market</span>
          </Link>
          <Link className={isJobs ? "is-active" : ""} href="/jobs">
            <i className="fa-solid fa-briefcase" aria-hidden="true" />
            <span>Jobs</span>
          </Link>
        </nav>

        <div className="nav-actions">
          <Link className="nav-post" href="/market/create" aria-current={isPostAd ? "page" : undefined}>
            <i className="fa-solid fa-plus" aria-hidden="true" />
            <span>Create</span>
          </Link>
          <button className="nav-notifications" type="button" aria-label={`${unreadMessageCount} unread messages`}>
            <i className="fa-regular fa-bell" aria-hidden="true" />
            {unreadMessageCount ? <span>{unreadBadge}</span> : null}
          </button>
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
                <span className={mobileDrawerClasses.menuLabel}>{label}{label === "Messages" && unreadMessageCount ? <b>{unreadBadge}</b> : null}</span>
              </Link>
            ))}
            <button className={`mobile-dashboard-logout ${mobileDrawerClasses.staggerItem}`} type="button" onClick={() => void handleMobileSignOut()}><i className="fa-solid fa-right-from-bracket" aria-hidden="true" /> Log out</button>
            </MobileDrawer>
          </>
        )}
        {isAuthReady && !userEmail && (
          <nav className={`mobile-auth-menu ${isDashboardMenuOpen ? "is-open" : ""}`} id="mobile-account-menu" aria-label="Account menu">
            <p>Account</p>
            <Link href="/login" onClick={() => setIsDashboardMenuOpen(false)}><i className="fa-solid fa-right-to-bracket" aria-hidden="true" /> Log in</Link>
            <Link href="/signup" onClick={() => setIsDashboardMenuOpen(false)}><i className="fa-solid fa-user-plus" aria-hidden="true" /> Sign up</Link>
          </nav>
        )}

        <nav className="mobile-bottom-dock" aria-label="Quick actions">
          <Link className={isMarket ? "is-active" : ""} href="/market" aria-label="Market home"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3.5 10.5 8.5-7 8.5 7v9.25a1.75 1.75 0 0 1-1.75 1.75H5.25a1.75 1.75 0 0 1-1.75-1.75z" /><path d="M9.25 21.5v-6.25h5.5v6.25" /></svg></Link>
          <Link href={`${dashboardBase}/messages`} aria-label="Messages"><i className="fa-regular fa-comment" aria-hidden="true" /></Link>
          <Link className={`mobile-dock-create ${isPostAd ? "is-active" : ""}`} href="/market/create" aria-label="Create post"><i className="fa-solid fa-plus" aria-hidden="true" /></Link>
          <button type="button" aria-label="Browse categories" onClick={openMobileCategories}><i className="fa-regular fa-rectangle-list" aria-hidden="true" /></button>
          <button type="button" aria-label="Open dashboard" aria-expanded={isDashboardMenuOpen} aria-controls="mobile-dashboard-menu" onClick={openMobileDashboard}><i className="fa-regular fa-circle-user" aria-hidden="true" /></button>
        </nav>
      </div>
    </header>
  );
}
