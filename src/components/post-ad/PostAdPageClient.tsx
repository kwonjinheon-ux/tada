"use client";

import { FormEvent, useMemo, useState } from "react";
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

const postTypeOptions: SelectOption[] = [
  { label: "Offer", value: "offer" },
  { label: "Request", value: "request" },
  { label: "Update", value: "update" },
  { label: "Event", value: "event" },
];

const statusOptions: SelectOption[] = [
  { label: "Publish now", value: "published" },
  { label: "Save draft", value: "draft" },
];

const contactOptions: SelectOption[] = [
  { label: "In-app messages", value: "in_app" },
  { label: "Email", value: "email" },
  { label: "Phone", value: "phone" },
];

function FieldSelect({
  id,
  name,
  label,
  options,
  value,
  onChange,
}: {
  id: string;
  name: string;
  label: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="post-field">
      <label htmlFor={id}>{label}</label>
      <select id={id} name={name} value={value} onChange={(event) => onChange(event.target.value)} required>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function PostAdPageClient() {
  const router = useRouter();
  const [serviceKey, setServiceKey] = useState("general");
  const [postType, setPostType] = useState("offer");
  const [status, setStatus] = useState("published");
  const [contactMethod, setContactMethod] = useState("in_app");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedServiceLabel = useMemo(
    () => serviceOptions.find((option) => option.value === serviceKey)?.label ?? "General",
    [serviceKey],
  );

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
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
      setError("Please log in before creating a post.");
      setIsSubmitting(false);
      router.push("/login");
      return;
    }

    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const body = String(form.get("body") ?? "").trim();
    const regionCity = String(form.get("region_city") ?? "").trim();
    const regionSuburb = String(form.get("region_suburb") ?? "").trim();
    const details = String(form.get("details") ?? "").trim();

    const { error: insertError } = await supabase.from("content_posts").insert({
      author_id: user.id,
      service_key: serviceKey,
      post_type: postType,
      status,
      title,
      body,
      region_city: regionCity || null,
      region_suburb: regionSuburb || null,
      contact_method: contactMethod,
      payload: details ? { details } : {},
    });

    if (insertError) {
      setError(insertError.message);
      setIsSubmitting(false);
      return;
    }

    setMessage(status === "published" ? "Your post is live." : "Draft saved.");
    event.currentTarget.reset();
    setServiceKey("general");
    setPostType("offer");
    setStatus("published");
    setContactMethod("in_app");
    setIsSubmitting(false);
  };

  return (
    <main className="post-ad-page">
      <div className="post-ad-layout">
        <section className="post-ad-card" aria-label="Create a post">
          <form className="post-ad-form" onSubmit={submit}>
            <div className="post-ad-intro">
              <p>Tada Create</p>
              <h1>Create a post for any Tada service</h1>
              <span>
                Start with a shared post structure. Jobs, cars, community and market services can add their own details later.
              </span>
            </div>

            <div className="post-form-grid post-form-grid-four">
              <FieldSelect id="service-key" name="service_key" label="Service" options={serviceOptions} value={serviceKey} onChange={setServiceKey} />
              <FieldSelect id="post-type" name="post_type" label="Post type" options={postTypeOptions} value={postType} onChange={setPostType} />
              <FieldSelect id="post-status" name="status" label="Visibility" options={statusOptions} value={status} onChange={setStatus} />
              <FieldSelect id="contact-method" name="contact_method" label="Contact" options={contactOptions} value={contactMethod} onChange={setContactMethod} />
            </div>

            <div className="post-field post-field-full">
              <label htmlFor="post-title">Title</label>
              <input id="post-title" name="title" type="text" minLength={4} maxLength={120} placeholder={`${selectedServiceLabel} post title`} required />
              <p className="post-field-hint">Keep this broad enough to work across Tada services, not only marketplace listings.</p>
            </div>

            <div className="post-field post-field-full">
              <label htmlFor="post-body">Description</label>
              <textarea id="post-body" name="body" minLength={20} maxLength={5000} placeholder="Describe what you are offering, requesting, announcing, or organizing." required />
            </div>

            <div className="post-form-grid">
              <div className="post-field">
                <label htmlFor="region-city">City or region</label>
                <input id="region-city" name="region_city" type="text" maxLength={80} placeholder="Auckland" />
              </div>
              <div className="post-field">
                <label htmlFor="region-suburb">Suburb or area</label>
                <input id="region-suburb" name="region_suburb" type="text" maxLength={80} placeholder="Newmarket" />
              </div>
            </div>

            <div className="post-field post-field-full">
              <label htmlFor="post-details">Service-specific details</label>
              <textarea id="post-details" name="details" maxLength={3000} placeholder="Optional details for a future service module, such as salary range, vehicle specs, event time, or item condition." />
              <p className="post-field-hint">Stored as flexible JSON so each future service can evolve without rebuilding Create.</p>
            </div>

            {(message || error) && (
              <p className={`post-create-status ${error ? "is-error" : "is-success"}`} role="status">
                {error ?? message}
              </p>
            )}

            <div className="post-submit-row">
              <p>
                By creating a post, you agree to Tada&apos;s <Link href="#">Terms of Service</Link>.
              </p>
              <button className="post-submit-button" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : status === "published" ? "Create post" : "Save draft"}
              </button>
            </div>
          </form>
        </section>

        <section className="post-ad-tips" aria-label="Create structure">
          <article>
            <i className="fa-solid fa-layer-group" aria-hidden="true" />
            <div>
              <h2>Shared Core</h2>
              <p>Every service starts from title, description, location, status and ownership.</p>
            </div>
          </article>
          <article>
            <i className="fa-solid fa-diagram-project" aria-hidden="true" />
            <div>
              <h2>Service Ready</h2>
              <p>Use service and post type fields to connect jobs, cars, community or market later.</p>
            </div>
          </article>
          <article>
            <i className="fa-solid fa-shield-halved" aria-hidden="true" />
            <div>
              <h2>Owner Protected</h2>
              <p>Posts are saved with row-level security so users can only manage their own work.</p>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
