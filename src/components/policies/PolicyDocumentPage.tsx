"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import { PageContainer, PageInner } from "@/components/layout/PageContainer";
import { policyDocuments } from "@/lib/policies/content";
import { policyIds, type PolicyId } from "@/lib/policies/navigation";

/** Shared reading surface for the four draft documents; routes remain independent. */
export function PolicyDocumentPage({ policyId }: { policyId: PolicyId }) {
  const { locale } = useLanguage();
  const lang = locale === "ko" ? "ko" : "en";
  const policy = policyDocuments[policyId];
  const label = (value: { ko: string; en: string }) => value[lang];

  return <main className="policy-page">
    <PageContainer>
      <PageInner size="reading" className="policy-page-inner">
        <header className="policy-heading">
          <Link href="/market/dashboard/my-page" className="policy-back">← {lang === "ko" ? "마이페이지" : "My Page"}</Link>
          <h1>{label(policy.title)}</h1>
          <p>{lang === "ko" ? "Tada 정책 문서" : "Tada policy document"}</p>
        </header>
        <div className="ui-panel policy-draft" role="note">
          <strong>{lang === "ko" ? "초안 · 아직 시행되지 않았습니다" : "Draft · not yet in effect"}</strong>
          <p>{lang === "ko" ? "운영 정보, 실제 서비스 기능 및 법률 검토를 마친 뒤 확정될 문서입니다. 빈칸은 아직 정해지지 않았습니다." : "This document is subject to confirmation of operator details, actual service features and legal review. Placeholders have not yet been determined."}</p>
        </div>
        {policy.metadata?.length ? <div className="policy-metadata">{policy.metadata.map((item, index) => <p key={index}>{label(item)}</p>)}</div> : <p className="policy-effective">{lang === "ko" ? "시행일: [게시일 입력]" : "Effective date: [publication date]"}</p>}
        <details className="ui-panel policy-contents">
          <summary>{lang === "ko" ? "목차 보기" : "Contents"}</summary>
          <nav aria-label={lang === "ko" ? "문서 목차" : "Document contents"}>
            <ol>{policy.sections.map((item, index) => <li key={index}><a href={`#section-${index + 1}`}>{label(item.title)}</a></li>)}</ol>
          </nav>
        </details>
        <article className="ui-panel policy-document">
          {policy.introduction?.map((paragraph, index) => <p key={index}>{label(paragraph)}</p>)}
          {policy.sections.map((item, index) => {
            const beforeBullets = item.bullets ? (policyId === "privacy" ? 1 : 2) : item.paragraphs.length;
            return <section id={`section-${index + 1}`} key={index}>
              <h2>{index + 1}. {label(item.title)}</h2>
              {item.paragraphs.slice(0, beforeBullets).map((paragraph, i) => <p key={i}>{label(paragraph)}</p>)}
              {item.bullets ? <ul>{item.bullets.map((bullet, i) => <li key={i}>{label(bullet)}</li>)}</ul> : null}
              {item.paragraphs.slice(beforeBullets).map((paragraph, i) => <p key={`after-${i}`}>{label(paragraph)}</p>)}
            </section>;
          })}
        </article>
        <nav className="policy-related" aria-label={lang === "ko" ? "다른 정책 문서" : "Other policy documents"}>
          <h2>{lang === "ko" ? "다른 정책 문서" : "Other policy documents"}</h2>
          <div>{policyIds.filter((id) => id !== policyId).map((id) => <Link className="ui-button ui-button--secondary ui-button--sm" href={policyDocuments[id].href} key={id}>{label(policyDocuments[id].title)} <span aria-hidden="true">→</span></Link>)}</div>
        </nav>
      </PageInner>
    </PageContainer>
  </main>;
}
