import type { SupabaseClient } from "@supabase/supabase-js";
import type { ServiceCategoryId, ServiceListing } from "@/data/services";
import { getSignedStorageImages } from "@/lib/supabase/storage-image";

export type ServicesFeedQuery = {
  category?: string | null;
  mainLocation?: string | null;
  subLocation?: string | null;
};

export type ServicesFeedResult = { services: ServiceListing[] };

const LISTING_COLUMNS = "id,owner_id,category_slug,provider_name,business_name,description,phone,email,website,street_address,provider_type,service_areas,suburbs,rating,review_count,price_from,price_unit,created_at,service_listing_photos(storage_path,display_order,photo_kind)";

type ServiceRow = {
  id: string;
  owner_id: string;
  category_slug: string;
  provider_name: string;
  business_name: string | null;
  description: string | null;
  phone: string;
  email: string | null;
  website: string | null;
  street_address: string | null;
  provider_type: string;
  service_areas: string[] | null;
  suburbs: string[] | null;
  rating: number;
  review_count: number;
  created_at: string;
  price_from: number | null;
  price_unit: string | null;
  service_listing_photos: Array<{ storage_path: string; display_order: number; photo_kind: string | null }> | null;
};

/**
 * A provider covering the whole country, or one that never named an area,
 * stays in every list; naming areas is what narrows it. Postgres array
 * containment cannot express that "or unspecified" arm cleanly, so the region
 * arrives filtered here rather than in the query.
 */
function servesLocation(row: ServiceRow, mainLocation: string, subLocation: string) {
  if (!mainLocation) return true;
  const areas = row.service_areas ?? [];
  if (areas.length && !areas.includes("All New Zealand") && !areas.includes(mainLocation)) return false;
  const suburbs = row.suburbs ?? [];
  return !subLocation || !suburbs.length || suburbs.includes(subLocation);
}

/**
 * The services list, read on the server.
 *
 * The page used to do this from the browser, four round trips deep — listings,
 * then the signed-in user, then their saved services, then a fresh signature
 * for every photo — all of it after hydration, and all of it again whenever the
 * reader switched language. Here the independent reads overlap, the signatures
 * come from the shared cache the other feeds use, and the first page arrives
 * with the HTML.
 *
 * The price string stays out of the result: it is the one field that reads
 * differently per language, and leaving it to the card keeps this cacheable.
 */
export async function loadServicesFeed(supabase: SupabaseClient, query: ServicesFeedQuery = {}): Promise<ServicesFeedResult> {
  const category = query.category || null;
  const mainLocation = query.mainLocation?.trim() || "";
  const subLocation = query.subLocation?.trim() || "";

  let listingsRequest = supabase.from("service_listings").select(LISTING_COLUMNS).eq("status", "published").order("created_at", { ascending: false });
  if (category) listingsRequest = listingsRequest.eq("category_slug", category);

  // The listings and the viewer are independent; the saved set needs the viewer.
  const [{ data, error }, { data: { user } }] = await Promise.all([
    listingsRequest,
    supabase.auth.getUser(),
  ]);
  if (error || !data) return { services: [] };

  const rows = (data as unknown as ServiceRow[]).filter((row) => servesLocation(row, mainLocation, subLocation));
  const photoPaths = rows.flatMap((row) => (row.service_listing_photos ?? []).map((photo) => photo.storage_path));
  const [savedServiceIds, signedByPath] = await Promise.all([
    user
      ? supabase.from("service_wishlist").select("service_id").eq("user_id", user.id)
        .then(({ data: saved }) => new Set((saved ?? []).map((saved_row: { service_id: string }) => saved_row.service_id)))
      : Promise.resolve(new Set<string>()),
    getSignedStorageImages("service-listing-images", photoPaths, "card"),
  ]);

  return {
    services: rows.map((row) => {
      const photos = [...(row.service_listing_photos ?? [])].sort((left, right) => left.display_order - right.display_order);
      const logoPhoto = photos.find((photo) => photo.photo_kind === "logo");
      // The card leads with the representative work photo and keeps the logo
      // as the small identity mark beside the business name.
      const galleryPhoto = photos.find((photo) => photo.photo_kind !== "logo");
      const cardPhoto = galleryPhoto ?? logoPhoto;
      return {
        id: row.id,
        isOwner: row.owner_id === user?.id,
        isSaved: savedServiceIds.has(row.id),
        category: row.category_slug as ServiceCategoryId,
        badges: row.review_count > 0 && row.rating >= 4.5 ? ["highlyRated"] : [],
        provider: row.provider_name,
        businessName: row.business_name ?? row.provider_name,
        email: row.email ?? undefined,
        website: row.website ?? undefined,
        streetAddress: row.street_address ?? undefined,
        phone: row.phone,
        providerType: row.provider_type === "business" ? "businesses" : "individuals",
        rating: Number(row.rating),
        reviewCount: row.review_count,
        image: (cardPhoto?.storage_path ? signedByPath.get(cardPhoto.storage_path) : undefined) ?? "/images/home/journey-services.png",
        logo: (logoPhoto?.storage_path ? signedByPath.get(logoPhoto.storage_path) : undefined) ?? undefined,
        description: row.description ?? undefined,
        // Verification is not yet stored for service listings. Never infer it.
        isVerified: false,
        createdAt: row.created_at,
        location: row.service_areas?.[0] ?? "New Zealand",
        serviceAreas: row.service_areas ?? [],
        suburbs: row.suburbs ?? [],
        priceFrom: row.price_from,
        priceUnit: row.price_unit,
        imageAlt: row.provider_name,
      } satisfies ServiceListing;
    }),
  };
}
