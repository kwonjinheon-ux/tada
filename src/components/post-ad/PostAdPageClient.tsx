"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";

type SelectOption = {
  label: string;
  value: string;
};

const mainCategories: SelectOption[] = [
  { label: "Electronics", value: "electronics" },
  { label: "Home & Furniture", value: "home-furniture" },
  { label: "Clothing", value: "clothing" },
  { label: "Entertainment", value: "entertainment" },
];

const subCategories: SelectOption[] = [
  { label: "Computers", value: "computers" },
  { label: "Smartphones", value: "smartphones" },
  { label: "Audio", value: "audio" },
  { label: "Cameras", value: "cameras" },
];

const tradeMethods: SelectOption[] = [
  { label: "Pickup & delivery", value: "pickup-delivery" },
  { label: "Pickup only", value: "pickup" },
  { label: "Delivery only", value: "delivery" },
];

const conditions: SelectOption[] = [
  { label: "Brand new", value: "brand-new" },
  { label: "Like new", value: "like-new" },
  { label: "Good", value: "good" },
  { label: "Fair", value: "fair" },
];

const regions: SelectOption[] = [
  { label: "Auckland", value: "auckland" },
  { label: "Wellington", value: "wellington" },
  { label: "Canterbury", value: "canterbury" },
];

const areas: SelectOption[] = [
  { label: "CBD", value: "cbd" },
  { label: "North Shore", value: "north-shore" },
  { label: "Mount Eden", value: "mount-eden" },
  { label: "Newmarket", value: "newmarket" },
];

const meetingPlaces: SelectOption[] = [
  { label: "Public location", value: "public" },
  { label: "Pickup from home", value: "home" },
];

function CustomSelect({
  id,
  label,
  icon,
  placeholder,
  options,
  defaultValue,
}: {
  id: string;
  label: string;
  icon: string;
  placeholder: string;
  options: SelectOption[];
  defaultValue?: string;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState(defaultValue ?? "");
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
        <select id={id} value={value} onChange={(event) => setValue(event.target.value)}>
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
              setValue("");
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
                setValue(option.value);
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    window.setTimeout(() => setIsSubmitting(false), 600);
  };

  return (
    <main className="post-ad-page">
      <div className="post-ad-layout">
        <section className="post-ad-card" aria-label="Create a new marketplace listing">
          <form className="post-ad-form" action="#" onSubmit={submit}>
            <div className="post-field post-field-full">
              <label htmlFor="listing-title">Listing Title</label>
              <input id="listing-title" type="text" placeholder="e.g. iPhone 15 Pro Max - 256GB Titanium" />
              <p className="post-field-hint">Your category will be automatically suggested based on the listing title.</p>
            </div>

            <div className="post-form-grid post-form-grid-four">
              <CustomSelect id="main-category" label="Main Category" icon="fa-layer-group" placeholder="Select main category" options={mainCategories} />
              <CustomSelect id="sub-category" label="Sub Category" icon="fa-tags" placeholder="Select sub category" options={subCategories} />
              <CustomSelect id="trade-method" label="Trade Method" icon="fa-truck-fast" placeholder="Pickup & delivery" options={tradeMethods} defaultValue="pickup-delivery" />
              <CustomSelect id="item-condition" label="Item Condition" icon="fa-certificate" placeholder="Brand new" options={conditions} defaultValue="brand-new" />
            </div>

            <fieldset className="photo-fieldset">
              <div className="field-label-row">
                <legend>Photos</legend>
                <span>Up to 10 photos</span>
              </div>
              <div className="post-photo-grid">
                <div className="post-photo-slot is-main">
                  <img src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80" alt="Smart watch listing photo" />
                  <span>Main</span>
                </div>
                <div className="post-photo-slot">
                  <img src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80" alt="Headphones listing photo" />
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
                <strong>Click to upload or drag and drop</strong>
                <span>PNG, JPG or WebP (max. 5MB per image)</span>
              </p>
            </fieldset>

            <div className="post-field post-field-full">
              <label htmlFor="listing-description">Description</label>
              <div className="post-editor">
                <div className="post-editor-toolbar" aria-label="Description formatting">
                  <button type="button" aria-label="Bold"><strong>B</strong></button>
                  <button type="button" aria-label="Italic"><em>I</em></button>
                  <button type="button" aria-label="Underline"><u>U</u></button>
                  <button type="button" aria-label="Bulleted list"><i className="fa-solid fa-list" aria-hidden="true" /></button>
                  <button type="button" aria-label="Insert link"><i className="fa-solid fa-link" aria-hidden="true" /></button>
                  <button type="button" aria-label="Insert image"><i className="fa-regular fa-image" aria-hidden="true" /></button>
                </div>
                <textarea id="listing-description" placeholder="Tell buyers about your item's condition, features, and why you're selling..." />
              </div>
            </div>

            <div className="post-field post-field-full">
              <label htmlFor="listing-price">Price (NZD)</label>
              <div className="post-price-input">
                <span>$</span>
                <input id="listing-price" type="text" inputMode="decimal" placeholder="0.00" />
              </div>
            </div>

            <div className="post-form-grid post-location-grid">
              <CustomSelect id="listing-region" label="Region" icon="fa-location-dot" placeholder="Select region" options={regions} />
              <CustomSelect id="listing-area" label="Area" icon="fa-map-pin" placeholder="Select area" options={areas} />
              <CustomSelect id="meeting-place" label="Meeting Place" icon="fa-building" placeholder="Select a safe meeting place" options={meetingPlaces} />
            </div>

            <div className="post-submit-row">
              <p>By posting, you agree to our <Link href="#">Terms of Service</Link>.</p>
              <button className="post-submit-button" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Posting..." : "Post Now"}
              </button>
            </div>
          </form>
        </section>

        <section className="post-ad-tips" aria-label="Posting tips">
          <article><i className="fa-regular fa-lightbulb" aria-hidden="true" /><div><h2>Good Photos</h2><p>Take photos in bright, natural light from multiple angles.</p></div></article>
          <article><i className="fa-regular fa-circle-check" aria-hidden="true" /><div><h2>Clear Pricing</h2><p>Research similar items to set a competitive price.</p></div></article>
          <article><i className="fa-solid fa-shield-halved" aria-hidden="true" /><div><h2>Safety First</h2><p>Meet in public places and use secure payment methods.</p></div></article>
        </section>
      </div>
    </main>
  );
}

