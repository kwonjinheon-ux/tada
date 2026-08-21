"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { serviceCategories, servicesCategoryLabels, type ServiceCategoryId } from "@/data/services";

export function ServiceCreateClient() {
  const { locale } = useLanguage();
  const isKorean = locale === "ko";
  const categoryLabels = servicesCategoryLabels(locale);
  const [category, setCategory] = useState<ServiceCategoryId | "">("");
  const [notice, setNotice] = useState("");

  const copy = isKorean ? {
    back: "서비스로 돌아가기", title: "내 서비스를 등록하세요", description: "지역 고객이 신뢰할 수 있는 서비스 정보를 알려주세요.", category: "서비스 종류", details: "서비스 정보", name: "업체 또는 서비스명", namePlaceholder: "예: Hamilton Handy Helpers", descriptionLabel: "서비스 소개", descriptionPlaceholder: "제공하는 서비스와 주요 경력을 간단히 적어주세요.", contact: "연락 및 서비스 지역", contactLabel: "연락 이메일", areaLabel: "주요 서비스 지역", areaPlaceholder: "예: Hamilton Central", publish: "서비스 등록 신청", note: "등록된 서비스는 검토 후 공개됩니다.", hintTitle: "좋은 서비스 등록 팁", hintOne: "어떤 도움을 제공하는지 구체적으로 알려주세요.", hintTwo: "활동 지역을 적으면 가까운 고객이 더 쉽게 찾을 수 있어요.", hintThree: "정확한 연락처와 소개는 신뢰를 높여줍니다.", sent: "서비스 등록 신청이 준비되었습니다. 정식 등록 기능은 곧 제공됩니다.",
  } : {
    back: "Back to services", title: "List your service", description: "Tell local customers about the help you offer.", category: "Service category", details: "Service details", name: "Business or service name", namePlaceholder: "e.g. Hamilton Handy Helpers", descriptionLabel: "About your service", descriptionPlaceholder: "Tell customers what you offer and a little about your experience.", contact: "Contact and service area", contactLabel: "Contact email", areaLabel: "Main service area", areaPlaceholder: "e.g. Hamilton Central", publish: "Submit service listing", note: "Service listings are reviewed before they go live.", hintTitle: "Tips for a great listing", hintOne: "Be clear about the help you can provide.", hintTwo: "Add your service area so nearby customers can find you.", hintThree: "An accurate introduction and contact details build trust.", sent: "Your service listing is ready to submit. Full service registration is coming soon.",
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(copy.sent);
  };

  return <main className="post-ad-page service-create-page">
    <div className="post-ad-create-bar"><Link href="/services"><i className="fa-solid fa-arrow-left" aria-hidden="true" /> {copy.back}</Link></div>
    <div className="post-ad-layout">
      <section className="post-ad-card">
        <header className="post-ad-intro"><h1>{copy.title}</h1><p>{copy.description}</p></header>
        <form className="post-ad-form" onSubmit={submit}>
          <section className="post-title-field">
            <div className="post-section-heading"><span>1</span><h2>{copy.category}</h2></div>
            <div className="post-shop-type-options" role="group" aria-label={copy.category}>
              {serviceCategories.map(({ id, icon }) => <button className={category === id ? "is-selected" : ""} key={id} type="button" onClick={() => setCategory(id)}><i className={`fa-solid ${icon}`} aria-hidden="true" />{categoryLabels[id]}</button>)}
            </div>
          </section>
          <section className="post-description-field">
            <div className="post-section-heading"><span>2</span><h2>{copy.details}</h2></div>
            <div className="post-field"><label htmlFor="service-name">{copy.name}</label><input id="service-name" required minLength={2} maxLength={100} placeholder={copy.namePlaceholder} /></div>
            <div className="post-field"><label htmlFor="service-description">{copy.descriptionLabel}</label><textarea id="service-description" required minLength={20} maxLength={2000} placeholder={copy.descriptionPlaceholder} /></div>
          </section>
          <section className="post-location-grid service-create-contact">
            <div className="post-section-heading"><span>3</span><h2>{copy.contact}</h2></div>
            <div className="post-field"><label htmlFor="service-email">{copy.contactLabel}</label><input id="service-email" type="email" required placeholder="you@example.co.nz" /></div>
            <div className="post-field"><label htmlFor="service-area">{copy.areaLabel}</label><input id="service-area" required placeholder={copy.areaPlaceholder} /></div>
          </section>
          {notice ? <p className="post-create-status" role="status">{notice}</p> : null}
          <div className="post-submit-row"><p>{copy.note}</p><button className="post-submit-button" type="submit" disabled={!category}><span>{copy.publish}</span></button></div>
        </form>
      </section>
      <aside className="post-ad-sidebar service-create-sidebar">
        <section className="post-ad-tips"><h2>{copy.hintTitle}</h2><article><i className="fa-solid fa-list-check" aria-hidden="true" /><p>{copy.hintOne}</p></article><article><i className="fa-solid fa-location-dot" aria-hidden="true" /><p>{copy.hintTwo}</p></article><article><i className="fa-solid fa-shield-halved" aria-hidden="true" /><p>{copy.hintThree}</p></article></section>
      </aside>
    </div>
  </main>;
}
