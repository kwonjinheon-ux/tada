"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { ServicesFilterSidebar, type ServiceFilterState } from "@/components/services/ServicesFilterSidebar";
import { PageContainer } from "@/components/layout/PageContainer";
import { serviceCategories, servicesCategoryLabels, type ServiceCategoryId } from "@/data/services";
import { NZ_MAIN_LOCATIONS, getSubLocations, type MainLocation } from "@/data/nzLocations";
import { isAcceptedMarketListingImage, normalizeMarketListingImage } from "@/lib/media/market-listing-image";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type PhotoPreview = { id: string; file: File; url: string };

function submissionErrorMessage(error: unknown, isKorean: boolean) {
  const details = typeof error === "object" && error ? error as { code?: string; message?: string } : undefined;
  if (details?.code === "23503") return isKorean ? "서비스 등록 전 프로필을 먼저 완료해 주세요." : "Complete your profile before submitting a service listing.";
  return details?.message || (isKorean ? "서비스 등록 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요." : "Something went wrong while submitting your service. Please try again.");
}

export function ServiceCreateClient() {
  const router = useRouter();
  const { locale } = useLanguage();
  const isKorean = locale === "ko";
  const categoryLabels = servicesCategoryLabels(locale);
  const [category, setCategory] = useState<ServiceCategoryId | "">("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [photos, setPhotos] = useState<PhotoPreview[]>([]);
  const [primaryPhotoId, setPrimaryPhotoId] = useState<string | null>(null);
  const [isDraggingPhotos, setIsDraggingPhotos] = useState(false);
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sidebarFilters, setSidebarFilters] = useState<ServiceFilterState>({ providerType: "all", availability: "all", verified: false, highlyRated: false, fastResponder: false });
  const [serviceArea, setServiceArea] = useState("Hamilton");
  const [suburb, setSuburb] = useState("");
  const allAreasValue = "__all_nz__";
  const photosRef = useRef<PhotoPreview[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const availableSuburbs = serviceArea === allAreasValue
    ? [...new Set(NZ_MAIN_LOCATIONS.flatMap((location) => getSubLocations(location)))]
    : NZ_MAIN_LOCATIONS.includes(serviceArea as (typeof NZ_MAIN_LOCATIONS)[number])
      ? getSubLocations(serviceArea as (typeof NZ_MAIN_LOCATIONS)[number])
      : [];

  useEffect(() => { photosRef.current = photos; }, [photos]);
  useEffect(() => () => { photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.url)); }, []);

  const addPhotos = (files: FileList | null) => {
    const accepted = Array.from(files ?? []).filter(isAcceptedMarketListingImage);
    if (!accepted.length) return;
    const availableSlots = Math.max(0, 5 - photos.length);
    const next = accepted.slice(0, availableSlots).map((file) => ({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file) }));
    if (!next.length) return;
    setPhotos((current) => [...current, ...next]);
    setPrimaryPhotoId((current) => current ?? next[0].id);
  };

  const removePhoto = (photoId: string) => {
    setPhotos((current) => {
      const removed = current.find((photo) => photo.id === photoId);
      if (removed) URL.revokeObjectURL(removed.url);
      const next = current.filter((photo) => photo.id !== photoId);
      setPrimaryPhotoId((currentPrimary) => currentPrimary === photoId ? next[0]?.id ?? null : currentPrimary);
      return next;
    });
  };

  const copy = isKorean ? {
    back: "서비스로 돌아가기", title: "내 서비스를 등록하세요", description: "지역 고객에게 내가 제공하는 서비스를 알려주세요.", information: [["fa-regular fa-credit-card", "Tada에서 결제하지 않아요", "고객과 직접 거래합니다."], ["fa-regular fa-shield-check", "등록 내용을 검토합니다", "안전성과 품질을 확인합니다."], ["fa-solid fa-certificate", "인증은 프로필에서 진행돼요", "서비스 등록만으로 자동 인증되지 않습니다."]], category: "서비스 종류", details: "서비스 정보", name: "업체 또는 서비스명", namePlaceholder: "예: Hamilton Handy Helpers", descriptionLabel: "서비스 소개", descriptionPlaceholder: "제공하는 서비스와 주요 경력을 간단히 적어주세요.", photos: "사진 추가", photoHint: "작업 사진이나 로고를 최대 5장까지 추가할 수 있어요.", contact: "연락 및 서비스 지역", serviceArea: "서비스 지역", suburb: "세부 지역 (선택)", providerType: "제공자 유형", localBusiness: "지역 업체", soleTrader: "개인 사업자", phone: "연락처", email: "이메일 (선택)", website: "웹사이트 또는 소셜 링크 (선택)", trustTitle: "Trust & Safety requirements", trustDescription: "모두에게 안전하고 신뢰할 수 있는 Tada를 함께 만들어주세요.", trust: [["fa-regular fa-briefcase", "실제 업체 또는 서비스만 등록", "제공하는 실제 서비스만 등록할 수 있습니다."], ["fa-regular fa-address-card", "정확한 연락처 입력", "고객이 신뢰할 수 있는 방법으로 연락할 수 있어야 합니다."], ["fa-regular fa-shield", "금지되거나 안전하지 않은 서비스 불가", "불법, 위험 또는 오해의 소지가 있는 서비스는 허용되지 않습니다."], ["fa-regular fa-clipboard-check", "모든 등록은 공개 전 검토", "커뮤니티를 보호하기 위해 등록 내용을 확인합니다."]], trustAlert: "Tada 가이드라인을 충족하지 않는 등록은 거절되거나 삭제될 수 있습니다.", publish: "서비스 등록 신청", note: "등록된 서비스는 검토 후 공개됩니다.", terms: "Tada의 이용약관 및 커뮤니티 가이드라인에 동의합니다.", tipsTitle: "좋은 서비스 등록 팁", tips: ["어떤 도움을 제공하는지 구체적으로 알려주세요.", "활동 지역을 적으면 가까운 고객이 더 쉽게 찾을 수 있어요.", "정확한 연락처와 소개는 신뢰를 높여줍니다."], verifiedTitle: "Verified badge", verifiedIntro: "인증은 서비스 등록이 아닌 프로필에서 관리됩니다.", verifiedSteps: [["1", "등록 내용 작성", "서비스 정보를 입력하고 신청하세요."], ["2", "프로필 인증 완료", "ID, 업체 정보와 필요한 서류를 추가하세요."], ["3", "Tada 검토 후 배지 적용", "승인되면 등록에 Verified 배지가 표시됩니다."]], verificationAction: "프로필 인증으로 이동", verificationStatus: "상태: 인증을 시작하지 않았습니다", sent: "서비스 등록 신청이 준비되었습니다. 정식 등록 기능은 곧 제공됩니다.",
  } : {
    back: "Back to services", title: "List your service", description: "Tell local customers about the help you offer.", information: [["fa-solid fa-credit-card", "No payments on Tada", "You deal directly with customers."], ["fa-solid fa-shield-halved", "Listings are reviewed", "We check for safety and quality."], ["fa-solid fa-circle-check", "Verification is through your Profile", "It isn’t automatic when you list a service."]], category: "Service category", details: "Service details", name: "Business or service name", namePlaceholder: "e.g. Hamilton Handy Helpers", descriptionLabel: "About your service", descriptionPlaceholder: "Tell customers what you offer and a little about your experience.", photos: "Add photos", photoHint: "Add up to five photos of your work or logo.", contact: "Contact and service area", serviceArea: "Service area", suburb: "Suburb (optional)", providerType: "Provider type", localBusiness: "Local business", soleTrader: "Sole trader", phone: "Contact phone", email: "Email (optional)", website: "Website or social link (optional)", trustTitle: "Trust & safety requirements", trustDescription: "Help us keep Tada safe and trustworthy for everyone.", trust: [["fa-solid fa-briefcase", "Real business or genuine service only", "List active services you provide."], ["fa-solid fa-address-card", "Accurate contact details required", "Customers need reliable ways to reach you."], ["fa-solid fa-shield-halved", "No prohibited or unsafe services", "Illegal, unsafe, or misleading services are not allowed."], ["fa-solid fa-clipboard-check", "All listings reviewed before going live", "We review every listing to protect our community."]], trustAlert: "Listings that don’t meet Tada guidelines may be declined or removed.", publish: "Submit service listing", note: "Service listings are reviewed before they go live.", terms: "I agree to Tada’s Terms and Community Guidelines.", tipsTitle: "Tips for a great listing", tips: ["Be clear about the help you can provide.", "Add your service area so nearby customers can find you.", "An accurate introduction and contact details build trust."], verifiedTitle: "Verified badge", verifiedIntro: "Verification is managed through your Profile, not during listing.", verifiedSteps: [["1", "Create your listing", "Add your service details and submit."], ["2", "Complete Profile verification", "Add your ID, business information, and documents."], ["3", "Tada reviews and applies the badge", "Once approved, your listing can show as Verified."]], verificationAction: "Go to Profile verification", verificationStatus: "Status: Verification not started", sent: "Your service listing is ready to submit. Full service registration is coming soon.",
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (isSubmitting) return;
    if (!category) {
      setNotice(isKorean ? "서비스 종류를 선택해 주세요." : "Choose a service category to continue.");
      return;
    }
    if (!acceptedTerms) {
      setNotice(isKorean ? "이용약관 및 커뮤니티 가이드라인에 동의해 주세요." : "Agree to the Terms and Community Guidelines to continue.");
      return;
    }
    try {
      const supabase = createBrowserSupabaseClient();
      if (!supabase) { setNotice(isKorean ? "서비스 등록을 지금 사용할 수 없습니다." : "Service registration is unavailable right now."); return; }
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) { setNotice(isKorean ? "서비스를 등록하려면 로그인해 주세요." : "Please sign in to list your service."); return; }

      const formData = new FormData(form);
      const providerName = String(formData.get("service-name") ?? "").trim();
      const description = String(formData.get("service-description") ?? "").trim();
      const phone = String(formData.get("service-phone") ?? "").trim();
      const email = String(formData.get("service-email") ?? "").trim();
      const website = String(formData.get("service-website") ?? "").trim();
      if (!providerName || !description || !phone) {
        setNotice(isKorean ? "필수 정보를 모두 입력해 주세요." : "Complete all required fields to continue.");
        return;
      }

      setIsSubmitting(true);
      setNotice("");
      const { data: listing, error: listingError } = await supabase.from("service_listings").insert({
      owner_id: user.id,
      category_slug: category,
      provider_name: providerName,
      description,
      provider_type: formData.get("provider-type") === "sole-trader" ? "sole_trader" : "business",
      service_areas: serviceArea === allAreasValue ? ["All New Zealand"] : [serviceArea],
      suburbs: suburb ? [suburb] : [],
      phone,
      email: email || null,
      website: website || null,
      }).select("id").single();
      if (listingError || !listing) throw listingError ?? new Error(isKorean ? "서비스 등록에 실패했습니다." : "Unable to submit your service.");

      const orderedPhotos = [...photos].sort((left, right) => Number(right.id === primaryPhotoId) - Number(left.id === primaryPhotoId));
      const uploadErrors: string[] = [];
      for (const [index, source] of orderedPhotos.entries()) {
      try {
        const file = await normalizeMarketListingImage(source.file);
        const path = `${user.id}/${listing.id}/${crypto.randomUUID()}.webp`;
        const { error: uploadError } = await supabase.storage.from("service-listing-images").upload(path, file, { contentType: file.type, upsert: false });
        if (uploadError) throw uploadError;
        const { error: photoError } = await supabase.from("service_listing_photos").insert({ listing_id: listing.id, owner_id: user.id, storage_path: path, original_name: source.file.name, mime_type: file.type, size_bytes: file.size, display_order: index });
        if (photoError) throw photoError;
      } catch (error) {
        uploadErrors.push(error instanceof Error ? error.message : "upload failed");
      }
      }
      if (uploadErrors.length) { setNotice(isKorean ? "서비스 등록은 접수됐지만 일부 사진을 저장하지 못했습니다." : "Your service was submitted, but some photos could not be saved."); return; }
      router.push("/services?submitted=pending");
      router.refresh();
    } catch (error) {
      setNotice(submissionErrorMessage(error, isKorean));
    } finally {
      setIsSubmitting(false);
    }
  };

  return <main className="post-ad-page service-create-page">
    <PageContainer className="service-create-workspace">
      <aside className="service-create-filter-rail" aria-label={isKorean ? "서비스 등록 설정" : "Service listing settings"}><ServicesFilterSidebar activeCategory={category || "all"} onCategorySelect={(next) => setCategory(next === "all" ? "" : next)} mainLocation={serviceArea === allAreasValue ? "" : serviceArea as MainLocation} subLocation={suburb} onLocationChange={(nextMainLocation, nextSubLocation = "") => { setServiceArea(nextMainLocation || allAreasValue); setSuburb(nextSubLocation); }} filters={sidebarFilters} onFilterChange={(key, value) => setSidebarFilters((current) => ({ ...current, [key]: value }))} onApply={() => undefined} compact /></aside>
      <div className="service-create-main">
    <div className="post-ad-create-bar"><Link href="/services"><i className="fa-solid fa-arrow-left" aria-hidden="true" /> {copy.back}</Link></div>
    <div className="post-ad-layout">
      <section className="post-ad-card">
        <header className="post-ad-intro"><h1>{copy.title}</h1><p>{copy.description}</p></header>
        <section className="service-create-information" aria-label="Service listing information">{copy.information.map(([, title, body], index) => <article key={title}><i className={["fa-solid fa-credit-card", "fa-solid fa-shield-halved", "fa-solid fa-circle-check"][index]} aria-hidden="true" /><div><strong>{title}</strong><span>{body}</span></div></article>)}</section>
        <form className="post-ad-form" onSubmit={submit} onInvalidCapture={() => setNotice(isKorean ? "필수 정보를 모두 입력해 주세요." : "Complete all required fields to continue.")}>
          <section className="post-title-field"><div className="post-section-heading"><span>1</span><h2>{copy.category}</h2></div><div className="post-shop-type-options" role="group" aria-label={copy.category}>{serviceCategories.map(({ id, icon }) => <button className={category === id ? "is-selected" : ""} key={id} type="button" onClick={() => setCategory(id)}><i className={`fa-solid ${icon}`} aria-hidden="true" />{categoryLabels[id]}</button>)}</div></section>
          <section className="post-description-field"><div className="post-section-heading"><span>2</span><h2>{copy.details}</h2></div><div className="post-field"><label htmlFor="service-name">{copy.name}</label><input id="service-name" name="service-name" required minLength={2} maxLength={100} placeholder={copy.namePlaceholder} /></div><div className="post-field"><label htmlFor="service-description">{copy.descriptionLabel}</label><textarea id="service-description" name="service-description" required minLength={20} maxLength={2000} placeholder={copy.descriptionPlaceholder} /></div></section>
          <fieldset className={`photo-fieldset post-photo-field service-create-photo ${isDraggingPhotos ? "is-dragging" : ""}`} onDragOver={(event) => { event.preventDefault(); setIsDraggingPhotos(true); }} onDragLeave={() => setIsDraggingPhotos(false)} onDrop={(event) => { event.preventDefault(); setIsDraggingPhotos(false); addPhotos(event.dataTransfer.files); }}><div className="field-label-row"><legend><span className="post-section-heading"><span>3</span><span>{copy.photos}</span></span></legend><span>{isKorean ? "최대 5장" : "Up to 5 photos"}</span></div><input ref={photoInputRef} className="post-photo-input" id="service-photos" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => { addPhotos(event.target.files); event.currentTarget.value = ""; }} /><div className="post-photo-grid">{photos.map((photo) => <div className="post-photo-card" key={photo.id}><button className={`post-photo-slot ${photo.id === primaryPhotoId ? "is-main" : ""}`} type="button" aria-label={photo.id === primaryPhotoId ? (isKorean ? "대표 사진" : "Primary photo") : (isKorean ? "대표 사진으로 설정" : "Set as primary photo")} onClick={() => setPrimaryPhotoId(photo.id)}><img src={photo.url} alt={photo.file.name} />{photo.id === primaryPhotoId ? <span>{isKorean ? "대표 사진" : "Primary"}</span> : null}</button><button className="post-photo-remove" type="button" aria-label={isKorean ? `${photo.file.name} 삭제` : `Remove ${photo.file.name}`} onClick={() => removePhoto(photo.id)}><i className="fa-solid fa-xmark" aria-hidden="true" /></button></div>)}{photos.length < 5 ? <button className={`post-photo-upload ${photos.length ? "" : "is-initial"}`} type="button" onClick={() => photoInputRef.current?.click()}><i className="fa-solid fa-camera" aria-hidden="true" /><span>{isKorean ? "추가" : "Add"}</span></button> : null}</div><p className="post-upload-hint"><strong>{isKorean ? "클릭하거나 사진을 여기에 끌어다 놓으세요." : "Click to upload or drag and drop multiple photos at once."}</strong><span>{copy.photoHint}</span></p></fieldset>
          <section className="post-location-grid service-create-contact"><div className="post-section-heading"><span>4</span><h2>{copy.contact}</h2></div><SelectMenu id="service-area" name="service-area" label={copy.serviceArea} placeholder={isKorean ? "지역 선택" : "Select service area"} options={[{ value: allAreasValue, label: isKorean ? "뉴질랜드 전체" : "All New Zealand" }, ...NZ_MAIN_LOCATIONS.map((location) => ({ value: location, label: location }))]} value={serviceArea} onChange={(next) => { setServiceArea(next); setSuburb(""); }} /><SelectMenu id="service-suburb" name="service-suburb" label={copy.suburb} placeholder={isKorean ? "세부 지역 선택" : "Select suburb"} options={availableSuburbs.map((option) => ({ value: option, label: option }))} value={suburb} disabled={!availableSuburbs.length} onChange={setSuburb} /><div className="post-field service-provider-type-field"><label>{copy.providerType}</label><div className="service-provider-type"><label><input type="radio" name="provider-type" value="business" defaultChecked />{copy.localBusiness}</label><label><input type="radio" name="provider-type" value="sole-trader" />{copy.soleTrader}</label></div></div><div className="post-field"><label htmlFor="service-phone">{copy.phone}</label><input id="service-phone" name="service-phone" type="tel" required placeholder="021 123 4567" /></div><div className="post-field"><label htmlFor="service-email">{copy.email}</label><input id="service-email" name="service-email" type="email" placeholder="you@example.co.nz" /></div><div className="post-field"><label htmlFor="service-website">{copy.website}</label><input id="service-website" name="service-website" type="url" placeholder="https://yourwebsite.co.nz" /></div></section>
          <section className="service-trust-requirements"><div className="post-section-heading"><span>5</span><h2>{copy.trustTitle}</h2></div><p>{copy.trustDescription}</p><div>{copy.trust.map(([, title, body], index) => <article key={title}><i className={["fa-solid fa-briefcase", "fa-solid fa-address-card", "fa-solid fa-shield-halved", "fa-solid fa-clipboard-check"][index]} aria-hidden="true" /><span><strong>{title}</strong><small>{body}</small></span></article>)}</div><aside><i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /> {copy.trustAlert}</aside></section>
          {notice ? <p className="post-create-status" role="status">{notice}</p> : null}
          <div className="post-submit-row service-create-submit"><label className="terms-row"><input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} /><span>{isKorean ? <><Link href="/terms">이용약관</Link> 및 <Link href="/community">커뮤니티 가이드라인</Link>에 동의합니다.</> : <>I agree to Tada’s <Link href="/terms">Terms</Link> and <Link href="/community">Community Guidelines</Link>.</>}</span></label><button className="post-submit-button" type="submit" disabled={isSubmitting}><span>{isSubmitting ? (isKorean ? "등록 중..." : "Submitting...") : copy.publish}</span></button></div>
        </form>
      </section>
      <aside className="post-ad-sidebar service-create-sidebar"><section className="post-ad-tips"><h2>{copy.tipsTitle}</h2>{copy.tips.map((tip, index) => <article key={tip}><i className={["fa-solid fa-list-check", "fa-solid fa-location-dot", "fa-solid fa-shield-halved"][index]} aria-hidden="true" /><p>{tip}</p></article>)}</section><section className="service-verification-card"><header><h2>{copy.verifiedTitle}</h2><i className="fa-solid fa-shield-halved" aria-hidden="true" /></header><p>{copy.verifiedIntro}</p><ol>{copy.verifiedSteps.map(([number, title, body], index) => <li key={title}><span>{number}</span><i className={["fa-solid fa-file-lines", "fa-solid fa-id-card", "fa-solid fa-circle-check"][index]} aria-hidden="true" /><div><strong>{title}</strong><small>{body}</small></div></li>)}</ol><Link href="/market/dashboard/profile">{copy.verificationAction}</Link><footer><i className="fa-solid fa-circle" aria-hidden="true" /> {copy.verificationStatus}</footer></section></aside>
    </div>
      </div>
    </PageContainer>
  </main>;
}
