"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { getAvatarFallback } from "@/lib/avatar-fallback";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

const authlessRoutes = new Set(["/login", "/signup"]);

export function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;

    const syncUser = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      setUserEmail(user?.email ?? null);
      setDisplayName(user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? null);
      if (!user) { setAvatarUrl(null); return; }
      const avatarPath = user.user_metadata?.avatar_path;
      if (avatarPath) {
        const { data: signed } = await supabase.storage.from("profile-avatars").createSignedUrl(avatarPath, 3600);
        setAvatarUrl(signed?.signedUrl ?? null);
      } else {
        setAvatarUrl(null);
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
      listener.subscription.unsubscribe();
      window.removeEventListener("profile-avatar-updated", updateAvatar);
    };
  }, []);

  useEffect(() => {
    const isAndroidMobile =
      /Android/i.test(navigator.userAgent) && window.matchMedia("(max-width: 767.98px)").matches;
    document.body.classList.toggle("is-android-mobile", isAndroidMobile);
    document.body.classList.toggle("post-ad-screen", pathname === "/post-ad");
    return () => {
      document.body.classList.remove("post-ad-screen");
    };
  }, [pathname]);

  if (authlessRoutes.has(pathname)) {
    return null;
  }

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  const isMarket = pathname.startsWith("/market");
  const isJobs = pathname.startsWith("/jobs");
  const isPostAd = pathname === "/post-ad";
  const avatarFallback = getAvatarFallback(displayName);

  return (
    <header className="site-header">
      <div className="site-nav">
        <Link className="site-logo" href="/" aria-label="Tada home">
          <img src="/images/logo.png" alt="Tada" />
        </Link>

        <form className="nav-search" action="#" role="search" onSubmit={submitSearch}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path d="m16 16 4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input type="search" placeholder="Search for items..." />
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

        {userEmail && (
          <Link className="mobile-profile-link" href={pathname.startsWith("/jobs") ? "/jobs/dashboard" : "/market/dashboard"} aria-label="Open my dashboard" title={userEmail}>
            {avatarUrl ? <img src={avatarUrl} alt="Profile" /> : <span className="nav-avatar-initial" style={{ backgroundColor: avatarFallback.color }}>{avatarFallback.initial}</span>}
          </Link>
        )}

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
          <Link className="nav-post" href="/post-ad" aria-current={isPostAd ? "page" : undefined}>
            <i className="fa-solid fa-plus" aria-hidden="true" />
            <span>Create</span>
          </Link>
          <button className="nav-notifications" type="button" aria-label="5 unread notifications">
            <i className="fa-regular fa-bell" aria-hidden="true" />
            <span>5</span>
          </button>
          {userEmail ? (
            <Link className="nav-profile-link" href={pathname.startsWith("/jobs") ? "/jobs/dashboard" : "/market/dashboard"} title={userEmail} aria-label="Open my dashboard">
              {avatarUrl ? <img src={avatarUrl} alt="Profile" /> : <span className="nav-avatar-initial" style={{ backgroundColor: avatarFallback.color }}>{avatarFallback.initial}</span>}
            </Link>
          ) : (
            <>
              <Link className="nav-signup" href="/login">Log in</Link>
            </>
          )}
        </div>

        <button className={`mobile-menu-backdrop ${isOpen ? "is-open" : ""}`} type="button" aria-label="Close navigation menu" onClick={() => setIsOpen(false)} />

        <nav className={`mobile-nav-menu ${isOpen ? "is-open" : ""}`} id="mobile-nav-menu" aria-label="Mobile navigation">
          <Link className={isMarket ? "is-active" : ""} href="/market" onClick={() => setIsOpen(false)}>
            <i className="fa-solid fa-store" aria-hidden="true" />
            Market
          </Link>
          <Link className={isJobs ? "is-active" : ""} href="/jobs" onClick={() => setIsOpen(false)}>
            <i className="fa-solid fa-briefcase" aria-hidden="true" />
            Jobs
          </Link>
          {userEmail ? (
            <Link href={pathname.startsWith("/jobs") ? "/jobs/dashboard" : "/market/dashboard"} onClick={() => setIsOpen(false)}>
              <i className="fa-solid fa-user" aria-hidden="true" />
              Account
            </Link>
          ) : (
            <>
              <Link href="/login" onClick={() => setIsOpen(false)}>
                <i className="fa-solid fa-right-to-bracket" aria-hidden="true" />
                Log in
              </Link>
              <Link href="/signup" onClick={() => setIsOpen(false)}>
                <i className="fa-solid fa-user-plus" aria-hidden="true" />
                Sign up
              </Link>
            </>
          )}
          <Link className={isPostAd ? "is-active" : ""} href="/post-ad" onClick={() => setIsOpen(false)}>
            <i className="fa-solid fa-plus" aria-hidden="true" />
            Create
          </Link>
        </nav>
      </div>
    </header>
  );
}
