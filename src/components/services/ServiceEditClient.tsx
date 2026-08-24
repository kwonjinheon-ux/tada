"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";
import { serviceCategories, servicesCategoryLabels, type ServiceCategoryId } from "@/data/services";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type EditableService = { id: string; category: ServiceCategoryId; providerName: string; description: string; providerType: "business" | "sole_trader"; serviceAreas: string[]; suburbs: string[]; phone: string; email: string; website: string; streetAddress: string; weekdayHours: string; saturdayHours: string; sundayHours: string; foundedYear: string };

export function ServiceEditClient({ serviceId }: { serviceId: string }) {
  const router = useRouter();
  const { locale } = useLanguage();
  const isKorean = locale === "ko";
  const labels = servicesCategoryLabels(locale);
  const [service, setService] = useState<EditableService | null>(null);
  const [notice, setNotice] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const supabase = createBrowserSupabaseClient();
      if (!supabase) { if (active) setNotice(isKorean ? "서비스 관리를 사용할 수 없습니다." : "Service management is unavailable."); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace(`/login?redirectTo=${encodeURIComponent(`/services/${serviceId}/edit`)}`); return; }
      const { data, error } = await supabase.from("service_listings").select("id,category_slug,provider_name,description,provider_type,service_areas,suburbs,phone,email,website,street_address,weekday_hours,saturday_hours,sunday_hours,founded_year").eq("id", serviceId).eq("owner_id", user.id).maybeSingle();
      if (!active) return;
      if (error || !data) { setNotice(isKorean ? "내 서비스만 수정할 수 있습니다." : "Only your own services can be edited."); return; }
      setService({ id: data.id, category: data.category_slug as ServiceCategoryId, providerName: data.provider_name, description: data.description, providerType: data.provider_type, serviceAreas: data.service_areas ?? [], suburbs: data.suburbs ?? [], phone: data.phone, email: data.email ?? "", website: data.website ?? "", streetAddress: data.street_address ?? "", weekdayHours: data.weekday_hours ?? "", saturdayHours: data.saturday_hours ?? "", sundayHours: data.sunday_hours ?? "", foundedYear: data.founded_year ? String(data.founded_year) : "" });
    })();
    return () => { active = false; };
  }, [isKorean, router, serviceId]);

  const update = <Key extends keyof EditableService>(key: Key, value: EditableService[Key]) => setService((current) => current ? { ...current, [key]: value } : current);
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!service) return;
    setIsSaving(true); setNotice("");
    try {
      const response = await fetch(`/api/services/${serviceId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...service, foundedYear: service.foundedYear ? Number(service.foundedYear) : null }) });
      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error ?? "Unable to save service details.");
      router.replace(`/services/${serviceId}`); router.refresh();
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : "Unable to save service details."); } finally { setIsSaving(false); }
  };

  if (!service) return <main className="marketplace-page services-page service-edit-page"><section className="service-edit-card ui-card"><Link href="/services"><i className="fa-solid fa-arrow-left" /> {isKorean ? "서비스 목록" : "Services"}</Link><p role={notice ? "alert" : undefined}>{notice || (isKorean ? "서비스 정보를 불러오는 중…" : "Loading service details…")}</p></section></main>;
  return <main className="marketplace-page services-page service-edit-page"><section className="service-edit-card ui-card"><header><Link href={`/services/${serviceId}`}><i className="fa-solid fa-arrow-left" /> {isKorean ? "서비스 상세로" : "Back to service"}</Link><h1>{isKorean ? "내 서비스 수정" : "Edit your service"}</h1><p>{isKorean ? "수정한 정보는 저장 즉시 서비스 상세에 반영됩니다." : "Saved details appear on your service profile immediately."}</p></header><form className="post-ad-form" onSubmit={save}><div className="post-field"><label htmlFor="service-edit-category">{isKorean ? "서비스 종류" : "Service category"}</label><select id="service-edit-category" value={service.category} onChange={(event) => update("category", event.target.value as ServiceCategoryId)}>{serviceCategories.map(({ id }) => <option key={id} value={id}>{labels[id]}</option>)}</select></div><div className="post-field"><label htmlFor="service-edit-name">{isKorean ? "업체 또는 서비스명" : "Business or service name"}</label><input id="service-edit-name" required minLength={2} maxLength={100} value={service.providerName} onChange={(event) => update("providerName", event.target.value)} /></div><div className="post-field"><label htmlFor="service-edit-description">{isKorean ? "서비스 소개" : "About your service"}</label><textarea id="service-edit-description" required minLength={20} maxLength={2000} value={service.description} onChange={(event) => update("description", event.target.value)} /></div><div className="service-edit-grid"><div className="post-field"><label htmlFor="service-edit-area">{isKorean ? "서비스 지역" : "Service area"}</label><input id="service-edit-area" required value={service.serviceAreas.join(", ")} onChange={(event) => update("serviceAreas", event.target.value.split(",").map((value) => value.trim()).filter(Boolean))} /></div><div className="post-field"><label htmlFor="service-edit-suburb">{isKorean ? "세부 지역" : "Suburb"}</label><input id="service-edit-suburb" value={service.suburbs.join(", ")} onChange={(event) => update("suburbs", event.target.value.split(",").map((value) => value.trim()).filter(Boolean))} /></div><div className="post-field"><label htmlFor="service-edit-address">{isKorean ? "주소" : "Street address"}</label><input id="service-edit-address" required minLength={5} maxLength={200} value={service.streetAddress} onChange={(event) => update("streetAddress", event.target.value)} /></div><div className="post-field"><label htmlFor="service-edit-phone">{isKorean ? "연락처" : "Phone"}</label><input id="service-edit-phone" required type="tel" value={service.phone} onChange={(event) => update("phone", event.target.value)} /></div><div className="post-field"><label htmlFor="service-edit-weekdays">{isKorean ? "평일 운영시간" : "Weekday hours"}</label><input id="service-edit-weekdays" required value={service.weekdayHours} onChange={(event) => update("weekdayHours", event.target.value)} /></div><div className="post-field"><label htmlFor="service-edit-saturday">{isKorean ? "토요일 운영시간" : "Saturday hours"}</label><input id="service-edit-saturday" value={service.saturdayHours} onChange={(event) => update("saturdayHours", event.target.value)} /></div><div className="post-field"><label htmlFor="service-edit-sunday">{isKorean ? "일요일 운영시간" : "Sunday hours"}</label><input id="service-edit-sunday" value={service.sundayHours} onChange={(event) => update("sundayHours", event.target.value)} /></div><div className="post-field"><label htmlFor="service-edit-year">{isKorean ? "설립 연도" : "Established year"}</label><input id="service-edit-year" type="number" min="1800" max="2100" value={service.foundedYear} onChange={(event) => update("foundedYear", event.target.value)} /></div><div className="post-field"><label htmlFor="service-edit-email">{isKorean ? "이메일" : "Email"}</label><input id="service-edit-email" type="email" value={service.email} onChange={(event) => update("email", event.target.value)} /></div><div className="post-field"><label htmlFor="service-edit-website">{isKorean ? "웹사이트" : "Website"}</label><input id="service-edit-website" type="url" value={service.website} onChange={(event) => update("website", event.target.value)} /></div></div>{notice ? <p className="post-create-status" role="alert">{notice}</p> : null}<div className="service-edit-actions"><Link className="ui-button ui-button--secondary" href={`/services/${serviceId}`}>{isKorean ? "취소" : "Cancel"}</Link><button className="ui-button ui-button--primary" type="submit" disabled={isSaving}>{isSaving ? (isKorean ? "저장 중…" : "Saving…") : (isKorean ? "변경사항 저장" : "Save changes")}</button></div></form></section></main>;
}
