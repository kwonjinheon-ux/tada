"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { getSubcategories, marketplaceCategories, suggestCategoryFromTitle } from "@/data/marketplace-categories";

type SelectOption = {
  label: string;
  value: string;
};

type PhotoPreview = {
  id: string;
  file: File;
  url: string;
};

const mainCategories: SelectOption[] = marketplaceCategories.map(({ label, value }) => ({ label, value }));

const tradeMethods: SelectOption[] = [
  { label: "Pickup & delivery", value: "pickup_delivery" },
  { label: "Pickup only", value: "pickup" },
  { label: "Delivery only", value: "delivery" },
];

const conditions: SelectOption[] = [
  { label: "Brand new", value: "brand_new" },
  { label: "Like new", value: "like_new" },
  { label: "Good", value: "good" },
  { label: "Fair", value: "fair" },
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

const meetingPlaces: SelectOption[] = [
  { label: "Public location", value: "public" },
  { label: "Pickup from home", value: "home" },
];

const acceptedPhotoTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxPhotoCount = 10;
const maxPhotoSize = 5 * 1024 * 1024;

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
  const photoInputRef = useRef<HTMLInputElement>(null);
  const photosRef = useRef<PhotoPreview[]>([]);
  const editorRef = useRef<HTMLDivElement>(null);
  const [mainCategory, setMainCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [tradeMethod, setTradeMethod] = useState("pickup_delivery");
  const [itemCondition, setItemCondition] = useState("brand_new");
  const [region, setRegion] = useState("");
  const [area, setArea] = useState("");
  const [defaultRegion, setDefaultRegion] = useState("");
  const [defaultArea, setDefaultArea] = useState("");
  const [meetingPlace, setMeetingPlace] = useState("");
  const [photos, setPhotos] = useState<PhotoPreview[]>([]);
  const [primaryPhotoId, setPrimaryPhotoId] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [isDraggingPhotos, setIsDraggingPhotos] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const subCategoryOptions = mainCategory
    ? getSubcategories(mainCategory).map(({ label, value }) => ({ label, value }))
    : marketplaceCategories.flatMap((category) => category.subcategories.map(({ label, value }) => ({ label: `${category.label} - ${label}`, value })));
  const regionOptions = region && !regions.some((option) => option.value === region) ? [...regions, { label: region, value: region }] : regions;
  const areaOptions = area && !areas.some((option) => option.value === area) ? [...areas, { label: area, value: area }] : areas;

  useEffect(() => {
    if (subCategory && !subCategoryOptions.some((option) => option.value === subCategory)) {
      setSubCategory("");
    }
  }, [subCategory, subCategoryOptions]);

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(() => {
    if (!isHtmlMode && editorRef.current && editorRef.current.innerHTML !== description) {
      editorRef.current.innerHTML = description;
    }
  }, [description, isHtmlMode]);

  useEffect(() => {
    return () => {
      photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.url));
    };
  }, []);

  useEffect(() => {
    const loadProfileLocation = async () => {
      const supabase = createBrowserSupabaseClient();
      if (!supabase) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("region_city, region_suburb")
        .eq("id", user.id)
        .maybeSingle();

      const profileRegion = typeof data?.region_city === "string" ? data.region_city.trim() : "";
      const profileArea = typeof data?.region_suburb === "string" ? data.region_suburb.trim() : "";

      if (profileRegion) {
        setDefaultRegion(profileRegion);
        setRegion((current) => current || profileRegion);
      }

      if (profileArea) {
        setDefaultArea(profileArea);
        setArea((current) => current || profileArea);
      }
    };

    void loadProfileLocation();
  }, []);

  const handleTitleChange = (title: string) => {
    const suggestion = suggestCategoryFromTitle(title);
    if (!suggestion) return;

    setMainCategory(suggestion.mainCategory);
    setSubCategory(suggestion.subCategory);
  };

  const addPhotos = (fileList: FileList | File[]) => {
    const incomingFiles = Array.from(fileList);
    const validFiles = incomingFiles.filter((file) => acceptedPhotoTypes.has(file.type) && file.size <= maxPhotoSize);

    if (validFiles.length !== incomingFiles.length) {
      setError("Only PNG, JPG or WebP images up to 5MB can be added.");
    } else {
      setError(null);
    }

    if (!validFiles.length) return;

    setPhotos((currentPhotos) => {
      const availableSlots = maxPhotoCount - currentPhotos.length;
      const nextPhotos = validFiles.slice(0, availableSlots).map((file) => ({
        id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
        file,
        url: URL.createObjectURL(file),
      }));
      const updatedPhotos = [...currentPhotos, ...nextPhotos];

      if (!primaryPhotoId && updatedPhotos[0]) {
        setPrimaryPhotoId(updatedPhotos[0].id);
      }

      if (validFiles.length > availableSlots) {
        setError("You can add up to 10 photos.");
      }

      return updatedPhotos;
    });
  };

  const openPhotoPicker = () => {
    photoInputRef.current?.click();
  };

  const removePhoto = (photoId: string) => {
    const removedPhoto = photos.find((photo) => photo.id === photoId);
    const remainingPhotos = photos.filter((photo) => photo.id !== photoId);

    if (removedPhoto) {
      URL.revokeObjectURL(removedPhoto.url);
    }

    setPhotos(remainingPhotos);
    setPrimaryPhotoId((currentPrimaryPhotoId) =>
      currentPrimaryPhotoId === photoId ? remainingPhotos[0]?.id ?? null : currentPrimaryPhotoId,
    );
  };

  const runEditorCommand = (command: string, value?: string) => {
    if (isHtmlMode || !editorRef.current) return;

    editorRef.current.focus();
    document.execCommand(command, false, value);
    setDescription(editorRef.current.innerHTML);
  };

  const addEditorLink = () => {
    const url = window.prompt("Enter a URL");
    if (!url) return;

    const safeUrl = url.trim();
    if (!/^(https?:\/\/|mailto:)/i.test(safeUrl)) {
      setError("Links must start with http://, https://, or mailto:.");
      return;
    }

    runEditorCommand("createLink", safeUrl);
  };

  const toggleHtmlMode = () => {
    if (!isHtmlMode && editorRef.current) {
      setDescription(editorRef.current.innerHTML);
    }
    setIsHtmlMode((current) => !current);
  };

  const uploadPhotos = async ({
    listingId,
    userId,
  }: {
    listingId: string;
    userId: string;
  }) => {
    const supabase = createBrowserSupabaseClient();
    if (!supabase || !photos.length) return null;

    const rows = [];

    for (const [index, photo] of photos.entries()) {
      const extension = photo.file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/${listingId}/${index + 1}-${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("market-listing-images").upload(path, photo.file, {
        cacheControl: "3600",
        contentType: photo.file.type,
        upsert: false,
      });

      if (uploadError) {
        return uploadError.message;
      }

      rows.push({
        listing_id: listingId,
        owner_id: userId,
        storage_bucket: "market-listing-images",
        storage_path: path,
        original_name: photo.file.name,
        mime_type: photo.file.type,
        size_bytes: photo.file.size,
        display_order: index,
        is_primary: photo.id === primaryPhotoId || (!primaryPhotoId && index === 0),
      });
    }

    const { error: photoInsertError } = await supabase.from("market_listing_photos").insert(rows);
    return photoInsertError?.message ?? null;
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
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

    const form = new FormData(formElement);
    const title = String(form.get("title") ?? "").trim();
    const body = String(form.get("body") ?? "").trim();
    const price = String(form.get("price") ?? "").trim();
    const parsedPrice = Number(price.replace(/[^0-9.]/g, ""));
    const priceCents = Number.isFinite(parsedPrice) && parsedPrice > 0 ? Math.round(parsedPrice * 100) : 0;

    const plainDescription = body.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    if (plainDescription.length < 20 || body.length > 5000) {
      setError("Description must contain 20 to 5,000 characters.");
      setIsSubmitting(false);
      return;
    }

    const { data: createdListing, error: insertError } = await supabase.from("market_listings").insert({
      owner_id: user.id,
      status: "published",
      title,
      description: body,
      category_slug: mainCategory || null,
      subcategory_slug: subCategory || null,
      trade_method: tradeMethod,
      item_condition: itemCondition,
      price_cents: priceCents,
      region_city: region || null,
      region_suburb: area || null,
      meeting_place: meetingPlace || null,
    }).select("id").single();

    if (insertError) {
      setError(insertError.message);
      setIsSubmitting(false);
      return;
    }

    if (createdListing?.id) {
      const photoError = await uploadPhotos({ listingId: createdListing.id, userId: user.id });
      if (photoError) {
        setNotice("Posted successfully. Photos could not be attached yet.");
        setIsSubmitting(false);
        router.push("/market");
        router.refresh();
        return;
      }
    }

    setNotice("Posted successfully.");
    formRef.current?.reset();
    setMainCategory("");
    setSubCategory("");
    setTradeMethod("pickup_delivery");
    setItemCondition("brand_new");
    setRegion(defaultRegion);
    setArea(defaultArea);
    setMeetingPlace("");
    setDescription("");
    setIsHtmlMode(false);
    photos.forEach((photo) => URL.revokeObjectURL(photo.url));
    setPhotos([]);
    setPrimaryPhotoId(null);
    setIsSubmitting(false);
    router.push("/market");
    router.refresh();
  };

  return (
    <main className="post-ad-page">
      <div className="post-ad-layout">
        <section className="post-ad-card" aria-label="Create a new marketplace listing">
          <form ref={formRef} className="post-ad-form" onSubmit={submit}>
            <div className="post-field post-field-full">
              <label htmlFor="post-title">Listing Title</label>
              <input id="post-title" name="title" type="text" minLength={4} maxLength={120} placeholder="e.g. iPhone 15 Pro Max - 256GB Titanium" onChange={(event) => handleTitleChange(event.target.value)} required />
              <p className="post-field-hint">Your category will be automatically suggested based on the listing title.</p>
            </div>

            <div className="post-form-grid post-form-grid-four">
              <CustomSelect id="main-category" name="main_category" label="Main Category" icon="fa-layer-group" placeholder="Select main category" options={mainCategories} value={mainCategory} onChange={setMainCategory} />
              <CustomSelect id="sub-category" name="sub_category" label="Sub Category" icon="fa-tags" placeholder="Select sub category" options={subCategoryOptions} value={subCategory} onChange={setSubCategory} />
              <CustomSelect id="trade-method" name="trade_method" label="Trade Method" icon="fa-truck-fast" placeholder="Pickup & delivery" options={tradeMethods} value={tradeMethod} onChange={setTradeMethod} />
              <CustomSelect id="item-condition" name="item_condition" label="Item Condition" icon="fa-certificate" placeholder="Brand new" options={conditions} value={itemCondition} onChange={setItemCondition} />
            </div>

            <fieldset
              className={`photo-fieldset ${isDraggingPhotos ? "is-dragging" : ""}`}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDraggingPhotos(true);
              }}
              onDragLeave={() => setIsDraggingPhotos(false)}
              onDrop={(event) => {
                event.preventDefault();
                setIsDraggingPhotos(false);
                addPhotos(event.dataTransfer.files);
              }}
            >
              <div className="field-label-row">
                <legend>Photos</legend>
                <span>Up to 10 photos</span>
              </div>
              <input
                ref={photoInputRef}
                className="post-photo-input"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                onChange={(event) => {
                  if (event.target.files) {
                    addPhotos(event.target.files);
                    event.target.value = "";
                  }
                }}
              />
              <div className="post-photo-grid">
                {photos.map((photo, index) => (
                    <div className="post-photo-card" key={photo.id}>
                      <button className={`post-photo-slot ${photo.id === primaryPhotoId || (!primaryPhotoId && index === 0) ? "is-main" : ""}`} type="button" aria-label="Use this photo as main thumbnail" onClick={() => setPrimaryPhotoId(photo.id)}>
                        <img src={photo.url} alt={photo.file.name} />
                        {(photo.id === primaryPhotoId || (!primaryPhotoId && index === 0)) && <span>Main</span>}
                      </button>
                      <button className="post-photo-remove" type="button" aria-label={`Remove ${photo.file.name}`} onClick={() => removePhoto(photo.id)}>
                        <i className="fa-solid fa-xmark" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                {Array.from({ length: photos.length ? Math.min(2, Math.max(0, maxPhotoCount - photos.length)) : 1 }).map((_, index) => (
                  <button className={`post-photo-upload ${photos.length ? "" : "is-initial"}`} key={`upload-${index}`} type="button" aria-label={index === 0 ? "Add a photo" : "Add another photo"} onClick={openPhotoPicker}>
                    <i className="fa-solid fa-camera" aria-hidden="true" />
                    <span>Add</span>
                  </button>
                ))}
              </div>
              <p className="post-upload-hint">
                <strong>Click to upload or drag and drop multiple photos at once</strong>
                <span>PNG, JPG or WebP (max. 5MB per image)</span>
              </p>
            </fieldset>

            <div className="post-field post-field-full">
              <label htmlFor="post-description">Description</label>
              <div className="post-editor">
                <div className="post-editor-toolbar" aria-label="Description formatting">
                  <button type="button" aria-label="Undo" title="Undo" onMouseDown={(event) => event.preventDefault()} onClick={() => runEditorCommand("undo")}><i className="fa-solid fa-rotate-left" aria-hidden="true" /></button>
                  <button type="button" aria-label="Redo" title="Redo" onMouseDown={(event) => event.preventDefault()} onClick={() => runEditorCommand("redo")}><i className="fa-solid fa-rotate-right" aria-hidden="true" /></button>
                  <select aria-label="Text style" title="Text style" defaultValue="p" disabled={isHtmlMode} onChange={(event) => runEditorCommand("formatBlock", `<${event.target.value}>`)}>
                    <option value="p">Paragraph</option>
                    <option value="h2">Heading</option>
                    <option value="h3">Subheading</option>
                    <option value="blockquote">Quote</option>
                  </select>
                  <span className="post-editor-divider" aria-hidden="true" />
                  <button type="button" aria-label="Bold" title="Bold" onMouseDown={(event) => event.preventDefault()} onClick={() => runEditorCommand("bold")}><strong>B</strong></button>
                  <button type="button" aria-label="Italic" title="Italic" onMouseDown={(event) => event.preventDefault()} onClick={() => runEditorCommand("italic")}><em>I</em></button>
                  <button type="button" aria-label="Underline" title="Underline" onMouseDown={(event) => event.preventDefault()} onClick={() => runEditorCommand("underline")}><u>U</u></button>
                  <button type="button" aria-label="Strikethrough" title="Strikethrough" onMouseDown={(event) => event.preventDefault()} onClick={() => runEditorCommand("strikeThrough")}><s>S</s></button>
                  <span className="post-editor-divider" aria-hidden="true" />
                  <button type="button" aria-label="Bulleted list" title="Bulleted list" onMouseDown={(event) => event.preventDefault()} onClick={() => runEditorCommand("insertUnorderedList")}><i className="fa-solid fa-list" aria-hidden="true" /></button>
                  <button type="button" aria-label="Numbered list" title="Numbered list" onMouseDown={(event) => event.preventDefault()} onClick={() => runEditorCommand("insertOrderedList")}><i className="fa-solid fa-list-ol" aria-hidden="true" /></button>
                  <button type="button" aria-label="Insert link" title="Insert link" onMouseDown={(event) => event.preventDefault()} onClick={addEditorLink}><i className="fa-solid fa-link" aria-hidden="true" /></button>
                  <button type="button" aria-label="Remove formatting" title="Remove formatting" onMouseDown={(event) => event.preventDefault()} onClick={() => runEditorCommand("removeFormat")}><i className="fa-solid fa-eraser" aria-hidden="true" /></button>
                  <span className="post-editor-divider" aria-hidden="true" />
                  <button className={isHtmlMode ? "is-active" : ""} type="button" aria-label="Edit HTML source" title="Edit HTML source" onClick={toggleHtmlMode}><i className="fa-solid fa-code" aria-hidden="true" /></button>
                </div>
                <input type="hidden" name="body" value={description} />
                {isHtmlMode ? (
                  <textarea className="post-editor-source" id="post-description" value={description} onChange={(event) => setDescription(event.target.value)} spellCheck={false} aria-label="HTML source" />
                ) : (
                  <div ref={editorRef} id="post-description" className="post-editor-content" contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" data-placeholder="Tell buyers about your item's condition, features, and why you're selling..." onInput={(event) => setDescription(event.currentTarget.innerHTML)} />
                )}
              </div>
            </div>

            <div className="post-field post-field-full">
              <label htmlFor="listing-price">Price (NZD)</label>
              <div className="post-price-input">
                <span>$</span>
                <input id="listing-price" name="price" type="text" inputMode="decimal" placeholder="0.00" />
              </div>
            </div>

            <div className="post-form-grid post-location-grid">
              <CustomSelect id="listing-region" name="region_city" label="Region" icon="fa-location-dot" placeholder="Select region" options={regionOptions} value={region} onChange={setRegion} />
              <CustomSelect id="listing-area" name="region_suburb" label="Area" icon="fa-map-pin" placeholder="Select area" options={areaOptions} value={area} onChange={setArea} />
              <CustomSelect id="meeting-place" name="meeting_place" label="Meeting Place" icon="fa-building" placeholder="Select a safe meeting place" options={meetingPlaces} value={meetingPlace} onChange={setMeetingPlace} />
            </div>

            {(notice || error) && (
              <p className={`post-create-status ${error ? "is-error" : "is-success"}`} role="status">
                {error ?? notice}
              </p>
            )}

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
