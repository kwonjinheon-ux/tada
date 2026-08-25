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
    { title: "둘러보기", icon: "ms ms-explore", links: [{ label: "마켓", href: "/market" }, { label: "커뮤니티", href: "/community" }, { label: "생활도움", href: "/services" }, { label: "일자리 (준비중)", href: "/jobs" }] },
    { title: "도움말", icon: "ms ms-help", links: [{ label: "자주 묻는 질문", href: "/help" }, { label: "이용 가이드", href: "/help" }, { label: "문의하기", href: "/contact" }] },
    { title: "정책", icon: "ms ms-shield", links: [{ label: "이용약관", href: "/terms" }, { label: "개인정보 처리방침", href: "/privacy" }, { label: "커뮤니티 가이드", href: "/community" }] },
  ] : [
    { title: "Explore", icon: "ms ms-explore", links: [{ label: "Market", href: "/market" }, { label: "Community", href: "/community" }, { label: "Local services", href: "/services" }, { label: "Jobs (coming soon)", href: "/jobs" }] },
    { title: "Help", icon: "ms ms-help", links: [{ label: "Frequently asked questions", href: "/help" }, { label: "Getting started", href: "/help" }, { label: "Contact us", href: "/contact" }] },
    { title: "Policies", icon: "ms ms-shield", links: [{ label: "Terms of use", href: "/terms" }, { label: "Privacy policy", href: "/privacy" }, { label: "Community guidelines", href: "/community" }] },
  ];

  return (
    <footer className="site-footer">
      <div className="site-footer-content global-shell">
        <section className="footer-brand" aria-label="Tada">
          <img src="/images/logo.png" alt="Tada" />
          <p>{isKorean ? <><strong>필요한 순간, 타다.</strong><br />사고팔고, 나누고, 연결하고 — 일상을 타다.</> : "Connect, Ta-da."}</p>
          <nav className="footer-socials" aria-label={isKorean ? "소셜 미디어" : "Social media"}>
            <a href="#" aria-label="Facebook"><svg className="footer-social-mark" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.52 1.49-3.91 3.77-3.91 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.45 2.91h-2.33V22c4.78-.76 8.44-4.92 8.44-9.94Z" /></svg></a>
            <a href="#" aria-label="Instagram"><svg className="footer-social-mark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" /></svg></a>
            <a href="#" aria-label="Tada blog"><i className="ms ms-sms" aria-hidden="true" /></a>
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
              <summary><i className={group.icon} aria-hidden="true" /><span>{group.title}</span><i className="ms ms-expand-more" aria-hidden="true" /></summary>
              <div>{group.links.map((link) => <Link href={link.href} key={link.label}>{link.label}</Link>)}</div>
            </details>
          ))}
        </div>

        <aside className="footer-trust">
          <i className="ms ms-verified-user" aria-hidden="true" />
          <div>
            <strong>{isKorean ? "안전한 거래를 위한 약속" : "A safer way to trade"}</strong>
            <p>{isKorean ? "Tada는 안전하고 신뢰할 수 있는 거래 환경을 만들기 위해 노력합니다." : "We’re building a safer, more trusted place for local trade."}</p>
            <Link href="/help">{isKorean ? "자세히 보기" : "Learn more"} <i className="ms ms-arrow-forward" aria-hidden="true" /></Link>
          </div>
        </aside>

        <div className="footer-bottom"><span>© 2026 Tada Ltd. All rights reserved.</span></div>
      </div>
    </footer>
  );
}
