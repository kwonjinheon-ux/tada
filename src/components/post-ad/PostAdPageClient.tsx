"use client";

import { type CSSProperties, type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { readApiResponse } from "@/lib/api/client";
import { useLanguage } from "@/components/LanguageProvider";
import { isAcceptedMarketListingImage, marketListingImagePolicy, normalizeMarketListingImage } from "@/lib/media/market-listing-image";
import { getSubcategories, marketplaceCategories, suggestCategoryFromTitle } from "@/data/marketplace-categories";
import { AiListingGenerator } from "@/components/post-ad/AiListingGenerator";
import { ListingLocationSelector } from "@/components/market/ListingLocationSelector";
import type { MainLocation } from "@/data/nzLocations";
import { findMainLocation, findSubLocation } from "@/lib/market/nz-location";
import { SelectMenu, type SelectMenuOption } from "@/components/ui/SelectMenu";
import { appendUnconfirmedDetails } from "@/lib/market/unconfirmed-details";
import { ProductCard } from "@/components/ProductCard";
import type { Listing } from "@/data/listings";
import { BargainSaleItemsEditor, type BargainSaleItemDraft } from "@/components/bargain/BargainSaleItemsEditor";
import { BargainSaleCoverPreview } from "@/components/bargain/BargainSaleCoverPreview";
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

type ShopTypeValue = "secondhand" | "garage-sale" | "moving-sale" | "2dollarshop" | "groupbuy";

const postShopTypeOptions: Array<{ value: ShopTypeValue; label: string; icon: string }> = [
  { value: "secondhand", label: "Second Hands", icon: "fa-store" },
  { value: "garage-sale", label: "Garage Sale", icon: "fa-warehouse" },
  { value: "moving-sale", label: "Moving Sale", icon: "fa-truck-ramp-box" },
  { value: "2dollarshop", label: "2 Dollar Shop", icon: "fa-coins" },
  { value: "groupbuy", label: "Group Buy", icon: "fa-people-group" },
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


export function PostAdPageClient({ initialListing, listingSpace = "market" }: { initialListing?: EditableListingInitialValues; listingSpace?: "market" | "bargain" }) {
  const router = useRouter();
  const { locale } = useLanguage();
  const isEditing = Boolean(initialListing);
  const [activeSpace, setActiveSpace] = useState<"market" | "bargain">(listingSpace);
  const [showGroupBuyNotice, setShowGroupBuyNotice] = useState(false);
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
    ? getSubcategories(mainCategory).map(({ label, value }) => ({ label, value }))
    : marketplaceCategories.flatMap((category) => category.subcategories.map(({ label, value }) => ({ label: `${category.label} - ${label}`, value })));
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
    if (showGroupBuyNotice) return;
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
    title: title.trim() || "Your listing title",
    price: price.trim() ? `$${price.trim()}` : "$0",
    location: [location.subLocation, location.mainLocation].filter(Boolean).join(", ") || "Choose a location",
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

  const activeShopType: ShopTypeValue = showGroupBuyNotice
    ? "groupbuy"
    : !isBargainListing
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

    if (nextShopType === "groupbuy") {
      setShowGroupBuyNotice(true);
      return;
    }
    setShowGroupBuyNotice(false);

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

  const createHeading = showGroupBuyNotice
    ? "Group Buy"
    : isMultiItemSale
      ? bargainType === "garage-sale" ? "Register your garage sale" : "Register your moving sale"
      : isBargainListing ? "Create a bargain listing" : isEditing ? "Edit your listing" : "Create a new listing";
  const createDescription = showGroupBuyNotice
    ? "This feature isn't available yet."
    : isMultiItemSale
      ? "Add a cover photo, then price and describe every item for local bargain hunters."
      : isBargainListing ? "Share great local deals at prices people will love." : "Add the details buyers need to find and trust your item.";

  return (
    <main className={`post-ad-page ${isBargainListing ? "is-bargain-form" : ""} ${isMultiItemSale ? "is-event-sale" : ""}`}>
      <div className="post-ad-create-bar"><Link href={listingHomePath}><i className="fa-solid fa-chevron-left" aria-hidden="true" /> {isEditing ? "Edit listing" : "Create a new listing"}</Link></div>
      <header className="post-ad-intro">
        <h1>{createHeading}</h1>
        <p>{createDescription}</p>
      </header>
      <div className="post-ad-layout">
        <section className="post-ad-card" aria-label={isEditing ? "Edit marketplace listing" : "Create a new marketplace listing"}>
          <form ref={formRef} className="post-ad-form" onSubmit={submit}>
            <div className="post-field post-field-full post-title-field">
              <div className="post-section-heading"><span>1</span><h2>{showGroupBuyNotice ? "Basics" : isMultiItemSale ? "Event details" : "Basics"}</h2></div>
              {!isEditing && <div className="post-shop-type-field">
                <span className="post-shop-type-label">Shop Type</span>
                <div className="post-shop-type-options">
                  {postShopTypeOptions.map(({ value, label, icon }) => (
                    <button key={value} type="button" className={`post-shop-type-${value} ${activeShopType === value ? "is-selected" : ""}`} onClick={() => changeShopType(value)}>
                      <i className={`fa-solid ${icon}`} aria-hidden="true" />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>}
              {showGroupBuyNotice ? (
                <p className="post-field-hint post-coming-soon-hint">Group Buy isn&apos;t available yet — check back soon!</p>
              ) : <>
                <label htmlFor="post-title">{isMultiItemSale ? "Event title" : "Listing Title"}</label>
                <input id="post-title" name="title" type="text" minLength={4} maxLength={120} value={title} placeholder={isMultiItemSale ? "e.g. Huge weekend garage sale - everything must go!" : "e.g. iPhone 15 Pro Max - 256GB Titanium"} onChange={(event) => handleTitleChange(event.target.value)} required />
                {isMultiItemSale ? <>
                  <div className="event-schedule-grid">
                    <label>Start date<input type="date" value={eventStartDate} onChange={(event) => setEventStartDate(event.target.value)} required /></label>
                    <label>End date<input type="date" min={eventStartDate || undefined} value={eventEndDate} onChange={(event) => setEventEndDate(event.target.value)} required /></label>
                    <label>Start time<input type="time" value={eventStartTime} onChange={(event) => setEventStartTime(event.target.value)} required /></label>
                    <label>End time<input type="time" value={eventEndTime} onChange={(event) => setEventEndTime(event.target.value)} required /></label>
                  </div>
                  <label htmlFor="event-address">Event location (full address)</label>
                  <div className="event-address-input"><i className="fa-solid fa-location-dot" aria-hidden="true" /><input id="event-address" type="text" value={eventAddress} onChange={(event) => setEventAddress(event.target.value)} placeholder="123 Sunny Lane, Ponsonby, Auckland" required /></div>
                  <label htmlFor="event-description">Sale description</label>
                  <textarea id="event-description" className="event-description-input" value={description.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()} onChange={(event) => setDescription(event.target.value)} placeholder="Tell people what to expect. Mention special collections, availability, or instructions." maxLength={5_000} required />
                  <input type="hidden" name="body" value={description} />
                </> : (isBargainListing ? (
                  <SelectMenu id="bargain-type" name="bargain_type" label="Deal tier" icon="fa-tag" placeholder="Select deal tier" options={bargainListingTypes.filter((option) => !isMultiItemBargain(option.value)).map(({ label, value }) => ({ label, value }))} value={bargainType} onChange={changeBargainType} className="bargain-type-select" disabled={isEditing} />
                ) : <p className="post-field-hint">Your category will be automatically suggested based on the listing title.</p>)}
              </>}
            </div>

            {!showGroupBuyNotice && !isMultiItemSale && <div className="post-form-grid post-form-grid-three post-category-fields">
              <div className="post-section-heading"><span>3</span><h2>{isMultiItemSale ? "Sale settings" : "Pricing & category"}</h2></div>
              <div className="post-field post-price-field">
                <label htmlFor="listing-price">Price (NZD)</label>
                <div className="post-price-input">
                  <span>$</span>
                  <input id="listing-price" name="price" type="text" inputMode="decimal" value={fixedBargainPriceCents === null ? price : (fixedBargainPriceCents / 100).toFixed(0)} onChange={(event) => setPrice(event.target.value)} placeholder="0.00" readOnly={fixedBargainPriceCents !== null} aria-describedby={fixedBargainPriceCents !== null ? "bargain-fixed-price-hint" : undefined} />
                </div>
                {fixedBargainPriceCents !== null ? <p className="post-field-hint" id="bargain-fixed-price-hint">This deal type has a fixed ${fixedBargainPriceCents / 100} price.</p> : null}
              </div>
              <SelectMenu id="main-category" name="main_category" label="Main Category" icon="fa-layer-group" placeholder="Select main category" options={mainCategories} value={mainCategory} onChange={setMainCategory} />
              <SelectMenu id="sub-category" name="sub_category" label="Sub Category" icon="fa-tags" placeholder="Select sub category" options={subCategoryOptions} value={subCategory} onChange={setSubCategory} />
              <SelectMenu id="item-condition" name="item_condition" label="Item Condition" icon="fa-certificate" placeholder="Brand new" options={conditions} value={itemCondition} onChange={setItemCondition} />
            </div>}

            {!showGroupBuyNotice && <fieldset
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
                <legend><span className="post-section-heading"><span>2</span><span>{isMultiItemSale ? "Photos & GPT details" : "Photos & AI help"}</span></span></legend>
                <span>{isMultiItemSale ? "One cover photo + up to 10 item photos" : "Up to 10 photos"}</span>
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
                      <button className={`post-photo-slot ${photo.id === primaryPhotoId || (!primaryPhotoId && index === 0) ? "is-main" : ""}`} type="button" aria-label="Use this photo as main thumbnail" onClick={() => setPrimaryPhotoId(photo.id)}>
                        <img src={photo.url} alt={photo.name ?? photo.file?.name ?? "Listing photo"} />
                        {(photo.id === primaryPhotoId || (!primaryPhotoId && index === 0)) && <span>Main</span>}
                      </button>
                      <button className="post-photo-remove" type="button" aria-label={`Remove ${photo.name ?? photo.file?.name ?? "listing photo"}`} onClick={() => removePhoto(photo.id)}>
                        <i className="fa-solid fa-xmark" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                  {!isMultiItemSale && Array.from({ length: Math.min(1, Math.max(0, maxPhotosForCurrentListing - photos.length)) }).map((_, index) => (
                  <button className={`post-photo-upload ${photos.length ? "" : "is-initial"}`} key={`upload-${index}`} type="button" aria-label={index === 0 ? "Add a photo" : "Add another photo"} onClick={() => openPhotoPicker(isMultiItemSale ? "cover" : "listing")}>
                    <i className="fa-solid fa-camera" aria-hidden="true" />
                    <span>Add</span>
                  </button>
                  ))}
                </div> : null}
                {isMultiItemSale ? <div className="event-cover-preview-column"><BargainSaleCoverPreview imageUrl={photos[0]?.url} imageAlt={photos[0]?.name ?? photos[0]?.file?.name} title={title} type={bargainType as "moving-sale" | "garage-sale"} date={eventStartDate} location={eventAddress || [location.subLocation, location.mainLocation].filter(Boolean).join(", ")} description={description.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()} />{photos.length === 0 ? <button className="post-photo-upload event-cover-add-button" type="button" aria-label="Add a photo" onClick={() => openPhotoPicker("cover")}><i className="fa-solid fa-camera" aria-hidden="true" /><span>Add</span></button> : null}</div> : null}
              </div>
              <p className="post-upload-hint">
                <strong>{isMultiItemSale ? "Upload the cover first, then add item photos. GPT fills every item automatically." : "Click to upload or drag and drop multiple photos at once"}</strong>
              </p>
              {isMultiItemSale ? <div className="event-cover-ad-slot" aria-hidden="true"><i className="fa-solid fa-rectangle-ad" aria-hidden="true" /><span>Ad space reserved</span></div> : null}
              {isProcessingPhotos ? <p className="post-photo-processing" role="status">이미지를 처리하고 있습니다…</p> : null}
              {!isMultiItemSale && <section className="post-photo-ai-help" aria-label="AI help">
                <AiListingGenerator
                  title={title}
                  description={description}
                  price={price}
                  condition={conditions.find((condition) => condition.value === itemCondition)?.label ?? itemCondition}
                  location={[location.mainLocation, location.subLocation].filter(Boolean).join(", ")}
                  language={locale}
                  listingSpace={listingSpace}
                  additionalDetails={[
                    { label: "Trade method", value: tradeMethods.find((method) => method.value === tradeMethod)?.label ?? tradeMethod },
                    { label: "Meeting place", value: meetingPlaces.find((place) => place.value === meetingPlace)?.label ?? meetingPlace },
                    ...smartphoneSpecLabels.map(({ key, label }) => ({ label, value: smartphoneSpecs[key].trim() })),
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

            {!showGroupBuyNotice && isMultiItemSale ? <BargainSaleItemsEditor photos={eventInventoryPhotos} items={bargainSaleItems} onChange={updateBargainSaleItem} onAddItem={() => openPhotoPicker("inventory")} onRemoveItem={removeBargainSaleItem} onGenerateDescriptions={() => void generateItemDescriptions()} isGeneratingDescriptions={isGeneratingItemDescriptions} generationProgress={itemDescriptionProgress} generationError={itemDescriptionError} /> : null}

            {!showGroupBuyNotice && !isMultiItemSale && <div className="post-field post-field-full post-description-field">
              <div className="post-section-heading"><span>5</span><h2>{isMultiItemSale ? "Sale description" : "Description"}</h2></div>
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
                  <div className="post-editor-color-palette" role="group" aria-label="Text color">
                    {editorColors.map((color) => (
                      <button className={`post-editor-color-swatch ${textColor === color.value ? "is-selected" : ""}`} key={color.value} type="button" aria-label={`Set text color to ${color.label}`} title={color.label} disabled={isHtmlMode} style={{ backgroundColor: color.value }} onMouseDown={(event) => event.preventDefault()} onClick={() => {
                        setTextColor(color.value);
                        runEditorCommand("foreColor", color.value);
                      }} />
                    ))}
                  </div>
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
                  <div ref={editorRef} id="post-description" className="post-editor-content" contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" data-placeholder="Write a clear, detailed and friendly description buyers can trust. Include the item’s condition, key features, included accessories, any flaws, pickup or delivery details, and why you are selling. This description can be reused until the item sells, so make it helpful and complete." onInput={(event) => setDescription(event.currentTarget.innerHTML)} />
                )}
              </div>
              {shouldShowSmartphoneTemplate && (
                <section className="category-template-panel" aria-label="Smartphone listing details">
                  <div className="category-template-heading">
                    <div>
                      <h2>Smartphone details</h2>
                      <p>These fields will be added to your listing description when you post.</p>
                    </div>
                    <span>Electronics / Mobile phones</span>
                  </div>
                  <div className="category-template-grid">
                    <div className="post-field">
                      <label htmlFor="smartphone-brand">Brand</label>
                      <input id="smartphone-brand" type="text" value={smartphoneSpecs.brand} onChange={(event) => updateSmartphoneSpec("brand", event.target.value)} placeholder="e.g. Apple" />
                    </div>
                    <div className="post-field">
                      <label htmlFor="smartphone-model">Model</label>
                      <input id="smartphone-model" type="text" value={smartphoneSpecs.model} onChange={(event) => updateSmartphoneSpec("model", event.target.value)} placeholder="e.g. iPhone 15 Pro Max" />
                    </div>
                    <div className="post-field">
                      <label htmlFor="smartphone-storage">Storage / HDD capacity</label>
                      <input id="smartphone-storage" type="text" value={smartphoneSpecs.storage} onChange={(event) => updateSmartphoneSpec("storage", event.target.value)} placeholder="e.g. 256GB" />
                    </div>
                    <div className="post-field">
                      <label htmlFor="smartphone-memory">Memory</label>
                      <input id="smartphone-memory" type="text" value={smartphoneSpecs.memory} onChange={(event) => updateSmartphoneSpec("memory", event.target.value)} placeholder="e.g. 8GB RAM" />
                    </div>
                    <div className="post-field">
                      <label htmlFor="smartphone-colour">Colour</label>
                      <input id="smartphone-colour" type="text" value={smartphoneSpecs.colour} onChange={(event) => updateSmartphoneSpec("colour", event.target.value)} placeholder="e.g. Natural Titanium" />
                    </div>
              <SelectMenu id="smartphone-lcd-scratch" name="smartphone_lcd_scratch" label="LCD Scratch" icon="fa-mobile-screen" placeholder="Select LCD condition" options={smartphoneScratchOptions} value={smartphoneSpecs.lcdScratch} onChange={(value) => updateSmartphoneSpec("lcdScratch", value)} />
                  </div>
                </section>
              )}
            </div>}

            {!showGroupBuyNotice && !isMultiItemSale && <div className="post-form-grid post-location-grid">
              <div className="post-section-heading"><span>4</span><h2>{isMultiItemSale ? "Event location & trade" : "Location & trade"}</h2></div>
              <ListingLocationSelector value={location} onChange={setLocation} />
              <SelectMenu id="trade-method" name="trade_method" label="Trade Method" icon="fa-truck-fast" placeholder="Pickup & delivery" options={tradeMethods} value={tradeMethod} onChange={setTradeMethod} />
              <SelectMenu id="meeting-place" name="meeting_place" label="Meeting Place" icon="fa-building" placeholder="Select a safe meeting place" options={meetingPlaces} value={meetingPlace} onChange={setMeetingPlace} />
            </div>}

            {!showGroupBuyNotice && (notice || error) && (
              <p className={`post-create-status ${error ? "is-error" : "is-success"}`} role="status">
                {error ?? notice}
              </p>
            )}

            {!showGroupBuyNotice && <div className="post-submit-row">
              <p>By posting, you agree to our <Link href="#">Terms of Service</Link>.</p>
              <button
                className={`post-submit-button ${isSubmitting ? "is-progress" : ""}`}
                type="submit"
                disabled={isSubmitting || isProcessingPhotos}
                aria-busy={isSubmitting}
                aria-valuemin={isSubmitting ? 0 : undefined}
                aria-valuemax={isSubmitting ? 100 : undefined}
                aria-valuenow={isSubmitting ? submitButtonProgress : undefined}
                role={isSubmitting ? "progressbar" : undefined}
                style={{ "--post-submit-progress": `${submitButtonProgress}%` } as CSSProperties}
              >
                <span>{isSubmitting ? `${isEditing ? "Saving" : "Posting"} ${submitButtonProgress}%` : isEditing ? "Save changes" : isMultiItemSale ? `Launch ${bargainType === "garage-sale" ? "garage" : "moving"} sale` : "Post Now"}</span>
              </button>
            </div>}
          </form>
        </section>

        <aside className="post-ad-sidebar" aria-label="Listing preview and posting tips">
          <ProductCard className="post-ad-preview-card" listing={previewListing} imageSizes="240px" persistSave={false} isPreview />
          <section className="post-ad-tips" aria-label="Posting tips">
            <h2>Tips for a great listing</h2>
          <article><i className="fa-regular fa-lightbulb" aria-hidden="true" /><div><h2>Good Photos</h2><p>Take photos in bright, natural light from multiple angles.</p></div></article>
          <article><i className="fa-regular fa-circle-check" aria-hidden="true" /><div><h2>Clear Pricing</h2><p>Research similar items to set a competitive price.</p></div></article>
          <article><i className="fa-solid fa-shield-halved" aria-hidden="true" /><div><h2>Safety First</h2><p>Meet in public places and use secure payment methods.</p></div></article>
          </section>
        </aside>
      </div>
    </main>
  );
}
