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
import { allowsAnonymousCommunityPost, communityPostBodyTextLength, communityPostCreateResponseSchema } from "@/contracts/api";
import { readApiResponse } from "@/lib/api/client";
import type { MainLocation } from "@/data/nzLocations";
import { findMainLocation, findSubLocation } from "@/lib/market/nz-location";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useLanguage } from "@/components/LanguageProvider";
import { findProhibitedPublicContent } from "@/lib/safety/prohibited-content";
import { isSafeHttpUrl, youtubeThumbnailUrl, youtubeVideoId } from "@/lib/community/post-links";

type LocationDraft = { mainLocation: MainLocation | ""; subLocation: string; locality: string | null; rawSuburb: string | null; region: string | null; latitude: number | null; longitude: number | null };

const emptyLocation: LocationDraft = { mainLocation: "", subLocation: "", locality: null, rawSuburb: null, region: null, latitude: null, longitude: null };

const toLocalDateTimeInputValue = (date: Date) => {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
};

export function CommunityCreateClient({ initialCategory = "" }: { initialCategory?: Exclude<CommunityCategory, "all"> | "" }) {
  const { t, locale } = useLanguage();
  const router = useRouter();
  const [categorySlug, setCategorySlug] = useState<Exclude<CommunityCategory, "all"> | "">(initialCategory);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  // The notice is for a blank form; a title or a line of the post is enough
  // to say it has been read.
  const hasStartedWriting = Boolean(title.trim()) || Boolean(body.replace(/<[^>]*>/g, " ").trim());
  const [eventStartAt, setEventStartAt] = useState("");
  const [eventEndAt, setEventEndAt] = useState("");
  const [imagePaths, setImagePaths] = useState<string[]>([]);
  const [location, setLocation] = useState<LocationDraft>(emptyLocation);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState(0);
  const [minimumEventDateTime] = useState(() => toLocalDateTimeInputValue(new Date()));
  const unsafeMessage = (term: string) => locale === "ko" ? `금지되거나 안전하지 않은 표현이 들어 있습니다: “${term}”` : `This post contains a prohibited or unsafe term: “${term}”`;
  const isEventCategory = categorySlug === "events";
  const allowsAnonymous = allowsAnonymousCommunityPost(categorySlug);
  // Read as the writer types, so a mistyped link is caught beside the box
  // rather than at the end of the form.
  const videoId = youtubeVideoId(videoUrl);
  const isSourceValid = !sourceUrl.trim() || isSafeHttpUrl(sourceUrl);
  const isVideoValid = !videoUrl.trim() || videoId !== null;

  useEffect(() => { setCategorySlug(initialCategory); setIsAnonymous(false); }, [initialCategory]);

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
    // Checked here, on the way out, and never while the post is being written.
    // The title and the editor used to drop any change that matched this list,
    // which is a poor fit for a rich-text editor: the editor keeps what was
    // pasted in its own DOM, so a paragraph copied from another post that
    // happened to mention one of these words stayed on screen while the form
    // held nothing, and the only complaint was that the post was too short.
    const prohibitedTerm = findProhibitedPublicContent(title, body);
    if (prohibitedTerm) {
      setError(unsafeMessage(prohibitedTerm));
      return;
    }
    if (title.trim().length < 4) {
      setError(t(isEventCategory ? "communityEventNameRequired" : "communityCreateTitleRequired"));
      return;
    }
    if (isEventCategory && (!eventStartAt || !eventEndAt)) {
      setError(t("communityEventScheduleRequired"));
      return;
    }
    if (isEventCategory && new Date(eventEndAt).getTime() <= new Date(eventStartAt).getTime()) {
      setError(t("communityEventScheduleInvalid"));
      return;
    }
    if (communityPostBodyTextLength(body) < 20) {
      setError(t("communityCreateBodyRequired"));
      return;
    }
    if (!isSourceValid) {
      setError(t("communitySourceLinkInvalid"));
      return;
    }
    if (!isVideoValid) {
      setError(t("communityVideoLinkInvalid"));
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
      body: JSON.stringify({ categorySlug, isAnonymous: allowsAnonymous && isAnonymous, title, body, mainLocation: location.mainLocation, subLocation: location.subLocation, imagePaths, sourceUrl: sourceUrl.trim(), videoUrl: videoUrl.trim(), eventStartAt: isEventCategory ? new Date(eventStartAt).toISOString() : null, eventEndAt: isEventCategory ? new Date(eventEndAt).toISOString() : null }),
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
    <CommunityDesktopLayout activeCategory={categorySlug || "all"}>
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
              <div className="post-shop-type-options" role="group" aria-label={t("categories")}>{communityPostCategories.map(({ value, labelKey, icon }) => <button className={`community-category-${value} ${categorySlug === value ? "is-selected" : ""}`} key={value} type="button" onClick={() => { setCategorySlug(value); if (!allowsAnonymousCommunityPost(value)) setIsAnonymous(false); }}><i className={`ms ${icon}`} aria-hidden="true" />{t(labelKey)}</button>)}</div>
              {allowsAnonymous ? <fieldset className="community-post-identity-options"><legend>{t("communityAuthorVisibility")}</legend><div><label><input type="radio" name="community-author-visibility" checked={!isAnonymous} onChange={() => setIsAnonymous(false)} />{t("communityShowMyName")}</label><label><input type="radio" name="community-author-visibility" checked={isAnonymous} onChange={() => setIsAnonymous(true)} />{t("communityPostAnonymously")}</label></div><p>{t("communityAnonymousHelp")}</p></fieldset> : null}
            </section>

            <section className="post-description-field">
              <div className="post-section-heading"><span>2</span><h2>{t(isEventCategory ? "communityEventDetailsHeading" : "communityWriteYourPost")}</h2></div>
              {/* What the law expects of a post, said before it is written.
                  It steps aside the moment the writer starts, rather than
                  sitting over the form for the whole composition. */}
              {hasStartedWriting ? null : <p className="community-create-legal-notice" role="note"><i className="ms ms-gavel" aria-hidden="true" />{t("communityCreateLegalNotice")}</p>}
              <div className="post-field"><label htmlFor="community-title">{t(isEventCategory ? "communityEventNameLabel" : "communityTitleLabel")}</label><input id="community-title" value={title} onChange={(event) => setTitle(event.target.value)} minLength={4} maxLength={120} placeholder={t(isEventCategory ? "communityEventNamePlaceholder" : "communityTitlePlaceholder")} required /></div>
              {isEventCategory ? <div className="event-schedule-grid">
                <div className="post-field"><label htmlFor="community-event-start">{t("communityEventStartLabel")}</label><input id="community-event-start" type="datetime-local" min={minimumEventDateTime} value={eventStartAt} onChange={(event) => { setEventStartAt(event.target.value); if (eventEndAt && event.target.value >= eventEndAt) setEventEndAt(""); }} required /></div>
                <div className="post-field"><label htmlFor="community-event-end">{t("communityEventEndLabel")}</label><input id="community-event-end" type="datetime-local" min={eventStartAt || minimumEventDateTime} value={eventEndAt} onChange={(event) => setEventEndAt(event.target.value)} required /></div>
              </div> : null}
              <div className="post-field"><label htmlFor="community-body">{t(isEventCategory ? "communityEventDetailsLabel" : "communityDetailsLabel")}</label><HtmlEditor id="community-body" label={t(isEventCategory ? "communityEventDetailsLabel" : "communityDetailsLabel")} value={body} onChange={setBody} placeholder={t(isEventCategory ? "communityEventDetailsPlaceholder" : "communityDetailsPlaceholder")} /></div>
              <div className="community-link-fields">
                <div className="post-field">
                  <label htmlFor="community-source-url"><i className="ms ms-newspaper" aria-hidden="true" />{t("communitySourceLinkLabel")}</label>
                  <input id="community-source-url" type="url" inputMode="url" value={sourceUrl} maxLength={500} placeholder={t("communitySourceLinkPlaceholder")} aria-invalid={!isSourceValid} onChange={(event) => setSourceUrl(event.target.value)} />
                  <p className={`post-field-hint${isSourceValid ? "" : " is-invalid"}`}>{isSourceValid ? t("communitySourceLinkHint") : t("communitySourceLinkInvalid")}</p>
                </div>
                <div className="post-field">
                  <label htmlFor="community-video-url"><i className="ms ms-play-circle" aria-hidden="true" />{t("communityVideoLinkLabel")}</label>
                  <input id="community-video-url" type="url" inputMode="url" value={videoUrl} maxLength={500} placeholder={t("communityVideoLinkPlaceholder")} aria-invalid={!isVideoValid} onChange={(event) => setVideoUrl(event.target.value)} />
                  <p className={`post-field-hint${isVideoValid ? "" : " is-invalid"}`}>{isVideoValid ? t("communityVideoLinkHint") : t("communityVideoLinkInvalid")}</p>
                  {/* The still is the quickest way to tell a pasted link is
                      the video the writer meant. */}
                  {videoId ? <p className="community-video-preview"><img src={youtubeThumbnailUrl(videoId)} alt="" loading="lazy" /><span>{t("communityVideoLinkReady")}</span></p> : null}
                </div>
              </div>
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
