"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";

type FooterGroup = {
  title: string;
  icon: string;
  links: Array<{ label: string; href: string }>;
};

export function Footer() {
  const { locale } = useLanguage();
  const isKorean = locale === "ko";
  const groups: FooterGroup[] = isKorean ? [
    { title: "둘러보기", icon: "fa-regular fa-compass", links: [{ label: "마켓", href: "/market" }, { label: "커뮤니티", href: "/community" }, { label: "생활도움", href: "/services" }, { label: "일자리 (준비중)", href: "/jobs" }] },
    { title: "도움말", icon: "fa-regular fa-circle-question", links: [{ label: "자주 묻는 질문", href: "/help" }, { label: "이용 가이드", href: "/help" }, { label: "문의하기", href: "/contact" }] },
    { title: "정책", icon: "fa-regular fa-shield", links: [{ label: "이용약관", href: "/terms" }, { label: "개인정보 처리방침", href: "/privacy" }, { label: "커뮤니티 가이드", href: "/community" }] },
  ] : [
    { title: "Explore", icon: "fa-regular fa-compass", links: [{ label: "Market", href: "/market" }, { label: "Community", href: "/community" }, { label: "Local services", href: "/services" }, { label: "Jobs (coming soon)", href: "/jobs" }] },
    { title: "Help", icon: "fa-regular fa-circle-question", links: [{ label: "Frequently asked questions", href: "/help" }, { label: "Getting started", href: "/help" }, { label: "Contact us", href: "/contact" }] },
    { title: "Policies", icon: "fa-regular fa-shield", links: [{ label: "Terms of use", href: "/terms" }, { label: "Privacy policy", href: "/privacy" }, { label: "Community guidelines", href: "/community" }] },
  ];

  return (
    <footer className="site-footer">
      <div className="site-footer-content global-shell">
        <section className="footer-brand" aria-label="Tada">
          <img src="/images/logo.png" alt="Tada" />
          <p>{isKorean ? <><strong>필요한 순간, 타다.</strong><br />사고팔고, 나누고, 연결하고 — 일상을 타다.</> : "Connect, Ta-da."}</p>
          <nav className="footer-socials" aria-label={isKorean ? "소셜 미디어" : "Social media"}>
            <a href="#" aria-label="Facebook"><i className="fa-brands fa-facebook-f" aria-hidden="true" /></a>
            <a href="#" aria-label="Instagram"><i className="fa-brands fa-instagram" aria-hidden="true" /></a>
            <a href="#" aria-label="Tada blog"><i className="fa-solid fa-comment-dots" aria-hidden="true" /></a>
          </nav>
        </section>

        <div className="footer-link-groups footer-link-groups-desktop">
          {groups.map((group) => (
            <section className="footer-link-group" key={group.title}>
              <h2 className="footer-link-group-heading">{group.title}</h2>
              <div>{group.links.map((link) => <Link href={link.href} key={link.label}>{link.label}</Link>)}</div>
            </section>
          ))}
        </div>

        <div className="footer-link-groups footer-link-groups-mobile">
          {groups.map((group) => (
            <details className="footer-link-group" key={group.title}>
              <summary><i className={group.icon} aria-hidden="true" /><span>{group.title}</span><i className="fa-solid fa-chevron-down" aria-hidden="true" /></summary>
              <div>{group.links.map((link) => <Link href={link.href} key={link.label}>{link.label}</Link>)}</div>
            </details>
          ))}
        </div>

        <aside className="footer-trust">
          <i className="fa-regular fa-shield-check" aria-hidden="true" />
          <div>
            <strong>{isKorean ? "안전한 거래를 위한 약속" : "A safer way to trade"}</strong>
            <p>{isKorean ? "Tada는 안전하고 신뢰할 수 있는 거래 환경을 만들기 위해 노력합니다." : "We’re building a safer, more trusted place for local trade."}</p>
            <Link href="/help">{isKorean ? "자세히 보기" : "Learn more"} <i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link>
          </div>
        </aside>

        <div className="footer-bottom"><span>© 2026 Tada Ltd. All rights reserved.</span></div>
      </div>
    </footer>
  );
}
