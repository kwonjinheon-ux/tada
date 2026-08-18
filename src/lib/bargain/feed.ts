import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";
import { bargainFeedQuerySchema } from "@/contracts/api";
import type { Listing } from "@/data/listings";
import { formatMarketPrice } from "@/lib/market/format-price";
import { getSignedStorageImages } from "@/lib/supabase/storage-image";
import { formatBargainEventDateRange } from "@/lib/bargain/format-event-date";
import { encodeCursor, decodeCursor } from "@/lib/pagination/cursor";
import { containsProhibitedMarketplaceContent } from "@/lib/market/prohibited-items";

type BargainQuery = z.infer<typeof bargainFeedQuerySchema>;
type BargainRow = { id: string; owner_id: string; title: string; price_cents: number; bargain_type: string; main_location: string | null; sub_location: string | null; region_city: string | null; region_suburb: string | null; category_slug: string | null; subcategory_slug: string | null; event_start_date: string | null; event_end_date: string | null; status: "published" | "pending" | "sold"; created_at: string };
type Photo = { listing_id: string; storage_path: string | null; original_name: string | null; is_primary: boolean; display_order: number };

const allBargainTypes = ["2-dollar-deals", "5-dollar-deals", "10-dollar-deals", "moving-sale", "garage-sale"];
const defaultPageSize = 60;

function formatLocation(mainLocation: string | null, subLocation: string | null, regionCity: string | null, regionSuburb: string | null) {
  return [subLocation ?? regionSuburb, mainLocation ?? regionCity].filter(Boolean).join(", ") || "New Zealand";
}

export async function getBargainFeed(
  supabase: SupabaseClient,
  rawQuery: BargainQuery,
  userId?: string,
  options?: { bargainTypes?: string[]; pageSize?: number },
): Promise<{ listings: Listing[]; savedListingIds: string[]; nextCursor: string | null }> {
  const query = bargainFeedQuerySchema.parse(rawQuery);
  if (query.q && containsProhibitedMarketplaceContent(query.q)) return { listings: [], savedListingIds: [], nextCursor: null };
  const pageSize = options?.pageSize ?? defaultPageSize;
  const category = query.category && query.category !== "all" ? query.category : null;
  const subcategory = query.subcategory && query.subcategory !== "all" ? query.subcategory : null;
  const sortColumn = query.sort === "priceAsc" || query.sort === "priceDesc" ? "price_cents" : "created_at";
  const ascending = query.sort === "priceAsc";
  const cursor = decodeCursor(query.cursor);
  let request = supabase
    .from("bargain_listings")
    .select("id,owner_id,title,price_cents,bargain_type,main_location,sub_location,region_city,region_suburb,category_slug,subcategory_slug,event_start_date,event_end_date,status,created_at")
    .in("status", ["published", "pending", "sold"]);

  if (query.mainLocation) request = request.eq("main_location", query.mainLocation);
  if (query.subLocation) request = request.eq("sub_location", query.subLocation);
  if (query.q) request = request.ilike("title", `%${query.q.replace(/[,%()]/g, " ").trim()}%`);
  if (category) request = request.eq("category_slug", category);
  if (subcategory) request = request.eq("subcategory_slug", subcategory);
  if (query.maxPrice) request = request.lte("price_cents", query.maxPrice * 100);
  if (query.condition) request = request.eq("item_condition", query.condition);
  // An explicit bargainTypes override (used by the /market/* shop-type routes and the
  // merged "All" feed) takes priority over the legacy single-value `bargain` param the
  // old /bargain page still sends.
  const bargainTypes = options?.bargainTypes ?? (allBargainTypes.includes(query.bargain) ? [query.bargain] : null);
  if (bargainTypes) request = bargainTypes.length === 1 ? request.eq("bargain_type", bargainTypes[0]) : request.in("bargain_type", bargainTypes);
  if (cursor) {
    const operator = ascending ? "gt" : "lt";
    request = request.or(`${sortColumn}.${operator}.${cursor.value},and(${sortColumn}.eq.${cursor.value},id.${operator}.${cursor.id})`);
  }
  request = request.order(sortColumn, { ascending }).order("id", { ascending });

  const { data } = await request.limit(pageSize + 1);
  const allRows = (data ?? []) as BargainRow[];
  const rows = allRows.slice(0, pageSize);
  const ids = rows.map((row) => row.id);
  const [{ data: photoRows }, savedRows, { data: commentRows }] = await Promise.all([
    ids.length
      ? supabase.from("bargain_listing_photos").select("listing_id,storage_path,original_name,is_primary,display_order").in("listing_id", ids).order("display_order")
      : Promise.resolve({ data: [] }),
    userId && ids.length
      ? supabase.from("bargain_wishlist").select("listing_id").eq("user_id", userId).in("listing_id", ids)
      : Promise.resolve({ data: [] }),
    ids.length
      ? supabase.from("bargain_listing_comments").select("listing_id").in("listing_id", ids).is("deleted_at", null)
      : Promise.resolve({ data: [] }),
  ]);
  const primaryPhotos = new Map<string, Photo>();
  for (const photo of (photoRows ?? []) as Photo[]) {
    const current = primaryPhotos.get(photo.listing_id);
    if (!current || photo.is_primary || (!current.is_primary && photo.display_order < current.display_order)) primaryPhotos.set(photo.listing_id, photo);
  }
  const paths = [...primaryPhotos.values()].map((photo) => photo.storage_path).filter((path): path is string => Boolean(path));
  const signedImages = await getSignedStorageImages("bargain-listing-images", paths, "thumbnail");
  const fallbackImage = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=700&q=80";
  const savedListingIds = ((savedRows.data ?? []) as { listing_id: string }[]).map((row) => row.listing_id);
  const commentCounts = new Map<string, number>();
  for (const row of (commentRows ?? []) as { listing_id: string }[]) commentCounts.set(row.listing_id, (commentCounts.get(row.listing_id) ?? 0) + 1);
  const last = rows.at(-1);
  const nextCursor = allRows.length > pageSize && last ? encodeCursor(query.sort === "priceAsc" || query.sort === "priceDesc" ? last.price_cents : last.created_at, last.id) : null;

  return {
    listings: rows.map((row) => {
      const photo = primaryPhotos.get(row.id);
      return {
        id: row.id,
        title: row.title,
        price: formatMarketPrice(row.price_cents),
        location: formatLocation(row.main_location, row.sub_location, row.region_city, row.region_suburb),
        image: photo?.storage_path ? signedImages.get(photo.storage_path) ?? fallbackImage : fallbackImage,
        imageAlt: photo?.original_name ?? row.title,
        categorySlug: row.category_slug,
        subcategorySlug: row.subcategory_slug,
        bargainType: row.bargain_type,
        eventDateRange: row.bargain_type === "moving-sale" || row.bargain_type === "garage-sale" ? formatBargainEventDateRange(row.event_start_date, row.event_end_date) : null,
        badge: row.status === "published" ? "Newly Listed" : undefined,
        status: row.status === "sold" ? "sold" : row.status === "pending" ? "pending" : "available",
        isOwner: row.owner_id === userId,
        commentCount: commentCounts.get(row.id) ?? 0,
        sortValue: query.sort === "priceAsc" || query.sort === "priceDesc" ? row.price_cents : row.created_at,
      } satisfies Listing;
    }),
    savedListingIds,
    nextCursor,
  };
}
