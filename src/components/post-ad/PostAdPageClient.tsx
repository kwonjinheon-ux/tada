"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type SelectOption = {
  label: string;
  value: string;
};

const serviceOptions: SelectOption[] = [
  { label: "General", value: "general" },
  { label: "Jobs", value: "jobs" },
  { label: "Cars", value: "cars" },
  { label: "Community", value: "community" },
  { label: "Market", value: "market" },
];

const postTypes: SelectOption[] = [
  { label: "Offer", value: "offer" },
  { label: "Request", value: "request" },
  { label: "Update", value: "update" },
  { label: "Event", value: "event" },
];

const visibilityOptions: SelectOption[] = [
  { label: "Publish now", value: "published" },
  { label: "Save draft", value: "draft" },
];

const contactMethods: SelectOption[] = [
  { label: "In-app messages", value: "in_app" },
  { label: "Email", value: "email" },
  { label: "Phone", value: "phone" },
];

const regions: SelectOption[] = [
  { label: "Auckland", value: "Auckland" },
  { label: "Wellington", value: "Wellington" },
  { label: "Canterbury", value: "Canterbury" },
];

const areas: SelectOption[] = [
  { label: "CBD", value: "CBD" },
  { label: "North Shore", value: "North Shore" },
  { label: "Mount Eden", value: "Mount Eden" },
  { label: "Newmarket", value: "Newmarket" },
];

const detailModes: SelectOption[] = [
  { label: "Flexible details", value: "flexible" },
  { label: "Service-specific later", value: "service_specific" },
];

function CustomSelect({
  id,
  name,
  label,
  icon,
  placeholder,
  options,
  value,
  onChange,
}: {
  id: string;
  name: string;
  label: string;
  icon: string;
  placeholder: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("click", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("click", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <div className="post-field">
      <label htmlFor={id}>{label}</label>
      <div ref={wrapperRef} className={`post-select-wrap has-leading-icon is-enhanced ${isOpen ? "is-open" : ""}`}>
        <i className={`fa-solid ${icon}`} aria-hidden="true" />
        <select id={id} name={name} value={value} onChange={(event) => onChange(event.target.value)}>
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          className="post-select-trigger"
          type="button"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={`${id}-menu`}
          onClick={() => setIsOpen((current) => !current)}
        >
          <span>{selected?.label ?? placeholder}</span>
        </button>
        <div className="post-select-menu" id={`${id}-menu`} role="listbox">
          <button
            className="post-select-option"
            type="button"
            role="option"
            aria-selected={!value}
            onClick={() => {
              onChange("");
              setIsOpen(false);
            }}
          >
            {placeholder}
          </button>
          {options.map((option) => (
            <button
              className="post-select-option"
              key={option.value}
              type="button"
              role="option"
              aria-selected={value === option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PostAdPageClient() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [serviceKey, setServiceKey] = useState("general");
  const [postType, setPostType] = useState("offer");
  const [status, setStatus] = useState("published");
  const [contactMethod, setContactMethod] = useState("in_app");
  const [region, setRegion] = useState("");
  const [area, setArea] = useState("");
  const [detailMode, setDetailMode] = useState("flexible");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setNotice(null);
    setError(null);

    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setError("Supabase environment variables are not configured.");
      setIsSubmitting(false);
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setIsSubmitting(false);
      router.push("/login");
      return;
    }

    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const body = String(form.get("body") ?? "").trim();
    const referencePrice = String(form.get("reference_price") ?? "").trim();

    const { error: insertError } = await supabase.from("content_posts").insert({
      author_id: user.id,
      service_key: serviceKey,
      post_type: postType,
      status,
      title,
      body,
      region_city: region || null,
      region_suburb: area || null,
      contact_method: contactMethod,
      payload: {
        detail_mode: detailMode,
        reference_price: referencePrice || null,
      },
    });

    if (insertError) {
      setError(insertError.message);
      setIsSubmitting(false);
      return;
    }

    setNotice(status === "published" ? "Created successfully." : "Draft saved.");
    formRef.current?.reset();
    setServiceKey("general");
    setPostType("offer");
    setStatus("published");
    setContactMethod("in_app");
    setRegion("");
    setArea("");
    setDetailMode("flexible");
    setIsSubmitting(false);
  };

  return (
    <main className="post-ad-page">
      <div className="post-ad-layout">
        <section className="post-ad-card" aria-label="Create a new Tada post">
          <form ref={formRef} className="post-ad-form" onSubmit={submit}>
            <div className="post-field post-field-full">
              <label htmlFor="post-title">Title</label>
              <input id="post-title" name="title" type="text" minLength={4} maxLength={120} placeholder="e.g. Part-time barista needed in Newmarket" required />
              <p className="post-field-hint">Your post can later connect to jobs, cars, community, market, or another Tada service.</p>
            </div>

            <div className="post-form-grid post-form-grid-four">
              <CustomSelect id="service-key" name="service_key" label="Service" icon="fa-layer-group" placeholder="Select service" options={serviceOptions} value={serviceKey} onChange={setServiceKey} />
              <CustomSelect id="post-type" name="post_type" label="Post Type" icon="fa-tags" placeholder="Select post type" options={postTypes} value={postType} onChange={setPostType} />
              <CustomSelect id="post-status" name="status" label="Visibility" icon="fa-eye" placeholder="Publish now" options={visibilityOptions} value={status} onChange={setStatus} />
              <CustomSelect id="contact-method" name="contact_method" label="Contact Method" icon="fa-message" placeholder="In-app messages" options={contactMethods} value={contactMethod} onChange={setContactMethod} />
            </div>

            <fieldset className="photo-fieldset">
              <div className="field-label-row">
                <legend>Photos</legend>
                <span>Optional</span>
              </div>
              <div className="post-photo-grid">
                <div className="post-photo-slot is-main">
                  <img src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80" alt="Example post photo" />
                  <span>Main</span>
                </div>
                <div className="post-photo-slot">
                  <img src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80" alt="Example supporting photo" />
                </div>
                <button className="post-photo-upload" type="button" aria-label="Add a photo">
                  <i className="fa-solid fa-camera" aria-hidden="true" />
                  <span>Add</span>
                </button>
                <button className="post-photo-upload" type="button" aria-label="Add another photo">
                  <i className="fa-solid fa-camera" aria-hidden="true" />
                  <span>Add</span>
                </button>
              </div>
              <p className="post-upload-hint">
                <strong>Image upload will attach to this shared create flow later</strong>
                <span>For now, the post core is saved to the database.</span>
              </p>
            </fieldset>

            <div className="post-field post-field-full">
              <label htmlFor="post-description">Description</label>
              <div className="post-editor">
                <div className="post-editor-toolbar" aria-label="Description formatting">
                  <button type="button" aria-label="Bold"><strong>B</strong></button>
                  <button type="button" aria-label="Italic"><em>I</em></button>
                  <button type="button" aria-label="Underline"><u>U</u></button>
                  <button type="button" aria-label="Bulleted list"><i className="fa-solid fa-list" aria-hidden="true" /></button>
                  <button type="button" aria-label="Insert link"><i className="fa-solid fa-link" aria-hidden="true" /></button>
                  <button type="button" aria-label="Insert image"><i className="fa-regular fa-image" aria-hidden="true" /></button>
                </div>
                <textarea id="post-description" name="body" minLength={20} maxLength={5000} placeholder="Describe the post clearly so the right people can respond..." required />
              </div>
            </div>

            <div className="post-field post-field-full">
              <label htmlFor="reference-price">Reference Value (NZD)</label>
              <div className="post-price-input">
                <span>$</span>
                <input id="reference-price" name="reference_price" type="text" inputMode="decimal" placeholder="0.00" />
              </div>
            </div>

            <div className="post-form-grid post-location-grid">
              <CustomSelect id="post-region" name="region_city" label="Region" icon="fa-location-dot" placeholder="Select region" options={regions} value={region} onChange={setRegion} />
              <CustomSelect id="post-area" name="region_suburb" label="Area" icon="fa-map-pin" placeholder="Select area" options={areas} value={area} onChange={setArea} />
              <CustomSelect id="detail-mode" name="detail_mode" label="Details" icon="fa-building" placeholder="Choose detail mode" options={detailModes} value={detailMode} onChange={setDetailMode} />
            </div>

            {(notice || error) && (
              <p className={`post-create-status ${error ? "is-error" : "is-success"}`} role="status">
                {error ?? notice}
              </p>
            )}

            <div className="post-submit-row">
              <p>By posting, you agree to our <Link href="#">Terms of Service</Link>.</p>
              <button className="post-submit-button" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : status === "published" ? "Create Now" : "Save Draft"}
              </button>
            </div>
          </form>
        </section>

        <section className="post-ad-tips" aria-label="Posting tips">
          <article><i className="fa-regular fa-lightbulb" aria-hidden="true" /><div><h2>Good Photos</h2><p>Use clear photos when the service needs visual context.</p></div></article>
          <article><i className="fa-regular fa-circle-check" aria-hidden="true" /><div><h2>Clear Details</h2><p>Write enough detail for jobs, cars, community, or future services.</p></div></article>
          <article><i className="fa-solid fa-shield-halved" aria-hidden="true" /><div><h2>Safety First</h2><p>Keep contact and location details appropriate for the service.</p></div></article>
        </section>
      </div>
    </main>
  );
}
