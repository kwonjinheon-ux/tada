import type { SupabaseClient } from "@supabase/supabase-js";
import type { ServiceBadge, ServiceCategoryId } from "@/data/services";
import { getSignedStorageImages } from "@/lib/supabase/storage-image";

export type ServiceProfile = {
  id: string; ownerId: string | null; provider: string; businessName: string; category: ServiceCategoryId; description: string;
  providerType: "business" | "sole_trader"; serviceAreas: string[]; suburbs: string[];
  phone: string; email: string | null; website: string | null; streetAddress: string | null;
  weekdayHours: string | null; saturdayHours: string | null; sundayHours: string | null;
  foundedYear: number | null; serviceSummary: string | null; languages: string[]; addressVisibility: "area" | "exact";
  rating: number; reviewCount: number; priceFrom: number | null;
  priceUnit: string | null; serviceDetails: Record<string, unknown>; logo: string | null;
  images: string[]; badges: ServiceBadge[];
};

export type ServiceReview = { id: string; reviewerId: string; rating: number; comment: string; createdAt: string; reviewerName: string };

export type ServiceProfileResult = { profile: ServiceProfile; reviews: ServiceReview[]; viewerId: string | null };

type ProfileRow = {
  id: string; owner_id: string | null; category_slug: string; provider_name: string; business_name: string | null;
  description: string; provider_type: "business" | "sole_trader"; service_areas: string[] | null; suburbs: string[] | null;
  phone: string; email: string | null; website: string | null; street_address: string | null;
  weekday_hours: string | null; saturday_hours: string | null; sunday_hours: string | null;
  founded_year: number | null; service_summary: string | null; languages: string[] | null; address_visibility: string | null;
  rating: number; review_count: number; price_from: number | null; price_unit: string | null;
  service_details: unknown;
  service_listing_photos: Array<{ storage_path: string; display_order: number; photo_kind: string | null }> | null;
};

const PROFILE_COLUMNS = "id,owner_id,category_slug,provider_name,business_name,description,provider_type,service_areas,suburbs,phone,email,website,street_address,weekday_hours,saturday_hours,sunday_hours,founded_year,service_summary,languages,address_visibility,rating,review_count,price_from,price_unit,service_details,service_listing_photos(storage_path,display_order,photo_kind)";

/**
 * One provider's page, read on the server.
 *
 * The page used to assemble this from the browser in five sequential steps —
 * the listing, a fresh signature for each of its photos, the viewer, the
 * reviews, then the names behind those reviews — none of it starting until
 * hydration, with a sentence on screen the whole time. The three independent
 * reads now overlap, the photo signatures come from the shared cache the feeds
 * use, and the page arrives with its content already in it.
 */
export async function loadServiceProfile(supabase: SupabaseClient, serviceId: string): Promise<ServiceProfileResult | null> {
  const [listingResult, reviewsResult, { data: { user } }] = await Promise.all([
    supabase.from("service_listings").select(PROFILE_COLUMNS).eq("id", serviceId).maybeSingle(),
    supabase.from("service_reviews").select("id,reviewer_id,rating,comment,created_at", { count: "exact" }).eq("service_id", serviceId).order("created_at", { ascending: false }),
    supabase.auth.getUser(),
  ]);
  const data = listingResult.data as unknown as ProfileRow | null;
  if (listingResult.error || !data) return null;

  const photos = [...(data.service_listing_photos ?? [])].sort((left, right) => left.display_order - right.display_order);
  const logoPath = photos.find((photo) => photo.photo_kind === "logo")?.storage_path;
  const galleryPaths = photos.filter((photo) => photo.photo_kind !== "logo").map((photo) => photo.storage_path);

  // The gallery is the page's main image, so it is signed at reading size; the
  // logo is the small identity mark beside the name.
  const reviewRows = (reviewsResult.data ?? []) as Array<{ id: string; reviewer_id: string; rating: number; comment: string; created_at: string }>;
  const reviewerIds = [...new Set(reviewRows.map((review) => review.reviewer_id))];
  const [galleryUrls, logoUrls, reviewerNames] = await Promise.all([
    getSignedStorageImages("service-listing-images", galleryPaths, "gallery"),
    getSignedStorageImages("service-listing-images", logoPath ? [logoPath] : [], "card"),
    reviewerIds.length
      ? supabase.from("profiles").select("id,display_name").in("id", reviewerIds)
        .then(({ data: profiles }) => new Map(((profiles ?? []) as Array<{ id: string; display_name: string | null }>).map((row) => [row.id, row.display_name])))
      : Promise.resolve(new Map<string, string | null>()),
  ]);

  const reviews = reviewRows.map((review) => ({
    id: review.id,
    reviewerId: review.reviewer_id,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.created_at,
    reviewerName: reviewerNames.get(review.reviewer_id) ?? "",
  }));
  // The stored counters are a cache of the review table; the rows themselves
  // are what the page just read, so they decide.
  const reviewCount = reviewsResult.count ?? reviews.length;
  const rating = reviewCount && reviews.length
    ? reviews.reduce((total, review) => total + review.rating, 0) / reviews.length
    : Number(data.rating);

  return {
    viewerId: user?.id ?? null,
    reviews,
    profile: {
      id: data.id, ownerId: data.owner_id, provider: data.provider_name, businessName: data.business_name ?? data.provider_name, category: data.category_slug as ServiceCategoryId,
      description: data.description, providerType: data.provider_type, serviceAreas: data.service_areas ?? [],
      suburbs: data.suburbs ?? [], phone: data.phone, email: data.email, website: data.website,
      streetAddress: data.street_address, weekdayHours: data.weekday_hours, saturdayHours: data.saturday_hours,
      sundayHours: data.sunday_hours, foundedYear: data.founded_year, serviceSummary: data.service_summary,
      languages: data.languages ?? [], addressVisibility: data.address_visibility === "exact" ? "exact" : "area",
      rating,
      reviewCount,
      priceFrom: data.price_from === null ? null : Number(data.price_from),
      priceUnit: data.price_unit,
      serviceDetails: data.service_details && typeof data.service_details === "object" && !Array.isArray(data.service_details) ? data.service_details as Record<string, unknown> : {},
      logo: logoPath ? logoUrls.get(logoPath) ?? null : null,
      images: galleryPaths.map((path) => galleryUrls.get(path)).filter((url): url is string => Boolean(url)),
      badges: Number(data.rating) >= 4.5 ? ["highlyRated"] : ["new"],
    },
  };
}
