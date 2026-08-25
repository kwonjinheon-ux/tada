"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { communityPostCategories, type CommunityCategory } from "@/components/community/CommunityFilterSidebar";
import { ListingLocationSelector } from "@/components/market/ListingLocationSelector";
import { HtmlEditor } from "@/components/ui/HtmlEditor";
import { CommunityImageAttachments } from "@/components/community/CommunityImageAttachments";
import { CommunityDesktopLayout } from "@/components/community/CommunityDesktopLayout";
import { PostSubmitButton } from "@/components/post-ad/PostSubmitButton";
import { communityPostCreateResponseSchema } from "@/contracts/api";
import { readApiResponse } from "@/lib/api/client";
import type { MainLocation } from "@/data/nzLocations";
import { findMainLocation, findSubLocation } from "@/lib/market/nz-location";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useLanguage } from "@/components/LanguageProvider";

type LocationDraft = { mainLocation: MainLocation | ""; subLocation: string; locality: string | null; rawSuburb: string | null; region: string | null; latitude: number | null; longitude: number | null };

const emptyLocation: LocationDraft = { mainLocation: "", subLocation: "", locality: null, rawSuburb: null, region: null, latitude: null, longitude: null };

export function CommunityCreateClient() {
  const { t } = useLanguage();
  const router = useRouter();
  const [categorySlug, setCategorySlug] = useState<Exclude<CommunityCategory, "all"> | "">("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imagePaths, setImagePaths] = useState<string[]>([]);
  const [location, setLocation] = useState<LocationDraft>(emptyLocation);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState(0);

  useEffect(() => {
    if (!isSubmitting) {
      setSubmitProgress(0);
      return;
    }
    setSubmitProgress(8);
    const timer = window.setInterval(() => setSubmitProgress((current) => Math.min(88, current + Math.max(2, Math.ceil((88 - current) * 0.18)))), 700);
    return () => window.clearInterval(timer);
  }, [isSubmitting]);

  useEffect(() => { void (async () => { const supabase = createBrowserSupabaseClient(); const { data: { user } } = await supabase?.auth.getUser() ?? { data: { user: null } }; if (!supabase || !user) return; const { data } = await supabase.from("profiles").select("region_city, region_suburb").eq("id", user.id).maybeSingle(); const mainLocation = findMainLocation(data?.region_city ?? ""); if (mainLocation) setLocation((current) => current.mainLocation ? current : { ...emptyLocation, mainLocation, subLocation: findSubLocation(mainLocation, data?.region_suburb ?? "") ?? "" }); })(); }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!categorySlug) {
      setError(t("communityCreateCategoryRequired"));
      return;
    }
    if (title.trim().length < 4) {
      setError(t("communityCreateTitleRequired"));
      return;
    }
    if (body.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().length < 20) {
      setError(t("communityCreateBodyRequired"));
      return;
    }
    if (!location.mainLocation) {
      setError(t("communityCreateLocationRequired"));
      return;
    }
    setIsSubmitting(true);
    setSubmitProgress(18);
    const response = await fetch("/api/community/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categorySlug, title, body, mainLocation: location.mainLocation, subLocation: location.subLocation, imagePaths }),
    });
    const result = await readApiResponse(response, communityPostCreateResponseSchema);
    if (result.error) {
      setIsSubmitting(false);
      setError(result.error.message);
      return;
    }
    setSubmitProgress(100);
    router.push("/community");
    router.refresh();
  };

  return (
    <CommunityDesktopLayout>
      <div className="post-ad-page community-create-page">
      <div className="post-ad-create-bar"><Link href="/community"><i className="ms ms-arrow-back" aria-hidden="true" /> {t("communityBackToCommunity")}</Link></div>
      <div className="post-ad-layout">
        <section className="post-ad-card">
          <header className="post-ad-intro">
            <h1>{t("communityCreateTitle")}</h1>
            <p>{t("communityCreateDescription")}</p>
          </header>
          <form className="post-ad-form" onSubmit={submit}>
            <section className="post-title-field">
              <div className="post-section-heading"><span>1</span><h2>{t("communityChooseCategory")}</h2></div>
              <div className="post-shop-type-options" role="group" aria-label={t("categories")}>{communityPostCategories.map(({ value, labelKey, icon }) => <button className={`community-category-${value} ${categorySlug === value ? "is-selected" : ""}`} key={value} type="button" onClick={() => setCategorySlug(value)}><i className={`ms ${icon}`} aria-hidden="true" />{t(labelKey)}</button>)}</div>
              <p className="post-field-hint">{t("communitySameCategoriesHint")}</p>
            </section>

            <section className="post-description-field">
              <div className="post-section-heading"><span>2</span><h2>{t("communityWriteYourPost")}</h2></div>
              <div className="post-field"><label htmlFor="community-title">{t("communityTitleLabel")}</label><input id="community-title" value={title} onChange={(event) => setTitle(event.target.value)} minLength={4} maxLength={120} placeholder={t("communityTitlePlaceholder")} required /></div>
              <div className="post-field"><label htmlFor="community-body">{t("communityDetailsLabel")}</label><HtmlEditor id="community-body" label={t("communityDetailsLabel")} value={body} onChange={setBody} placeholder={t("communityDetailsPlaceholder")} /></div>
            </section>

            <section className="post-photo-field"><div className="post-section-heading"><span>3</span><h2>{t("communityAddImages")}</h2></div><CommunityImageAttachments onChange={setImagePaths} /></section>

            <section className="post-form-grid post-location-grid">
              <div className="post-section-heading"><span>4</span><h2>{t("location")}</h2></div>
              <ListingLocationSelector value={location} onChange={setLocation} />
            </section>

            {error ? <p className="post-create-status is-error" role="alert">{error}</p> : null}
            <div className="post-submit-row">
              <p>By posting, you agree to our <Link href="#">Terms of Service</Link>.</p>
              <PostSubmitButton type="submit" disabled={isSubmitting} isProgressing={isSubmitting} progress={submitProgress}>{isSubmitting ? `${t("communityPublishing")} ${submitProgress}%` : t("communityPublishPost")}</PostSubmitButton>
            </div>
          </form>
        </section>
        <aside className="post-ad-sidebar" aria-label="Community posting tips">
          <section className="post-ad-tips">
            <h2>{t("communityTipsHeading")}</h2>
            <article><i className="ms ms-location-on" aria-hidden="true" /><div><h2>{t("communityTipLocalTitle")}</h2><p>{t("communityTipLocalDesc")}</p></div></article>
            <article><i className="ms ms-chat" aria-hidden="true" /><div><h2>{t("communityTipClearTitle")}</h2><p>{t("communityTipClearDesc")}</p></div></article>
            <article><i className="ms ms-security" aria-hidden="true" /><div><h2>{t("communityTipSafeTitle")}</h2><p>{t("communityTipSafeDesc")}</p></div></article>
          </section>
        </aside>
      </div>
      </div>
    </CommunityDesktopLayout>
  );
}
