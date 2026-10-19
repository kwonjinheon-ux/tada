"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PostShopTypeSelector } from "@/components/post-ad/PostShopTypeSelector";
import { MarketFilterSidebar } from "@/components/market/MarketFilterSidebar";
import { type ShopTypeValue } from "@/data/postShopTypes";
import { z } from "zod";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { readApiResponse } from "@/lib/api/client";
import { useLanguage } from "@/components/LanguageProvider";
import { getMarketCategoryLabel, getMarketOptionLabel, localiseOptions } from "@/lib/market/category-label";
import { isAcceptedMarketListingImage, marketListingImagePolicy, normalizeMarketListingImage } from "@/lib/media/market-listing-image";
import { getSubcategories, marketplaceCategories, suggestCategoryFromTitle } from "@/data/marketplace-categories";
import { prohibitedMarketplaceItemsMessage, violatesMarketplaceProhibitedItemsPolicy } from "@/lib/market/prohibited-items";
import { AiListingGenerator } from "@/components/post-ad/AiListingGenerator";
import { ListingLocationSelector } from "@/components/market/ListingLocationSelector";
import type { MainLocation } from "@/data/nzLocations";
import { findMainLocation, findSubLocation } from "@/lib/market/nz-location";
import { SelectMenu, type SelectMenuOption } from "@/components/ui/SelectMenu";
import { appendUnconfirmedDetails } from "@/lib/market/unconfirmed-details";
import { MarketListingPreview } from "@/components/post-ad/MarketListingPreview";
import type { Listing } from "@/data/listings";
import { BargainSaleItemsEditor, type BargainSaleItemDraft } from "@/components/bargain/BargainSaleItemsEditor";
import { BargainSaleCoverPreview } from "@/components/bargain/BargainSaleCoverPreview";
import { PostSubmitButton } from "@/components/post-ad/PostSubmitButton";
import { bargainListingTypes, getBargainTypeMaximumPrice, isMultiItemBargain, type BargainListingType } from "@/lib/bargain/listing-types";

type SelectOption = SelectMenuOption;

type ImportedCategoryKeyword = {
  keyword: string;
  tadaCategory: string;
};

export type PhotoPreview = {
  id: string;
  url: string;
  file?: File;
  name?: string;
  isExisting?: boolean;
  draftPath?: string;
};

export type EditableListingPhoto = {
  id: string;
  url: string;
  name: string;
  isPrimary: boolean;
};

export type EditableListingInitialValues = {
  id: string;
  title: string;
  description: string;
  priceCents: number;
  mainCategory: string;
  subCategory: string;
  tradeMethod: "pickup_delivery" | "pickup" | "delivery";
  itemCondition: "brand_new" | "like_new" | "excellent" | "good" | "fair";
  region: string;
  area: string;
  locality?: string | null;
  rawSuburb?: string | null;
  locationRegion?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  meetingPlace: string;
  photos: EditableListingPhoto[];
  /** Bargain edits retain their original deal type and database domain. */
  bargainType?: BargainListingType;
};

type SmartphoneSpecs = {
  brand: string;
  model: string;
  storage: string;
  memory: string;
  colour: string;
  lcdScratch: string;
};

const mainCategories: SelectOption[] = marketplaceCategories.map(({ label, value }) => ({ label, value }));

const bargainItemDescriptionsResponseSchema = z.object({
  items: z.array(z.object({ id: z.string(), title: z.string(), categorySlug: z.string(), description: z.string() })),
});

const tradeMethods: SelectOption[] = [
  { label: "Pickup & delivery", value: "pickup_delivery" },
  { label: "Pickup only", value: "pickup" },
  { label: "Delivery only", value: "delivery" },
];

const conditions: SelectOption[] = [
  { label: "Brand new", value: "brand_new" },
  { label: "Like new", value: "like_new" },
  { label: "Excellent", value: "excellent" },
  { label: "Good", value: "good" },
  { label: "Fair", value: "fair" },
];

const meetingPlaces: SelectOption[] = [
  { label: "Public location", value: "public" },
  { label: "Pickup from home", value: "home" },
];

const dollarShopTierValues: BargainListingType[] = ["2-dollar-deals", "5-dollar-deals", "10-dollar-deals"];

const maxPhotoCount = marketListingImagePolicy.maxCount;
const maxEventInventoryPhotoCount = 10;
const editorColors = [
  { label: "Charcoal", value: "#314254" },
  { label: "Red", value: "#dc2626" },
  { label: "Orange", value: "#d97706" },
  { label: "Green", value: "#00875a" },
  { label: "Blue", value: "#2563eb" },
];
const emptySmartphoneSpecs: SmartphoneSpecs = {
  brand: "",
  model: "",
  storage: "",
  memory: "",
  colour: "",
  lcdScratch: "",
};
const smartphoneScratchOptions: SelectOption[] = [
  { label: "No visible scratches", value: "No visible scratches" },
  { label: "Light scratches", value: "Light scratches" },
  { label: "Deep scratches", value: "Deep scratches" },
  { label: "Cracked or damaged", value: "Cracked or damaged" },
  { label: "Not checked", value: "Not checked" },
];
const smartphoneSpecLabels: Array<{ key: keyof SmartphoneSpecs; label: string }> = [
  { key: "brand", label: "Brand" },
  { key: "model", label: "Model" },
  { key: "storage", label: "Storage / HDD capacity" },
  { key: "memory", label: "Memory" },
  { key: "colour", label: "Colour" },
  { key: "lcdScratch", label: "LCD scratch" },
];

function aiDescriptionToHtml(description: string) {
  return description
    .trim()
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br />")}</p>`)
    .join("");
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function smartphoneSpecsToHtml(specs: SmartphoneSpecs) {
  const rows = smartphoneSpecLabels
    .map(({ key, label }) => ({ label, value: specs[key].trim() }))
    .filter(({ value }) => value.length > 0);

  if (!rows.length) return "";

  return [
    "<p><strong>Smartphone details</strong></p>",
    `<p>${rows.map(({ label, value }) => `<strong>${label}:</strong> ${escapeHtml(value)}`).join("<br />")}</p>`,
  ].join("");
}

function appendSmartphoneSpecs(description: string, specs: SmartphoneSpecs) {
  const specsHtml = smartphoneSpecsToHtml(specs);
  if (!specsHtml) return description;
  return `${description}${description ? "<br />" : ""}${specsHtml}`;
}


export function PostAdPageClient({ initialListing, listingSpace = "market", initialShopType }: { initialListing?: EditableListingInitialValues; listingSpace?: "market" | "bargain"; initialShopType?: ShopTypeValue }) {
  const router = useRouter();
  const { locale } = useLanguage();
  const say = (en: string, ko: string) => (locale === "ko" ? ko : en);
  // Stored values stay English; only what the seller reads is translated.
  const conditionOptions = localiseOptions(conditions, locale);
  const tradeMethodOptions = localiseOptions(tradeMethods, locale);
  const meetingPlaceOptions = localiseOptions(meetingPlaces, locale);
  const scratchOptions = localiseOptions(smartphoneScratchOptions, locale);
  const colorOptions = localiseOptions(editorColors, locale);
  const specLabels = smartphoneSpecLabels.map(({ key, label }) => ({ key, label: getMarketOptionLabel(label, locale) }));
  const mainCategoryOptions = mainCategories.map(({ label, value }) => ({ label: getMarketCategoryLabel(label, locale), value }));
  const isEditing = Boolean(initialListing);
  const [activeSpace, setActiveSpace] = useState<"market" | "bargain">(listingSpace);
  const isBargainListing = isEditing ? listingSpace === "bargain" : activeSpace === "bargain";
  const listingTable = isBargainListing ? "bargain_listings" : "market_listings";
  const photoTable = isBargainListing ? "bargain_listing_photos" : "market_listing_photos";
  const imageBucket = isBargainListing ? "bargain-listing-images" : "market-listing-images";
  const listingHomePath = "/market";
  const formRef = useRef<HTMLFormElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const photoPickerIntentRef = useRef<"listing" | "cover" | "inventory">("listing");
  const photosRef = useRef<PhotoPreview[]>([]);
  const generatedItemPhotoSignatureRef = useRef("");
  const editorRef = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState(initialListing?.title ?? "");
  const [bargainType, setBargainType] = useState<BargainListingType>(() => initialListing?.bargainType ?? (isBargainListing ? "garage-sale" : "2-dollar-deals"));
  const [bargainSaleItems, setBargainSaleItems] = useState<BargainSaleItemDraft[]>([]);
  const [eventStartDate, setEventStartDate] = useState("");
  const [eventEndDate, setEventEndDate] = useState("");
  const [eventStartTime, setEventStartTime] = useState("08:00");
  const [eventEndTime, setEventEndTime] = useState("16:00");
  const [eventAddress, setEventAddress] = useState("");
  const [price, setPrice] = useState(initialListing ? (initialListing.priceCents / 100).toFixed(initialListing.priceCents % 100 ? 2 : 0) : "");
  const [mainCategory, setMainCategory] = useState(initialListing?.mainCategory ?? "");
  const [subCategory, setSubCategory] = useState(initialListing?.subCategory ?? "");
  const [tradeMethod, setTradeMethod] = useState<string>(initialListing?.tradeMethod ?? "pickup_delivery");
  const [itemCondition, setItemCondition] = useState<string>(initialListing?.itemCondition ?? "brand_new");
  const [location, setLocation] = useState(() => ({
    mainLocation: (findMainLocation(initialListing?.region) ?? "") as MainLocation | "",
    subLocation: initialListing?.area ?? "",
    locality: initialListing?.locality ?? null,
    rawSuburb: initialListing?.rawSuburb ?? null,
    region: initialListing?.locationRegion ?? null,
    latitude: initialListing?.latitude ?? null,
    longitude: initialListing?.longitude ?? null,
  }));
  const [defaultLocation, setDefaultLocation] = useState(() => ({ mainLocation: "" as MainLocation | "", subLocation: "", locality: null, rawSuburb: null, region: null, latitude: null, longitude: null }));
  const [meetingPlace, setMeetingPlace] = useState(initialListing?.meetingPlace ?? "");
  const [photos, setPhotos] = useState<PhotoPreview[]>(() => initialListing?.photos.map((photo) => ({ id: photo.id, url: photo.url, name: photo.name, isExisting: true })) ?? []);
  const [primaryPhotoId, setPrimaryPhotoId] = useState<string | null>(() => initialListing?.photos.find((photo) => photo.isPrimary)?.id ?? initialListing?.photos[0]?.id ?? null);
  const [removedPhotoIds, setRemovedPhotoIds] = useState<string[]>([]);
  const [description, setDescription] = useState(initialListing?.description ?? "");
  const [aiDraftState, setAiDraftState] = useState<{ html: string; points: string[] } | null>(null);
  const [smartphoneSpecs, setSmartphoneSpecs] = useState<SmartphoneSpecs>(emptySmartphoneSpecs);
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [textColor, setTextColor] = useState("#314254");
  const [isDraggingPhotos, setIsDraggingPhotos] = useState(false);
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingItemDescriptions, setIsGeneratingItemDescriptions] = useState(false);
  const [itemDescriptionProgress, setItemDescriptionProgress] = useState(0);
  const [itemDescriptionError, setItemDescriptionError] = useState<string | null>(null);
  const [importedCategoryKeywords, setImportedCategoryKeywords] = useState<ImportedCategoryKeyword[]>([]);
  const subCategoryOptions = mainCategory
    ? getSubcategories(mainCategory).map(({ label, value }) => ({ label: getMarketCategoryLabel(label, locale), value }))
    : marketplaceCategories.flatMap((category) => category.subcategories.map(({ label, value }) => ({ label: `${getMarketCategoryLabel(category.label, locale)} - ${getMarketCategoryLabel(label, locale)}`, value })));
  const shouldShowSmartphoneTemplate = mainCategory === "mobile-phones-tablets" && subCategory === "mobile-phones";
  const isMultiItemSale = isBargainListing && isMultiItemBargain(bargainType);
  const fixedBargainPriceCents = isBargainListing ? getBargainTypeMaximumPrice(bargainType) : null;
  // A sale cover is presentation-only. GPT generates details for each item
  // photo added after it.
  const maxPhotosForCurrentListing = isMultiItemSale ? maxEventInventoryPhotoCount + 1 : maxPhotoCount;
  const eventInventoryPhotos = useMemo(() => isMultiItemSale ? photos.slice(1) : [], [isMultiItemSale, photos]);

  useEffect(() => {
    if (subCategory && !subCategoryOptions.some((option) => option.value === subCategory)) {
      setSubCategory("");
    }
  }, [subCategory, subCategoryOptions]);

  useEffect(() => {
    let isCurrent = true;

    const loadImportedCategories = async () => {
      try {
        const response = await fetch("/api/market/categories/trademe");
        if (!response.ok) return;
        const payload = (await response.json()) as { categories?: ImportedCategoryKeyword[] };
        if (isCurrent && Array.isArray(payload.categories)) setImportedCategoryKeywords(payload.categories);
      } catch {
        // The existing Tada dictionary remains available if the public catalogue is unavailable.
      }
    };

    void loadImportedCategories();
    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(() => {
    if (!isMultiItemSale) {
      setBargainSaleItems([]);
      return;
    }
    setBargainSaleItems((current) => photos.slice(1).map((photo) => current.find((item) => item.photoId === photo.id) ?? { photoId: photo.id, title: "", category: "", price: "", description: "" }));
  }, [isMultiItemSale, photos]);

  useEffect(() => {
    if (!isHtmlMode && editorRef.current && editorRef.current.innerHTML !== description) {
      editorRef.current.innerHTML = description;
    }
  }, [description, isHtmlMode]);

  useEffect(() => {
    const cleanupDraftPhotos = () => {
      const draftPaths = photosRef.current.flatMap((photo) => photo.draftPath ? [photo.draftPath] : []);
      if (draftPaths.length) {
        const supabase = createBrowserSupabaseClient();
        void supabase?.storage.from(imageBucket).remove(draftPaths);
      }
    };
    window.addEventListener("pagehide", cleanupDraftPhotos);
    return () => {
      window.removeEventListener("pagehide", cleanupDraftPhotos);
      cleanupDraftPhotos();
      photosRef.current.forEach((photo) => {
        if (photo.file) URL.revokeObjectURL(photo.url);
      });
    };
  }, [imageBucket]);

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

      const mainLocation = findMainLocation(profileRegion);
      if (!mainLocation) return;
      const profileLocation = { mainLocation, subLocation: findSubLocation(mainLocation, profileArea) ?? "", locality: null, rawSuburb: null, region: null, latitude: null, longitude: null };
      setDefaultLocation(profileLocation);
      setLocation((current) => current.mainLocation ? current : profileLocation);
    };

    void loadProfileLocation();
  }, []);

  useEffect(() => {
    if (!isGeneratingItemDescriptions) {
      setItemDescriptionProgress(0);
      return;
    }

    setItemDescriptionProgress(10);
    const timer = window.setInterval(() => setItemDescriptionProgress((current) => Math.min(92, current + Math.max(2, Math.ceil((92 - current) * 0.16)))), 900);
    return () => window.clearInterval(timer);
  }, [isGeneratingItemDescriptions]);

  const handleTitleChange = (nextTitle: string) => {
    setTitle(nextTitle);

    if (isMultiItemSale) return;

    if (!nextTitle.trim()) {
      setMainCategory(initialListing?.mainCategory ?? "");
      setSubCategory(initialListing?.subCategory ?? "");
      return;
    }

    const suggestion = suggestCategoryFromTitle(nextTitle);
    if (suggestion) {
      setMainCategory(suggestion.mainCategory);
      setSubCategory(suggestion.subCategory);
      return;
    }

    const normalizedTitle = nextTitle.trim().toLocaleLowerCase();
    const importedSuggestion = importedCategoryKeywords
      .map((category) => ({ ...category, normalizedKeyword: category.keyword.trim().toLocaleLowerCase() }))
      .filter(({ normalizedKeyword }) => normalizedKeyword.length >= 3 && normalizedTitle.includes(normalizedKeyword))
      .sort((left, right) => right.normalizedKeyword.length - left.normalizedKeyword.length)[0];

    if (importedSuggestion) {
      setMainCategory(importedSuggestion.tadaCategory);
      setSubCategory("");
    }
  };

  const updateSmartphoneSpec = (key: keyof SmartphoneSpecs, value: string) => {
    setSmartphoneSpecs((current) => ({ ...current, [key]: value }));
  };

  const uploadDraftPhotos = async (nextPhotos: Array<PhotoPreview & { file: File }>) => {
    const supabase = createBrowserSupabaseClient();
    if (!supabase || !nextPhotos.length) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Please sign in before adding photos.");
      return;
    }

    setIsProcessingPhotos(true);
    setNotice("Your images are being processed and saved securely.");
    const results = await Promise.all(nextPhotos.map(async (photo) => {
      const extension = photo.file.name.split(".").pop()?.toLowerCase() || "jpg";
      const draftPath = `${user.id}/drafts/${photo.id}.${extension}`;
      const { error: uploadError } = await supabase.storage.from(imageBucket).upload(draftPath, photo.file, {
        cacheControl: "3600",
        contentType: photo.file.type,
        upsert: false,
      });
      if (uploadError) return { photoId: photo.id, error: uploadError.message };
      if (!photosRef.current.some((currentPhoto) => currentPhoto.id === photo.id)) {
        await supabase.storage.from(imageBucket).remove([draftPath]);
        return { photoId: photo.id, error: null };
      }
      return { photoId: photo.id, draftPath, error: null };
    }));
    setIsProcessingPhotos(false);
    const uploadError = results.map((result) => result.error).find(Boolean);
    if (uploadError) {
      setError(`Some photos could not be prepared: ${uploadError}`);
      setNotice(null);
      return;
    }
    const draftPathsByPhotoId = new Map(results.flatMap((result) => result.draftPath ? [[result.photoId, result.draftPath] as const] : []));
    setPhotos((current) => current.map((photo) => {
      const draftPath = draftPathsByPhotoId.get(photo.id);
      return draftPath ? { ...photo, draftPath } : photo;
    }));
    setNotice("Photos are ready and will be attached instantly when you post.");
  };

  const addPhotos = async (fileList: FileList | File[], intent: "listing" | "cover" | "inventory" = "listing") => {
    const incomingFiles = Array.from(fileList);
    const validFiles = incomingFiles.filter(isAcceptedMarketListingImage);

    if (validFiles.length !== incomingFiles.length) {
      setError("Only PNG, JPG or WebP images up to 5MB can be added.");
    } else {
      setError(null);
    }

    if (!validFiles.length) return;

    let normalizedFiles: File[];
    try {
      normalizedFiles = await Promise.all(validFiles.map(normalizeMarketListingImage));
    } catch {
      setError("One or more images could not be prepared. Please try another file.");
      return;
    }

    const currentPhotos = photosRef.current;
    const isCoverUpload = isMultiItemSale && intent === "cover";
    const isInventoryUpload = isMultiItemSale && intent === "inventory";

    if (isCoverUpload && currentPhotos[0]) {
      setNotice("Your cover photo is already set. Remove it to choose another one.");
      return;
    }

    if (isInventoryUpload && !currentPhotos[0]) {
      setError("Add a cover photo before adding inventory items.");
      return;
    }

    // In a sale, a multi-file first upload has a predictable split: the first
    // image is the cover and every remaining image becomes an item for GPT.
    const availableSlots = isCoverUpload
      ? maxPhotosForCurrentListing - currentPhotos.length
      : isInventoryUpload
        ? Math.max(0, maxEventInventoryPhotoCount - Math.max(0, currentPhotos.length - 1))
        : maxPhotosForCurrentListing - currentPhotos.length;
    const addedPhotos = normalizedFiles.slice(0, availableSlots).map((file) => ({
      id: crypto.randomUUID(),
      file,
      url: URL.createObjectURL(file),
      name: file.name,
    }));
    const updatedPhotos = [...currentPhotos, ...addedPhotos];
    photosRef.current = updatedPhotos;
    setPhotos(updatedPhotos);

    if (!primaryPhotoId && updatedPhotos[0]) {
      setPrimaryPhotoId(updatedPhotos[0].id);
    }

    if (normalizedFiles.length > availableSlots) {
      setError(isMultiItemSale ? "You can add one cover photo and up to 10 inventory item photos." : "You can add up to 10 photos.");
    }
    if (addedPhotos.length) void uploadDraftPhotos(addedPhotos);
  };

  const openPhotoPicker = (intent: "listing" | "cover" | "inventory" = "listing") => {
    photoPickerIntentRef.current = intent;
    photoInputRef.current?.click();
  };

  const removePhoto = (photoId: string) => {
    const removedPhoto = photos.find((photo) => photo.id === photoId);
    const remainingPhotos = photos.filter((photo) => photo.id !== photoId);

    if (removedPhoto?.file) {
      URL.revokeObjectURL(removedPhoto.url);
    }
    if (removedPhoto?.draftPath) {
      const supabase = createBrowserSupabaseClient();
      void supabase?.storage.from(imageBucket).remove([removedPhoto.draftPath]);
    }

    if (removedPhoto?.isExisting) {
      setRemovedPhotoIds((current) => [...current, photoId]);
    }

    photosRef.current = remainingPhotos;
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
    const url = window.prompt(say("Enter a URL", "링크 주소를 입력하세요"));
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

  // Remember exactly what the draft put in the box. If the seller posts it back
  // untouched, they never answered the AI's questions, so those points travel on
  // to the buyer instead of being quietly dropped.
  const useAiDraft = (draft: string, _mode: "replace", sellerConfirmation: string[]) => {
    const html = aiDescriptionToHtml(draft);
    setDescription(html);
    setAiDraftState({ html, points: sellerConfirmation });
  };

  const uploadPhotos = async ({
    listingId,
    supabase,
    userId,
    onProgress,
  }: {
    listingId: string;
    supabase: NonNullable<ReturnType<typeof createBrowserSupabaseClient>>;
    userId: string;
    onProgress: (completedCount: number, totalCount: number) => void;
  }) => {
    const uploadablePhotos = photos.filter((photo): photo is PhotoPreview & { file: File } => Boolean(photo.file));
    if (!supabase || !uploadablePhotos.length) return { error: null, photoIds: new Map<string, string>() };

    let completedCount = 0;
    const rows = uploadablePhotos.map((photo, index) => {
      const extension = photo.file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/${listingId}/${index + 1}-${crypto.randomUUID()}.${extension}`;

      return {
        id: photo.id,
        listing_id: listingId,
        owner_id: userId,
        storage_bucket: imageBucket,
        storage_path: path,
        original_name: photo.file.name,
        mime_type: photo.file.type,
        size_bytes: photo.file.size,
        display_order: index,
        is_primary: !isEditing && (photo.id === primaryPhotoId || (!primaryPhotoId && index === 0)),
      };
    });

    const uploadResults = await Promise.all(
      uploadablePhotos.map(async (photo, index) => {
        const { error: uploadError } = photo.draftPath
          ? await supabase.storage.from(imageBucket).move(photo.draftPath, rows[index].storage_path)
          : await supabase.storage.from(imageBucket).upload(rows[index].storage_path, photo.file, {
            cacheControl: "3600",
            contentType: photo.file.type,
            upsert: false,
          });

        completedCount += 1;
        onProgress(completedCount, uploadablePhotos.length);

        return uploadError?.message ?? null;
      }),
    );

    const uploadError = uploadResults.find(Boolean);
    if (uploadError) {
      return { error: uploadError, photoIds: new Map<string, string>() };
    }

    const { data: insertedPhotos, error: photoInsertError } = await supabase.from(photoTable).insert(rows).select("id,storage_path");
    if (photoInsertError) return { error: photoInsertError.message, photoIds: new Map<string, string>() };

    const photoIds = new Map<string, string>();
    rows.forEach((row) => {
      const insertedPhoto = (insertedPhotos ?? []).find((photo) => photo.storage_path === row.storage_path) as { id: string } | undefined;
      if (insertedPhoto) photoIds.set(row.id, insertedPhoto.id);
    });
    return { error: null, photoIds };
  };

  const syncEditedPhotos = async ({
    listingId,
    supabase,
  }: {
    listingId: string;
    supabase: NonNullable<ReturnType<typeof createBrowserSupabaseClient>>;
  }) => {
    if (removedPhotoIds.length) {
      const { data: removedPhotos, error: removedPhotosError } = await supabase
        .from(photoTable)
        .select("id,storage_path")
        .eq("listing_id", listingId)
        .in("id", removedPhotoIds);
      if (removedPhotosError) return removedPhotosError.message;

      const { error: removeRowsError } = await supabase
        .from(photoTable)
        .delete()
        .eq("listing_id", listingId)
        .in("id", removedPhotoIds);
      if (removeRowsError) return removeRowsError.message;

      const paths = (removedPhotos ?? []).map((photo) => photo.storage_path).filter(Boolean);
      if (paths.length) {
        const { error: removeFilesError } = await supabase.storage.from(imageBucket).remove(paths);
        if (removeFilesError) return removeFilesError.message;
      }
    }

    const { error: clearPrimaryError } = await supabase
      .from(photoTable)
      .update({ is_primary: false })
      .eq("listing_id", listingId);
    if (clearPrimaryError) return clearPrimaryError.message;

    if (primaryPhotoId) {
      const { error: setPrimaryError } = await supabase
        .from(photoTable)
        .update({ is_primary: true })
        .eq("listing_id", listingId)
        .eq("id", primaryPhotoId);
      if (setPrimaryError) return setPrimaryError.message;
    }

    const orderErrors = await Promise.all(photos.map((photo, index) => supabase
      .from(photoTable)
      .update({ display_order: index })
      .eq("listing_id", listingId)
      .eq("id", photo.id)
      .then(({ error: updateError }) => updateError?.message ?? null)));
    return orderErrors.find(Boolean) ?? null;
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    setIsSubmitting(true);
    setSubmitProgress(6);
    setNotice(null);
    setError(null);

    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setError("Supabase environment variables are not configured.");
      setSubmitProgress(0);
      setIsSubmitting(false);
      return;
    }
    setSubmitProgress(12);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setSubmitProgress(0);
      setIsSubmitting(false);
      router.push("/login");
      return;
    }
    setSubmitProgress(20);

    const form = new FormData(formElement);
    const title = String(form.get("title") ?? "").trim();
    const baseBody = String(form.get("body") ?? "").trim();
    const withSpecs = shouldShowSmartphoneTemplate ? appendSmartphoneSpecs(baseBody, smartphoneSpecs) : baseBody;
    const isUneditedAiDraft = Boolean(aiDraftState?.points.length) && baseBody.trim() === aiDraftState?.html.trim();
    const body = isUneditedAiDraft ? appendUnconfirmedDetails(withSpecs, aiDraftState.points) : withSpecs;
    const price = String(form.get("price") ?? "").trim();
    const parsedPrice = Number(price.replace(/[^0-9.]/g, ""));
    let priceCents = fixedBargainPriceCents ?? (Number.isFinite(parsedPrice) && parsedPrice > 0 ? Math.round(parsedPrice * 100) : 0);

    const saleItems = isMultiItemSale
      ? eventInventoryPhotos.map((photo, index) => {
        const item = bargainSaleItems.find((candidate) => candidate.photoId === photo.id);
        const itemPrice = Number(item?.price.replace(/[^0-9.]/g, "") ?? "");
        return { photoId: photo.id, title: item?.title.trim() ?? "", category: item?.category ?? "", priceCents: Number.isFinite(itemPrice) && itemPrice > 0 ? Math.round(itemPrice * 100) : 0, description: item?.description.trim() ?? "", displayOrder: index };
      })
      : [];

    if (isMultiItemSale) {
      if (!photos.length) {
        setError("Add a cover photo for your Moving Sale or Garage Sale.");
        setSubmitProgress(0);
        setIsSubmitting(false);
        return;
      }
      if (!saleItems.length) {
        setError("Add at least one inventory item photo.");
        setSubmitProgress(0);
        setIsSubmitting(false);
        return;
      }
      if (!eventStartDate || !eventEndDate || !eventStartTime || !eventEndTime || !eventAddress.trim()) {
        setError("Add the event dates, times, and full address before launching your sale.");
        setSubmitProgress(0);
        setIsSubmitting(false);
        return;
      }
      if (saleItems.some((item) => !item.title.length || !item.category || !item.priceCents || !item.description.length)) {
        setError("Add a title, category, price, and description for every inventory item.");
        setSubmitProgress(0);
        setIsSubmitting(false);
        return;
      }
      priceCents = Math.min(...saleItems.map((item) => item.priceCents));
    }

    if (fixedBargainPriceCents !== null && priceCents !== fixedBargainPriceCents) {
      setError(`${bargainListingTypes.find((option) => option.value === bargainType)?.label ?? "This deal"} has a fixed price of $${(fixedBargainPriceCents / 100).toFixed(0)}.`);
      setSubmitProgress(0);
      setIsSubmitting(false);
      return;
    }

    const plainDescription = body.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    if (violatesMarketplaceProhibitedItemsPolicy(title, plainDescription, mainCategory, subCategory, ...saleItems.flatMap((item) => [item.title, item.description, item.category]))) {
      setError(prohibitedMarketplaceItemsMessage);
      setSubmitProgress(0);
      setIsSubmitting(false);
      return;
    }
    if (plainDescription.length < 20 || body.length > 5000) {
      setError("Description must contain 20 to 5,000 characters.");
      setSubmitProgress(0);
      setIsSubmitting(false);
      return;
    }
    setSubmitProgress(28);

    if (initialListing) {
      const response = await fetch(`${isBargainListing ? "/api/bargain/listings" : "/api/market/listings"}/${initialListing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: body,
          priceCents,
          itemCondition,
          tradeMethod,
          categorySlug: mainCategory || null,
          subcategorySlug: subCategory || null,
          regionCity: location.mainLocation || null,
          regionSuburb: location.subLocation || null,
          mainLocation: location.mainLocation || null,
          subLocation: location.subLocation || null,
          locality: location.locality,
          rawSuburb: location.rawSuburb,
          region: location.region,
          latitude: location.latitude,
          longitude: location.longitude,
          meetingPlace: meetingPlace || null,
        }),
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) {
        setError(payload?.error ?? "Unable to update this listing right now.");
        setSubmitProgress(0);
        setIsSubmitting(false);
        return;
      }

      const photoUpload = await uploadPhotos({
        listingId: initialListing.id,
        supabase,
        userId: user.id,
        onProgress: (completedCount, totalCount) => setSubmitProgress(36 + Math.round((completedCount / totalCount) * 48)),
      });
      if (photoUpload.error) {
        setError(`Listing updated, but photos could not be saved: ${photoUpload.error}`);
        setSubmitProgress(0);
        setIsSubmitting(false);
        return;
      }

      const photoSyncError = await syncEditedPhotos({ listingId: initialListing.id, supabase });
      if (photoSyncError) {
        setError(`Listing updated, but photo changes could not be saved: ${photoSyncError}`);
        setSubmitProgress(0);
        setIsSubmitting(false);
        return;
      }

      setSubmitProgress(100);
      router.push(`${listingHomePath}/${initialListing.id}`);
      router.refresh();
      return;
    }

    const listingPayload = {
      owner_id: user.id,
      status: "published",
      title,
      description: body,
      category_slug: mainCategory || null,
      subcategory_slug: subCategory || null,
      trade_method: tradeMethod,
      item_condition: itemCondition,
      price_cents: priceCents,
      region_city: location.mainLocation || null,
      region_suburb: location.subLocation || null,
      main_location: location.mainLocation || null,
      sub_location: location.subLocation || null,
      locality: location.locality,
      raw_suburb: location.rawSuburb,
      region: location.region,
      latitude: location.latitude,
      longitude: location.longitude,
      meeting_place: meetingPlace || null,
      ...(isBargainListing ? {
        bargain_type: bargainType,
        event_start_date: eventStartDate || null,
        event_end_date: eventEndDate || null,
        event_start_time: eventStartTime || null,
        event_end_time: eventEndTime || null,
        event_address: eventAddress.trim() || null,
      } : {}),
    };
    let createResult = await supabase.from(listingTable).insert(listingPayload).select("id").single();
    // The location fields were introduced additively. Older deployed databases
    // can still accept a listing through the original region columns while the
    // migration is waiting to be applied or PostgREST refreshes its cache.
    if (!isBargainListing && createResult.error && ["42703", "PGRST204"].includes(createResult.error.code)) {
      const { main_location, sub_location, locality, raw_suburb, region, latitude, longitude, ...legacyListingPayload } = listingPayload;
      void main_location; void sub_location; void locality; void raw_suburb; void region; void latitude; void longitude;
      createResult = await supabase.from("market_listings").insert(legacyListingPayload).select("id").single();
    }
    const { data: createdListing, error: insertError } = createResult;

    if (insertError) {
      setError(insertError.message);
      setSubmitProgress(0);
      setIsSubmitting(false);
      return;
    }
    setSubmitProgress(44);

    if (createdListing?.id) {
      const photoUpload = await uploadPhotos({
        listingId: createdListing.id,
        supabase,
        userId: user.id,
        onProgress: (completedCount, totalCount) => {
          setSubmitProgress(44 + Math.round((completedCount / totalCount) * 44));
        },
      });
      setSubmitProgress(94);
      if (photoUpload.error) {
        setNotice("Posted successfully. Photos could not be attached yet.");
        setSubmitProgress(100);
        setIsSubmitting(false);
        router.push(listingHomePath);
        return;
      }

      if (isMultiItemSale) {
        const itemRows = saleItems.flatMap((item) => {
          const photoId = photoUpload.photoIds.get(item.photoId);
          return photoId ? [{ listing_id: createdListing.id, photo_id: photoId, owner_id: user.id, title: item.title, category_slug: item.category, price_cents: item.priceCents, description: item.description, display_order: item.displayOrder }] : [];
        });
        if (itemRows.length !== saleItems.length) {
          setError("Your listing was posted, but individual sale item photos could not be linked. Please try again.");
          setSubmitProgress(0);
          setIsSubmitting(false);
          return;
        }
        const { error: itemInsertError } = await supabase.from("bargain_listing_items").insert(itemRows);
        if (itemInsertError) {
          setError(`Your listing was posted, but individual item details could not be saved: ${itemInsertError.message}`);
          setSubmitProgress(0);
          setIsSubmitting(false);
          return;
        }
      }
    }

    setNotice("Posted successfully.");
    setSubmitProgress(100);
    formRef.current?.reset();
    setMainCategory("");
    setSubCategory("");
    setTradeMethod("pickup_delivery");
    setItemCondition("brand_new");
    setLocation(defaultLocation);
    setMeetingPlace("");
    setDescription("");
    setSmartphoneSpecs(emptySmartphoneSpecs);
    setTitle("");
    setPrice("");
    setBargainType(isBargainListing ? "garage-sale" : "2-dollar-deals");
    setBargainSaleItems([]);
    setEventStartDate("");
    setEventEndDate("");
    setEventStartTime("08:00");
    setEventEndTime("16:00");
    setEventAddress("");
    setIsHtmlMode(false);
    photos.forEach((photo) => URL.revokeObjectURL(photo.url));
    setPhotos([]);
    setPrimaryPhotoId(null);
    setIsSubmitting(false);
    router.push(listingHomePath);
  };

  const submitButtonProgress = isSubmitting ? Math.max(6, submitProgress) : 0;
  const previewPhoto = photos.find((photo) => photo.id === primaryPhotoId) ?? photos[0];
  const previewListing: Listing = {
    id: "listing-preview",
    title: title.trim() || say("Your listing title", "상품 제목"),
    price: price.trim() ? `$${price.trim()}` : "$0",
    location: [location.subLocation, location.mainLocation].filter(Boolean).join(", ") || say("Choose a location", "지역을 선택하세요"),
    image: previewPhoto?.url ?? "/images/logo.png",
    imageAlt: title.trim() || "Listing preview",
    status: "available",
  };

  const changeBargainType = (value: string) => {
    const nextType = value as BargainListingType;
    setBargainType(nextType);
    const maximumPriceCents = getBargainTypeMaximumPrice(nextType);
    if (maximumPriceCents !== null) setPrice((maximumPriceCents / 100).toFixed(0));
  };

  const appliedInitialShopType = useRef(false);
  const activeShopType: ShopTypeValue = !isBargainListing
      ? "secondhand"
      : bargainType === "garage-sale" || bargainType === "moving-sale"
        ? bargainType
        : "2dollarshop";

  const changeShopType = (nextShopType: ShopTypeValue) => {
    if (nextShopType === activeShopType) return;

    photos.forEach((photo) => {
      if (photo.file) URL.revokeObjectURL(photo.url);
    });
    const draftPaths = photos.flatMap((photo) => (photo.draftPath ? [photo.draftPath] : []));
    if (draftPaths.length) {
      const supabase = createBrowserSupabaseClient();
      void supabase?.storage.from(imageBucket).remove(draftPaths);
    }
    setPhotos([]);
    setPrimaryPhotoId(null);
    setBargainSaleItems([]);
    setTitle("");
    setPrice("");
    setMainCategory("");
    setSubCategory("");
    setDescription("");
    setEventStartDate("");
    setEventEndDate("");
    setEventStartTime("08:00");
    setEventEndTime("16:00");
    setEventAddress("");
    setError(null);
    setNotice(null);

    // Group Buy is posted on its own route: it collects a list of items with
    // their own prices and a handover arrangement, none of which this form has
    // a field for. The draft above is cleared first so nothing is left behind.
    if (nextShopType === "groupbuy") {
      router.push("/market/groupbuy/create");
      return;
    }

    if (nextShopType === "secondhand") {
      setActiveSpace("market");
      return;
    }
    setActiveSpace("bargain");
    if (nextShopType === "garage-sale") changeBargainType("garage-sale");
    else if (nextShopType === "moving-sale") changeBargainType("moving-sale");
    else if (!dollarShopTierValues.includes(bargainType)) changeBargainType("2-dollar-deals");
  };

  const updateBargainSaleItem = useCallback((photoId: string, field: "title" | "category" | "price" | "description", value: string) => {
    setBargainSaleItems((current) => current.map((item) => {
      if (item.photoId !== photoId) return item;
      if (field !== "title") return { ...item, [field]: value };

      const suggestion = suggestCategoryFromTitle(value);
      return { ...item, title: value, category: suggestion ? suggestion.mainCategory : item.category };
    }));
  }, []);

  const removeBargainSaleItem = (photoId: string) => removePhoto(photoId);

  const generateItemDescriptions = useCallback(async () => {
    if (!eventInventoryPhotos.length) {
      setItemDescriptionError("Add at least one item photo first.");
      return;
    }
    if (eventInventoryPhotos.some((photo) => !photo.draftPath)) {
      setItemDescriptionError("Your item photos are still being prepared. Please wait a moment and try again.");
      return;
    }

    setIsGeneratingItemDescriptions(true);
    setItemDescriptionError(null);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 58_000);

    try {
      const response = await fetch("/api/ai/generate-bargain-item-descriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        signal: controller.signal,
        body: JSON.stringify({
          language: locale,
          items: eventInventoryPhotos.map((photo) => ({
            id: photo.id,
            title: bargainSaleItems.find((item) => item.photoId === photo.id)?.title ?? "",
            imagePath: photo.draftPath,
          })),
        }),
      });
      const result = await readApiResponse(response, bargainItemDescriptionsResponseSchema);
      if (!result.data) {
        setItemDescriptionError(result.error?.message ?? "We could not write item descriptions. Please try again.");
        return;
      }
      result.data.items.forEach((item) => {
        updateBargainSaleItem(item.id, "title", item.title);
        updateBargainSaleItem(item.id, "category", item.categorySlug);
        updateBargainSaleItem(item.id, "description", item.description);
      });
    } catch (generationError) {
      setItemDescriptionError(generationError instanceof Error && generationError.name === "AbortError"
        ? "Generation took longer than expected. Please try again."
        : "We could not write item descriptions. Please try again.");
    } finally {
      window.clearTimeout(timeout);
      setIsGeneratingItemDescriptions(false);
    }
  }, [bargainSaleItems, eventInventoryPhotos, locale, updateBargainSaleItem]);

  useEffect(() => {
    if (!isMultiItemSale || !eventInventoryPhotos.length || isGeneratingItemDescriptions || eventInventoryPhotos.some((photo) => !photo.draftPath)) return;
    const signature = eventInventoryPhotos.map((photo) => photo.draftPath).join("|");
    if (signature === generatedItemPhotoSignatureRef.current) return;
    generatedItemPhotoSignatureRef.current = signature;
    void generateItemDescriptions();
  }, [eventInventoryPhotos, generateItemDescriptions, isGeneratingItemDescriptions, isMultiItemSale]);

  useEffect(() => {
    if (appliedInitialShopType.current || !initialShopType || isEditing) return;
    appliedInitialShopType.current = true;
    changeShopType(initialShopType);
    // Runs once on mount; changeShopType is stable enough for that and adding it
    // here would re-run the effect on every keystroke in the form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialShopType, isEditing]);

  const createHeading = isMultiItemSale
      ? bargainType === "garage-sale" ? say("Register your garage sale", "차고 세일 등록하기") : say("Register your moving sale", "이사 세일 등록하기")
      : isBargainListing ? say("Create a bargain listing", "떨이 상품 등록하기") : isEditing ? say("Edit your listing", "내 상품 수정하기") : say("Create a new listing", "새 상품 등록하기");
  const createDescription = isMultiItemSale
      ? say("Add a cover photo, then price and describe every item for local bargain hunters.", "대표 사진을 올리고, 각 물건의 가격과 설명을 적어 보세요.")
      : isBargainListing ? say("Share great local deals at prices people will love.", "이웃이 반할 만한 가격으로 좋은 물건을 나눠 보세요.") : say("Add the details buyers need to find and trust your item.", "구매자가 찾고 믿을 수 있도록 상품 정보를 채워 주세요.");

  return (
    <main className={`marketplace-page market-create-page ${isBargainListing ? "is-bargain-form" : ""} ${isMultiItemSale ? "is-event-sale" : ""}`}>
      <aside className="market-filter-panel market-create-filter-rail" aria-label={say("Market navigation and filters", "마켓 메뉴와 필터")}>
        <MarketFilterSidebar
          activeShopType={activeShopType}
          activeCategory={mainCategory || "all"}
          onCategorySelect={(nextCategory) => {
            setMainCategory(nextCategory === "all" ? "" : nextCategory);
            setSubCategory("");
          }}
          mainLocation={location.mainLocation}
          subLocation={location.subLocation}
          onLocationChange={(mainLocation, subLocation = "") => setLocation((current) => ({
            ...current,
            mainLocation,
            subLocation,
            locality: null,
            rawSuburb: null,
            region: null,
            latitude: null,
            longitude: null,
          }))}
        />
      </aside>
      <section className="market-results market-create-main">
      <div className="post-ad-page">
      <div className="post-ad-create-bar"><Link href={listingHomePath}><i className="ms ms-chevron-left" aria-hidden="true" /> {isEditing ? say("Edit listing", "상품 수정") : say("Create a new listing", "새 상품 등록")}</Link></div>
      <header className="post-ad-intro">
        <h1>{createHeading}</h1>
        <p>{createDescription}</p>
      </header>
      <div className="post-ad-layout">
        <section className="post-ad-card" aria-label={isEditing ? say("Edit marketplace listing", "마켓 상품 수정") : say("Create a new marketplace listing", "마켓 상품 등록")}>
          <form ref={formRef} className="post-ad-form" onSubmit={submit}>
            <div className="post-field post-field-full post-title-field">
              <div className="post-section-heading"><span>1</span><h2>{isMultiItemSale ? say("Event details", "행사 정보") : say("Basics", "기본 정보")}</h2></div>
              {!isEditing && <PostShopTypeSelector activeShopType={activeShopType} onSelect={changeShopType} />}
                <label htmlFor="post-title">{isMultiItemSale ? say("Event title", "행사 제목") : say("Listing Title", "상품 제목")}</label>
                <input id="post-title" name="title" type="text" minLength={2} maxLength={120} value={title} placeholder={isMultiItemSale ? say("e.g. Huge weekend garage sale - everything must go!", "예) 주말 대형 차고 세일 — 전부 정리합니다!") : say("e.g. iPhone 15 Pro Max - 256GB Titanium", "예) 아이폰 15 프로 맥스 - 256GB 티타늄")} onChange={(event) => handleTitleChange(event.target.value)} required />
                {isMultiItemSale ? <>
                  <div className="event-schedule-grid">
                    <label>{say("Start date", "시작 날짜")}<input type="date" value={eventStartDate} onChange={(event) => setEventStartDate(event.target.value)} required /></label>
                    <label>{say("End date", "종료 날짜")}<input type="date" min={eventStartDate || undefined} value={eventEndDate} onChange={(event) => setEventEndDate(event.target.value)} required /></label>
                    <label>{say("Start time", "시작 시간")}<input type="time" value={eventStartTime} onChange={(event) => setEventStartTime(event.target.value)} required /></label>
                    <label>{say("End time", "종료 시간")}<input type="time" value={eventEndTime} onChange={(event) => setEventEndTime(event.target.value)} required /></label>
                  </div>
                  <label htmlFor="event-address">{say("Event location (full address)", "행사 장소 (전체 주소)")}</label>
                  <div className="event-address-input"><i className="ms ms-location-on" aria-hidden="true" /><input id="event-address" type="text" value={eventAddress} onChange={(event) => setEventAddress(event.target.value)} placeholder="123 Sunny Lane, Ponsonby, Auckland" required /></div>
                  <label htmlFor="event-description">{say("Sale description", "세일 설명")}</label>
                  <textarea id="event-description" className="event-description-input" value={description.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()} onChange={(event) => setDescription(event.target.value)} placeholder="Tell people what to expect. Mention special collections, availability, or instructions." maxLength={5_000} required />
                  <input type="hidden" name="body" value={description} />
                </> : (isBargainListing ? (
                  <SelectMenu id="bargain-type" name="bargain_type" label={say("Deal tier", "떨이 등급")} icon="ms-sell" placeholder={say("Select deal tier", "떨이 등급 선택")} options={bargainListingTypes.filter((option) => !isMultiItemBargain(option.value)).map(({ label, value }) => ({ label, value }))} value={bargainType} onChange={changeBargainType} className="bargain-type-select" disabled={isEditing} />
                ) : <p className="post-field-hint">{say("Your category will be automatically suggested based on the listing title.", "상품 제목을 바탕으로 카테고리가 자동으로 추천됩니다.")}</p>)}
            </div>

            {!isMultiItemSale && <div className="post-form-grid post-form-grid-three post-category-fields">
              <div className="post-section-heading"><span>3</span><h2>{isMultiItemSale ? say("Sale settings", "세일 설정") : say("Pricing & category", "가격 & 카테고리")}</h2></div>
              <div className="post-field post-price-field">
                <label htmlFor="listing-price">{say("Price (NZD)", "가격 (NZD)")}</label>
                <div className="post-price-input">
                  <span>$</span>
                  <input id="listing-price" name="price" type="text" inputMode="decimal" value={fixedBargainPriceCents === null ? price : (fixedBargainPriceCents / 100).toFixed(0)} onChange={(event) => setPrice(event.target.value)} placeholder="0.00" readOnly={fixedBargainPriceCents !== null} aria-describedby={fixedBargainPriceCents !== null ? "bargain-fixed-price-hint" : undefined} />
                </div>
                {fixedBargainPriceCents !== null ? <p className="post-field-hint" id="bargain-fixed-price-hint">This deal type has a fixed ${fixedBargainPriceCents / 100} price.</p> : null}
              </div>
              <SelectMenu id="main-category" name="main_category" label={say("Main Category", "대분류")} icon="ms-layers" placeholder={say("Select main category", "대분류 선택")} options={mainCategoryOptions} value={mainCategory} onChange={setMainCategory} />
              <SelectMenu id="sub-category" name="sub_category" label={say("Sub Category", "소분류")} icon="ms-sell" placeholder={say("Select sub category", "소분류 선택")} options={subCategoryOptions} value={subCategory} onChange={setSubCategory} />
              <SelectMenu id="item-condition" name="item_condition" label={say("Item Condition", "상품 상태")} icon="ms-workspace-premium" placeholder={say("Brand new", "새 상품")} options={conditionOptions} value={itemCondition} onChange={setItemCondition} />
            </div>}

            {<fieldset
              className={`photo-fieldset post-photo-field ${isDraggingPhotos ? "is-dragging" : ""}`}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDraggingPhotos(true);
              }}
              onDragLeave={() => setIsDraggingPhotos(false)}
              onDrop={(event) => {
                event.preventDefault();
                setIsDraggingPhotos(false);
                void addPhotos(event.dataTransfer.files, isMultiItemSale ? (photosRef.current[0] ? "inventory" : "cover") : "listing");
              }}
            >
              <div className="field-label-row">
                <legend><span className="post-section-heading"><span>2</span><span>{isMultiItemSale ? say("Photos & GPT details", "사진 & GPT 설명") : say("Photos & AI help", "사진 & AI 도움")}</span></span></legend>
                <span>{isMultiItemSale ? say("One cover photo + up to 10 item photos", "대표 사진 1장 + 물건 사진 최대 10장") : say("Up to 10 photos", "사진 최대 10장")}</span>
              </div>
              <input
                ref={photoInputRef}
                className="post-photo-input"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                onChange={(event) => {
                  if (event.target.files) {
                    void addPhotos(event.target.files, photoPickerIntentRef.current);
                    event.target.value = "";
                  }
                }}
              />
              <div className={isMultiItemSale ? `event-cover-photo-layout ${photos.length ? "has-cover-photo" : "is-awaiting-cover"}` : undefined}>
                {(!isMultiItemSale || photos.length > 0) ? <div className="post-photo-grid">
                  {(isMultiItemSale ? photos.slice(0, 1) : photos).map((photo, index) => (
                    <div className="post-photo-card" key={photo.id}>
                      <button className={`post-photo-slot ${photo.id === primaryPhotoId || (!primaryPhotoId && index === 0) ? "is-main" : ""}`} type="button" aria-label={say("Use this photo as main thumbnail", "이 사진을 대표 사진으로 사용")} onClick={() => setPrimaryPhotoId(photo.id)}>
                        <img src={photo.url} alt={photo.name ?? photo.file?.name ?? "Listing photo"} />
                        {(photo.id === primaryPhotoId || (!primaryPhotoId && index === 0)) && <span>{say("Main", "대표")}</span>}
                      </button>
                      <button className="post-photo-remove" type="button" aria-label={`Remove ${photo.name ?? photo.file?.name ?? "listing photo"}`} onClick={() => removePhoto(photo.id)}>
                        <i className="ms ms-close" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                  {!isMultiItemSale && Array.from({ length: Math.min(1, Math.max(0, maxPhotosForCurrentListing - photos.length)) }).map((_, index) => (
                  <button className={`post-photo-upload ${photos.length ? "" : "is-initial"}`} key={`upload-${index}`} type="button" aria-label={index === 0 ? say("Add a photo", "사진 추가") : say("Add another photo", "사진 더 추가")} onClick={() => openPhotoPicker(isMultiItemSale ? "cover" : "listing")}>
                    <i className="ms ms-photo-camera" aria-hidden="true" />
                    <span>{say("Add", "추가")}</span>
                  </button>
                  ))}
                </div> : null}
                {isMultiItemSale ? <div className="event-cover-preview-column"><BargainSaleCoverPreview imageUrl={photos[0]?.url} imageAlt={photos[0]?.name ?? photos[0]?.file?.name} title={title} type={bargainType as "moving-sale" | "garage-sale"} date={eventStartDate} location={eventAddress || [location.subLocation, location.mainLocation].filter(Boolean).join(", ")} description={description.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()} />{photos.length === 0 ? <button className="post-photo-upload event-cover-add-button" type="button" aria-label="Add a photo" onClick={() => openPhotoPicker("cover")}><i className="ms ms-photo-camera" aria-hidden="true" /><span>{say("Add", "추가")}</span></button> : null}</div> : null}
              </div>
              <p className="post-upload-hint">
                <strong>{isMultiItemSale ? say("Upload the cover first, then add item photos. GPT fills every item automatically.", "대표 사진을 먼저 올린 뒤 물건 사진을 추가하면, GPT가 각 물건을 자동으로 채워 줍니다.") : say("Click to upload or drag and drop multiple photos at once", "클릭해서 올리거나 사진 여러 장을 한 번에 끌어다 놓으세요")}</strong>
              </p>
              {isMultiItemSale ? <div className="event-cover-ad-slot" aria-hidden="true"><i className="ms ms-ad" aria-hidden="true" /><span>{say("Ad space reserved", "광고 자리")}</span></div> : null}
              {isProcessingPhotos ? <p className="post-photo-processing" role="status">이미지를 처리하고 있습니다…</p> : null}
              {!isMultiItemSale && <section className="post-photo-ai-help" aria-label={say("AI help", "AI 도움")}>
                <AiListingGenerator
                  title={title}
                  description={description}
                  price={price}
                  condition={conditionOptions.find((condition) => condition.value === itemCondition)?.label ?? itemCondition}
                  location={[location.mainLocation, location.subLocation].filter(Boolean).join(", ")}
                  language={locale}
                  listingSpace={listingSpace}
                  additionalDetails={[
                    { label: say("Trade method", "거래 방법"), value: tradeMethodOptions.find((method) => method.value === tradeMethod)?.label ?? tradeMethod },
                    { label: say("Meeting place", "거래 장소"), value: meetingPlaceOptions.find((place) => place.value === meetingPlace)?.label ?? meetingPlace },
                    ...specLabels.map(({ key, label }) => ({ label, value: smartphoneSpecs[key].trim() })),
                  ].filter(({ value }) => value.length > 0)}
                  imagePaths={photos
                    .filter((photo) => Boolean(photo.draftPath))
                    .sort((left, right) => Number(right.id === primaryPhotoId) - Number(left.id === primaryPhotoId))
                    .flatMap((photo) => photo.draftPath ? [photo.draftPath] : [])}
                  isImagesProcessing={isProcessingPhotos}
                  onUseDraft={useAiDraft}
                  onUseTitle={handleTitleChange}
                />
                <p className="post-ai-description">{locale === "ko" ? "사진을 기반으로 제목과 내용을 ChatGPT가 작성합니다." : "ChatGPT will create a title and description from your photos."}</p>
              </section>}
            </fieldset>}

            {isMultiItemSale ? <BargainSaleItemsEditor photos={eventInventoryPhotos} items={bargainSaleItems} onChange={updateBargainSaleItem} onAddItem={() => openPhotoPicker("inventory")} onRemoveItem={removeBargainSaleItem} onGenerateDescriptions={() => void generateItemDescriptions()} isGeneratingDescriptions={isGeneratingItemDescriptions} generationProgress={itemDescriptionProgress} generationError={itemDescriptionError} /> : null}

            {!isMultiItemSale && <div className="post-field post-field-full post-description-field">
              <div className="post-section-heading"><span>5</span><h2>{isMultiItemSale ? say("Sale description", "세일 설명") : say("Description", "상세 설명")}</h2></div>
              <div className="post-editor">
                <div className="post-editor-toolbar" aria-label={say("Description formatting", "설명 서식")}>
                  <button type="button" aria-label={say("Undo", "실행 취소")} title={say("Undo", "실행 취소")} onMouseDown={(event) => event.preventDefault()} onClick={() => runEditorCommand("undo")}><i className="ms ms-rotate-left" aria-hidden="true" /></button>
                  <button type="button" aria-label={say("Redo", "다시 실행")} title={say("Redo", "다시 실행")} onMouseDown={(event) => event.preventDefault()} onClick={() => runEditorCommand("redo")}><i className="ms ms-rotate-right" aria-hidden="true" /></button>
                  <select aria-label={say("Text style", "글 스타일")} title={say("Text style", "글 스타일")} defaultValue="p" disabled={isHtmlMode} onChange={(event) => runEditorCommand("formatBlock", `<${event.target.value}>`)}>
                    <option value="p">{say("Paragraph", "본문")}</option>
                    <option value="h2">{say("Heading", "제목")}</option>
                    <option value="h3">{say("Subheading", "소제목")}</option>
                    <option value="blockquote">{say("Quote", "인용")}</option>
                  </select>
                  <span className="post-editor-divider" aria-hidden="true" />
                  <button type="button" aria-label={say("Bold", "굵게")} title={say("Bold", "굵게")} onMouseDown={(event) => event.preventDefault()} onClick={() => runEditorCommand("bold")}><strong>B</strong></button>
                  <button type="button" aria-label={say("Italic", "기울임")} title={say("Italic", "기울임")} onMouseDown={(event) => event.preventDefault()} onClick={() => runEditorCommand("italic")}><em>I</em></button>
                  <button type="button" aria-label={say("Underline", "밑줄")} title={say("Underline", "밑줄")} onMouseDown={(event) => event.preventDefault()} onClick={() => runEditorCommand("underline")}><u>U</u></button>
                  <button type="button" aria-label={say("Strikethrough", "취소선")} title={say("Strikethrough", "취소선")} onMouseDown={(event) => event.preventDefault()} onClick={() => runEditorCommand("strikeThrough")}><s>S</s></button>
                  <div className="post-editor-color-palette" role="group" aria-label={say("Text color", "글자 색")}>
                    {colorOptions.map((color) => (
                      <button className={`post-editor-color-swatch ${textColor === color.value ? "is-selected" : ""}`} key={color.value} type="button" aria-label={say(`Set text color to ${color.label}`, `글자 색을 ${color.label}(으)로`)} title={color.label} disabled={isHtmlMode} style={{ backgroundColor: color.value }} onMouseDown={(event) => event.preventDefault()} onClick={() => {
                        setTextColor(color.value);
                        runEditorCommand("foreColor", color.value);
                      }} />
                    ))}
                  </div>
                  <span className="post-editor-divider" aria-hidden="true" />
                  <button type="button" aria-label={say("Bulleted list", "글머리 기호 목록")} title={say("Bulleted list", "글머리 기호 목록")} onMouseDown={(event) => event.preventDefault()} onClick={() => runEditorCommand("insertUnorderedList")}><i className="ms ms-list" aria-hidden="true" /></button>
                  <button type="button" aria-label={say("Numbered list", "번호 목록")} title={say("Numbered list", "번호 목록")} onMouseDown={(event) => event.preventDefault()} onClick={() => runEditorCommand("insertOrderedList")}><i className="ms ms-format-list-numbered" aria-hidden="true" /></button>
                  <button type="button" aria-label={say("Insert link", "링크 넣기")} title={say("Insert link", "링크 넣기")} onMouseDown={(event) => event.preventDefault()} onClick={addEditorLink}><i className="ms ms-link" aria-hidden="true" /></button>
                  <button type="button" aria-label={say("Remove formatting", "서식 지우기")} title={say("Remove formatting", "서식 지우기")} onMouseDown={(event) => event.preventDefault()} onClick={() => runEditorCommand("removeFormat")}><i className="ms ms-ink-eraser" aria-hidden="true" /></button>
                  <span className="post-editor-divider" aria-hidden="true" />
                  <button className={isHtmlMode ? "is-active" : ""} type="button" aria-label={say("Edit HTML source", "HTML 편집")} title={say("Edit HTML source", "HTML 편집")} onClick={toggleHtmlMode}><i className="ms ms-code" aria-hidden="true" /></button>
                </div>
                <input type="hidden" name="body" value={description} />
                {isHtmlMode ? (
                  <textarea className="post-editor-source" id="post-description" value={description} onChange={(event) => setDescription(event.target.value)} spellCheck={false} aria-label={say("HTML source", "HTML 원본")} />
                ) : (
                  <div ref={editorRef} id="post-description" className="post-editor-content" contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" data-placeholder="Write a clear, detailed and friendly description buyers can trust. Include the item’s condition, key features, included accessories, any flaws, pickup or delivery details, and why you are selling. This description can be reused until the item sells, so make it helpful and complete." onInput={(event) => setDescription(event.currentTarget.innerHTML)} />
                )}
              </div>
              {shouldShowSmartphoneTemplate && (
                <section className="category-template-panel" aria-label={say("Smartphone listing details", "스마트폰 상세 정보")}>
                  <div className="category-template-heading">
                    <div>
                      <h2>{say("Smartphone details", "스마트폰 상세 정보")}</h2>
                      <p>{say("These fields will be added to your listing description when you post.", "여기 입력한 내용은 등록할 때 상세 설명에 함께 들어갑니다.")}</p>
                    </div>
                    <span>{say("Electronics / Mobile phones", "전자제품 / 휴대폰")}</span>
                  </div>
                  <div className="category-template-grid">
                    <div className="post-field">
                      <label htmlFor="smartphone-brand">{say("Brand", "브랜드")}</label>
                      <input id="smartphone-brand" type="text" value={smartphoneSpecs.brand} onChange={(event) => updateSmartphoneSpec("brand", event.target.value)} placeholder={say("e.g. Apple", "예) 애플")} />
                    </div>
                    <div className="post-field">
                      <label htmlFor="smartphone-model">{say("Model", "모델")}</label>
                      <input id="smartphone-model" type="text" value={smartphoneSpecs.model} onChange={(event) => updateSmartphoneSpec("model", event.target.value)} placeholder={say("e.g. iPhone 15 Pro Max", "예) 아이폰 15 프로 맥스")} />
                    </div>
                    <div className="post-field">
                      <label htmlFor="smartphone-storage">{say("Storage / HDD capacity", "저장 용량")}</label>
                      <input id="smartphone-storage" type="text" value={smartphoneSpecs.storage} onChange={(event) => updateSmartphoneSpec("storage", event.target.value)} placeholder={say("e.g. 256GB", "예) 256GB")} />
                    </div>
                    <div className="post-field">
                      <label htmlFor="smartphone-memory">{say("Memory", "메모리")}</label>
                      <input id="smartphone-memory" type="text" value={smartphoneSpecs.memory} onChange={(event) => updateSmartphoneSpec("memory", event.target.value)} placeholder={say("e.g. 8GB RAM", "예) RAM 8GB")} />
                    </div>
                    <div className="post-field">
                      <label htmlFor="smartphone-colour">{say("Colour", "색상")}</label>
                      <input id="smartphone-colour" type="text" value={smartphoneSpecs.colour} onChange={(event) => updateSmartphoneSpec("colour", event.target.value)} placeholder={say("e.g. Natural Titanium", "예) 내추럴 티타늄")} />
                    </div>
              <SelectMenu id="smartphone-lcd-scratch" name="smartphone_lcd_scratch" label={say("LCD Scratch", "액정 흠집")} icon="ms-smartphone" placeholder={say("Select LCD condition", "액정 상태 선택")} options={scratchOptions} value={smartphoneSpecs.lcdScratch} onChange={(value) => updateSmartphoneSpec("lcdScratch", value)} />
                  </div>
                </section>
              )}
            </div>}

            {!isMultiItemSale && <div className="post-form-grid post-location-grid">
              <div className="post-section-heading"><span>4</span><h2>{isMultiItemSale ? say("Event location & trade", "행사 장소 & 거래") : say("Location & trade", "지역 & 거래")}</h2></div>
              <ListingLocationSelector value={location} onChange={setLocation} />
              <SelectMenu id="trade-method" name="trade_method" label={say("Trade Method", "거래 방법")} icon="ms-local-shipping" placeholder={say("Pickup & delivery", "직거래 & 배송")} options={tradeMethodOptions} value={tradeMethod} onChange={setTradeMethod} />
              <SelectMenu id="meeting-place" name="meeting_place" label={say("Meeting Place", "거래 장소")} icon="ms-apartment" placeholder={say("Select a safe meeting place", "안전한 거래 장소 선택")} options={meetingPlaceOptions} value={meetingPlace} onChange={setMeetingPlace} />
            </div>}

            {(notice || error) && (
              <p className={`post-create-status ${error ? "is-error" : "is-success"}`} role="status">
                {error ?? notice}
              </p>
            )}

            {<div className="post-submit-row">
              <p>{say("By posting, you agree to our ", "등록하면 ")}<Link href="#">{say("Terms of Service", "이용약관")}</Link>{say(".", "에 동의하는 것으로 봅니다.")}</p>
              <PostSubmitButton
                type="submit"
                disabled={isSubmitting || isProcessingPhotos}
                isProgressing={isSubmitting}
                progress={submitButtonProgress}
              >
                {isSubmitting ? `${isEditing ? say("Saving", "저장 중") : say("Posting", "등록 중")} ${submitButtonProgress}%` : isEditing ? say("Save changes", "변경 사항 저장") : isMultiItemSale ? (bargainType === "garage-sale" ? say("Launch garage sale", "차고 세일 시작") : say("Launch moving sale", "이사 세일 시작")) : say("Post Now", "등록하기")}
              </PostSubmitButton>
            </div>}
          </form>
        </section>

        <aside className="post-ad-sidebar" aria-label={say("Listing preview and posting tips", "미리보기와 등록 팁")}>
          <MarketListingPreview
            listing={previewListing}
            mainCategory={mainCategory}
            subCategory={subCategory}
            condition={conditionOptions.find((option) => option.value === itemCondition)?.label ?? itemCondition}
            tradeMethod={tradeMethodOptions.find((option) => option.value === tradeMethod)?.label ?? tradeMethod}
            meetingPlace={meetingPlaceOptions.find((option) => option.value === meetingPlace)?.label ?? meetingPlace}
            description={description}
            smartphoneDetails={smartphoneSpecs}
          />
          <section className="post-ad-tips" aria-label={say("Posting tips", "등록 팁")}>
            <h2>{say("Tips for a great listing", "좋은 상품 등록을 위한 팁")}</h2>
          <article><i className="ms ms-lightbulb" aria-hidden="true" /><div><h2>{say("Good Photos", "좋은 사진")}</h2><p>{say("Take photos in bright, natural light from multiple angles.", "밝은 자연광에서 여러 각도로 찍어 주세요.")}</p></div></article>
          <article><i className="ms ms-check-circle" aria-hidden="true" /><div><h2>{say("Clear Pricing", "적정한 가격")}</h2><p>{say("Research similar items to set a competitive price.", "비슷한 상품을 찾아보고 합리적인 가격을 정해 보세요.")}</p></div></article>
          <article><i className="ms ms-security" aria-hidden="true" /><div><h2>{say("Safety First", "안전이 먼저")}</h2><p>{say("Meet in public places and use secure payment methods.", "공공장소에서 만나고 안전한 결제 수단을 사용하세요.")}</p></div></article>
          </section>
        </aside>
      </div>
      </div>
      </section>
    </main>
  );
}
