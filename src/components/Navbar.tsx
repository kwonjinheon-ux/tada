"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

const authlessRoutes = new Set(["/login", "/signup"]);

export function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

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

  const isMarket = pathname === "/market";
  const isPostAd = pathname === "/post-ad";

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

        <nav className="primary-nav" aria-label="Main navigation">
          <Link className={isMarket ? "is-active" : ""} href="/market">
            <i className="fa-solid fa-store" aria-hidden="true" />
            <span>Market</span>
          </Link>
          <Link href="/jobs">
            <i className="fa-solid fa-briefcase" aria-hidden="true" />
            <span>Jobs</span>
          </Link>
        </nav>

        <div className="nav-actions">
          <Link className="nav-signup" href="/login">
            Sign-in
          </Link>
          <Link className="nav-post" href="/post-ad" aria-current={isPostAd ? "page" : undefined}>
            Post Ad
          </Link>
        </div>

        <nav className={`mobile-nav-menu ${isOpen ? "is-open" : ""}`} id="mobile-nav-menu" aria-label="Mobile navigation">
          <Link className={isMarket ? "is-active" : ""} href="/market" onClick={() => setIsOpen(false)}>
            <i className="fa-solid fa-store" aria-hidden="true" />
            Market
          </Link>
          <Link href="/jobs" onClick={() => setIsOpen(false)}>
            <i className="fa-solid fa-briefcase" aria-hidden="true" />
            Jobs
          </Link>
          <Link href="/login" onClick={() => setIsOpen(false)}>
            <i className="fa-solid fa-right-to-bracket" aria-hidden="true" />
            Sign-in
          </Link>
          <Link className={isPostAd ? "is-active" : ""} href="/post-ad" onClick={() => setIsOpen(false)}>
            <i className="fa-solid fa-circle-plus" aria-hidden="true" />
            Post Ad
          </Link>
        </nav>
      </div>
    </header>
  );
}

