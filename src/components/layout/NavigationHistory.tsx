"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";

const myPageHref = "/market/dashboard/my-page";
let visitedPaths: string[] = [];
let currentIndex = -1;
let popNavigation = false;

/** Remember same-tab app routes without modifying Next's browser history state. */
export function NavigationHistoryTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const markPopNavigation = () => { popNavigation = true; };
    window.addEventListener("popstate", markPopNavigation);
    return () => window.removeEventListener("popstate", markPopNavigation);
  }, []);

  useEffect(() => {
    if (currentIndex < 0) {
      visitedPaths = [pathname];
      currentIndex = 0;
    } else if (visitedPaths[currentIndex] !== pathname) {
      if (popNavigation) {
        if (visitedPaths[currentIndex - 1] === pathname) currentIndex -= 1;
        else if (visitedPaths[currentIndex + 1] === pathname) currentIndex += 1;
        else {
          visitedPaths = [pathname];
          currentIndex = 0;
        }
      } else {
        visitedPaths = [...visitedPaths.slice(0, currentIndex + 1), pathname];
        currentIndex += 1;
      }
    }
    popNavigation = false;
  }, [pathname]);

  return null;
}

/** Desktop has a stable My Page link; mobile returns to the real previous route. */
export function BackToMyPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { locale } = useLanguage();
  const label = locale === "ko" ? "마이페이지" : "My Page";

  const goBack = () => {
    let sameOriginReferrer = false;
    try {
      sameOriginReferrer = Boolean(document.referrer && new URL(document.referrer).origin === window.location.origin && new URL(document.referrer).pathname !== pathname);
    } catch { /* An invalid or absent referrer is a direct visit. */ }
    if (currentIndex > 0 || (window.history.length > 1 && sameOriginReferrer)) router.back();
    else router.push(myPageHref);
  };

  return <>
    <Link className="account-return-link account-return-link-desktop" href={myPageHref}><i className="ms ms-arrow-back" aria-hidden="true" />{label}</Link>
    <button className="account-return-link account-return-link-mobile" type="button" onClick={goBack} aria-label={locale === "ko" ? "이전 화면으로 돌아가기" : "Go back to the previous page"}><i className="ms ms-arrow-back" aria-hidden="true" /></button>
  </>;
}
