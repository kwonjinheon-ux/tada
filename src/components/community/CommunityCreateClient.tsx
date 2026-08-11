"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { communityPostCategories, type CommunityCategory } from "@/components/community/CommunityFilterSidebar";
import { ListingLocationSelector } from "@/components/market/ListingLocationSelector";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { Button } from "@/components/ui/Button";
import { communityPostCreateResponseSchema } from "@/contracts/api";
import { readApiResponse } from "@/lib/api/client";
import type { MainLocation } from "@/data/nzLocations";
import { useLanguage } from "@/components/LanguageProvider";

type LocationDraft = { mainLocation: MainLocation | ""; subLocation: string; locality: string | null; rawSuburb: string | null; region: string | null; latitude: number | null; longitude: number | null };

const emptyLocation: LocationDraft = { mainLocation: "", subLocation: "", locality: null, rawSuburb: null, region: null, latitude: null, longitude: null };

export function CommunityCreateClient() {
  const { t } = useLanguage();
  const router = useRouter();
  const [categorySlug, setCategorySlug] = useState<Exclude<CommunityCategory, "all"> | "">("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [location, setLocation] = useState<LocationDraft>(emptyLocation);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const response = await fetch("/api/community/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categorySlug, title, body, mainLocation: location.mainLocation, subLocation: location.subLocation }),
    });
    const result = await readApiResponse(response, communityPostCreateResponseSchema);
    setIsSubmitting(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    router.push("/community");
    router.refresh();
  };

  return (
    <main className="post-ad-page community-create-page">
      <div className="post-ad-create-bar"><Link href="/community"><i className="fa-solid fa-arrow-left" aria-hidden="true" /> Back to community</Link></div>
      <div className="post-ad-layout">
        <section className="post-ad-card">
          <header className="post-ad-intro">
            <h1>{t("communityCreateTitle")}</h1>
            <p>{t("communityCreateDescription")}</p>
          </header>
          <form className="post-ad-form" onSubmit={submit}>
            <section className="post-title-field">
              <div className="post-section-heading"><span>1</span><h2>Choose a category</h2></div>
              <SelectMenu
                id="community-category"
                name="category"
                label="Category"
                icon="fa-list"
                placeholder="Select a community category"
                options={communityPostCategories.map(({ value, labelKey }) => ({ value, label: t(labelKey) }))}
                value={categorySlug}
                onChange={(value) => setCategorySlug(value as Exclude<CommunityCategory, "all">)}
              />
              <p className="post-field-hint">This uses the same categories as the community sidebar.</p>
            </section>

            <section className="post-description-field">
              <div className="post-section-heading"><span>2</span><h2>Write your post</h2></div>
              <div className="post-field"><label htmlFor="community-title">Title</label><input id="community-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder="What would you like to share?" required /></div>
              <div className="post-field"><label htmlFor="community-body">Details</label><textarea id="community-body" className="post-editor-source" value={body} onChange={(event) => setBody(event.target.value)} maxLength={5_000} placeholder="Include the important details for your neighbours." required /></div>
            </section>

            <section className="post-form-grid post-location-grid">
              <div className="post-section-heading"><span>3</span><h2>Location</h2></div>
              <ListingLocationSelector value={location} onChange={setLocation} />
            </section>

            {error ? <p className="post-create-status is-error" role="alert">{error}</p> : null}
            <div className="post-submit-row">
              <p>By posting, you agree to our <Link href="#">Terms of Service</Link>.</p>
              <Button className={`post-submit-button ${isSubmitting ? "is-progress" : ""}`} type="submit" disabled={isSubmitting} aria-busy={isSubmitting}><span>{isSubmitting ? "Publishing…" : "Publish post"}</span></Button>
            </div>
          </form>
        </section>
        <aside className="post-ad-sidebar" aria-label="Community posting tips">
          <section className="post-ad-tips">
            <h2>Tips for a helpful post</h2>
            <article><i className="fa-solid fa-location-dot" aria-hidden="true" /><div><h2>Be local</h2><p>Add a location so nearby neighbours can find your post.</p></div></article>
            <article><i className="fa-regular fa-message" aria-hidden="true" /><div><h2>Keep it clear</h2><p>A specific title and useful details make replies easier.</p></div></article>
            <article><i className="fa-solid fa-shield-halved" aria-hidden="true" /><div><h2>Stay safe</h2><p>Do not include private contact or payment information.</p></div></article>
          </section>
        </aside>
      </div>
    </main>
  );
}
