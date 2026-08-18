import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";
import { marketFeedQuerySchema } from "@/contracts/api";
import type { Listing } from "@/data/listings";
import { formatMarketPrice } from "@/lib/market/format-price";
import { getSignedStorageImages } from "@/lib/supabase/storage-image";
import { getBargainFeed } from "@/lib/bargain/feed";
import { encodeCursor, decodeCursor, type Cursor } from "@/lib/pagination/cursor";
import { containsProhibitedMarketplaceContent } from "@/lib/market/prohibited-items";

const PAGE_SIZE = 24;
type FeedQuery = z.infer<typeof marketFeedQuerySchema>;
type Row = { id: string; owner_id: string; title: string; price_cents: number; region_city: string | null; region_suburb: string | null; main_location: string | null; sub_location: string | null; item_condition: "brand_new" | "like_new" | "excellent" | "good" | "fair"; status: "published" | "pending" | "sold"; category_slug: string | null; subcategory_slug: string | null; created_at: string };
type Photo = { listing_id: string; storage_path: string | null; original_name: string | null; is_primary: boolean; display_order: number };

function formatLocation(city: string | null, suburb: string | null) { return [suburb, city].filter(Boolean).join(", ") || "New Zealand"; }
function safeSearch(value: string) { return value.replace(/[,%()]/g, " ").trim(); }
function exactFilterValue(value: string) { return JSON.stringify(value); }

export async function getMarketFeed(supabase: SupabaseClient, rawQuery: FeedQuery, userId?: string, options: { pageSize?: number } = {}): Promise<{ listings: Listing[]; savedListingIds: string[]; nextCursor: string | null }> {
  const pageSize = options.pageSize ?? PAGE_SIZE;
  const query = marketFeedQuerySchema.parse(rawQuery);
  if (query.q && containsProhibitedMarketplaceContent(query.q)) return { listings: [], savedListingIds: [], nextCursor: null };
  const category = query.category && query.category !== "all" ? query.category : null;
  const subcategory = query.subcategory && query.subcategory !== "all" ? query.subcategory : null;
  const sortColumn = query.sort === "newest" ? "created_at" : "price_cents";
  const ascending = query.sort === "priceAsc";
  const cursor = decodeCursor(query.cursor);
  let request = supabase.from("market_listings").select("id,owner_id,title,price_cents,region_city,region_suburb,main_location,sub_location,item_condition,status,category_slug,subcategory_slug,created_at").in("status", ["published", "pending", "sold"]);
  if (category) request = request.eq("category_slug", category);
  if (subcategory) request = request.eq("subcategory_slug", subcategory);
  if (query.maxPrice) request = request.lte("price_cents", query.maxPrice * 100);
  if (query.condition) request = request.eq("item_condition", query.condition);
  if (query.mainLocation) { const value = exactFilterValue(query.mainLocation); request = request.or(`main_location.eq.${value},and(main_location.is.null,region_city.eq.${value})`); }
  if (query.subLocation) { const value = exactFilterValue(query.subLocation); request = request.or(`sub_location.eq.${value},and(sub_location.is.null,region_suburb.eq.${value})`); }
  const search = safeSearch(query.q);
  if (search) request = request.or(`title.ilike.%${search}%,region_city.ilike.%${search}%,region_suburb.ilike.%${search}%,main_location.ilike.%${search}%,sub_location.ilike.%${search}%`);
  if (cursor) {
    const operator = ascending ? "gt" : "lt";
    request = request.or(`${sortColumn}.${operator}.${cursor.value},and(${sortColumn}.eq.${cursor.value},id.${operator}.${cursor.id})`);
  }
  const primaryResult = await request.order(sortColumn, { ascending }).order("id", { ascending }).limit(pageSize + 1);
  let data = primaryResult.data as Row[] | null;
  // Deployments can temporarily run newer application code before the additive
  // location migration. Fall back to the legacy columns instead of presenting an
  // empty marketplace while the migration is applied.
  if (primaryResult.error && ["42703", "PGRST204"].includes(primaryResult.error.code)) {
    let legacyRequest = supabase.from("market_listings").select("id,owner_id,title,price_cents,region_city,region_suburb,item_condition,status,category_slug,subcategory_slug,created_at").in("status", ["published", "pending", "sold"]);
    if (category) legacyRequest = legacyRequest.eq("category_slug", category);
    if (subcategory) legacyRequest = legacyRequest.eq("subcategory_slug", subcategory);
    if (query.maxPrice) legacyRequest = legacyRequest.lte("price_cents", query.maxPrice * 100);
    if (query.condition) legacyRequest = legacyRequest.eq("item_condition", query.condition);
    if (query.mainLocation) legacyRequest = legacyRequest.eq("region_city", query.mainLocation);
    if (query.subLocation) legacyRequest = legacyRequest.eq("region_suburb", query.subLocation);
    if (search) legacyRequest = legacyRequest.or(`title.ilike.%${search}%,region_city.ilike.%${search}%,region_suburb.ilike.%${search}%`);
    if (cursor) { const operator = ascending ? "gt" : "lt"; legacyRequest = legacyRequest.or(`${sortColumn}.${operator}.${cursor.value},and(${sortColumn}.eq.${cursor.value},id.${operator}.${cursor.id})`); }
    data = (await legacyRequest.order(sortColumn, { ascending }).order("id", { ascending }).limit(pageSize + 1)).data as Row[] | null;
  }
  const rows = ((data ?? []) as Row[]);
  const page = rows.slice(0, pageSize);
  const ids = page.map((row) => row.id);
  const { data: photoRows } = ids.length ? await supabase.from("market_listing_photos").select("listing_id,storage_path,original_name,is_primary,display_order").in("listing_id", ids).order("display_order") : { data: [] };
  const { data: commentRows } = ids.length ? await supabase.from("market_listing_comments").select("listing_id").in("listing_id", ids).is("deleted_at", null) : { data: [] };
  const photos = new Map<string, Photo>();
  for (const photo of (photoRows ?? []) as Photo[]) {
    const current = photos.get(photo.listing_id);
    if (!current || photo.is_primary || (!current.is_primary && photo.display_order < current.display_order)) photos.set(photo.listing_id, photo);
  }
  const imagePaths = [...photos.values()].map((photo) => photo.storage_path).filter((path): path is string => Boolean(path));
  const signedImages = await getSignedStorageImages("market-listing-images", imagePaths, "thumbnail");
  const savedListingIds = userId && ids.length
    ? ((await supabase.from("market_wishlist").select("listing_id").eq("user_id", userId).in("listing_id", ids)).data ?? []).map((row) => row.listing_id as string)
    : [];
  const commentCounts = new Map<string, number>();
  for (const row of (commentRows ?? []) as { listing_id: string }[]) commentCounts.set(row.listing_id, (commentCounts.get(row.listing_id) ?? 0) + 1);
  const listings = page.map((row) => {
    const photo = photos.get(row.id);
    return { id: row.id, title: row.title, price: formatMarketPrice(row.price_cents), location: formatLocation(row.main_location ?? row.region_city, row.sub_location ?? row.region_suburb), image: photo?.storage_path ? signedImages.get(photo.storage_path) ?? "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=700&q=80" : "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=700&q=80", imageAlt: photo?.original_name ?? row.title, categorySlug: row.category_slug, subcategorySlug: row.subcategory_slug, badge: row.status === "published" ? "Newly Listed" : undefined, status: row.status === "sold" ? "sold" : row.status === "pending" ? "pending" : "available", isOwner: row.owner_id === userId, commentCount: commentCounts.get(row.id) ?? 0, sortValue: query.sort === "newest" ? row.created_at : row.price_cents } satisfies Listing;
  });
  const last = page.at(-1);
  return { listings, savedListingIds, nextCursor: rows.length > pageSize && last ? encodeCursor(query.sort === "newest" ? last.created_at : last.price_cents, last.id) : null };
}

const allBargainTypes = ["2-dollar-deals", "5-dollar-deals", "10-dollar-deals", "moving-sale", "garage-sale"];

type MergedCursorPayload = { market: Cursor | null; bargain: Cursor | null };

function isCursorLike(value: unknown): value is Cursor | null {
  return value === null || (typeof value === "object" && value !== null && typeof (value as Cursor).id === "string");
}
function encodeMergedCursor(payload: MergedCursorPayload) { return Buffer.from(JSON.stringify(payload)).toString("base64url"); }
function decodeMergedCursor(cursor: string | undefined): MergedCursorPayload | null {
  if (!cursor) return null;
  try {
    const value = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as MergedCursorPayload;
    return isCursorLike(value.market) && isCursorLike(value.bargain) ? value : null;
  } catch { return null; }
}

// The "All" shop-type feed for /market. Combines today's secondhand listings with every
// bargain listing type (everything except the not-yet-real "group-buy"), sorted together
// by the same column each source already sorts by. Each page fetches up to PAGE_SIZE items
// from BOTH sources, merge-sorts the candidates, and shows the top PAGE_SIZE — the merged
// cursor tracks, per source, the last item actually shown (not merely fetched), so any
// unshown "leftover" candidates from a source that lost out this round get re-fetched
// (not skipped) the next time that source's cursor is used.
export async function getMergedMarketFeed(supabase: SupabaseClient, rawQuery: FeedQuery, userId?: string, options: { pageSize?: number } = {}): Promise<{ listings: Listing[]; savedListingIds: string[]; nextCursor: string | null }> {
  const pageSize = options.pageSize ?? PAGE_SIZE;
  const query = marketFeedQuerySchema.parse(rawQuery);
  if (query.q && containsProhibitedMarketplaceContent(query.q)) return { listings: [], savedListingIds: [], nextCursor: null };
  const mergedCursor = decodeMergedCursor(query.cursor);
  const marketCursor = mergedCursor?.market ?? null;
  const bargainCursor = mergedCursor?.bargain ?? null;

  const [marketResult, bargainResult] = await Promise.all([
    getMarketFeed(supabase, { ...query, cursor: marketCursor ? encodeCursor(marketCursor.value, marketCursor.id) : undefined }, userId, { pageSize }),
    getBargainFeed(supabase, {
      q: query.q,
      sort: query.sort,
      mainLocation: query.mainLocation,
      subLocation: query.subLocation,
      category: query.category,
      subcategory: query.subcategory,
      maxPrice: query.maxPrice,
      condition: query.condition,
      bargain: "all",
      cursor: bargainCursor ? encodeCursor(bargainCursor.value, bargainCursor.id) : undefined,
    }, userId, { bargainTypes: allBargainTypes, pageSize }),
  ]);

  const ascending = query.sort === "priceAsc";
  const merged = [...marketResult.listings, ...bargainResult.listings].sort((left, right) => {
    const a = left.sortValue ?? "";
    const b = right.sortValue ?? "";
    if (a === b) return 0;
    return ascending ? (a < b ? -1 : 1) : (a > b ? -1 : 1);
  });
  const page = merged.slice(0, pageSize);
  const marketIds = new Set(marketResult.listings.map((listing) => listing.id));
  const bargainIds = new Set(bargainResult.listings.map((listing) => listing.id));
  const lastShownMarket = [...page].reverse().find((listing) => marketIds.has(listing.id));
  const lastShownBargain = [...page].reverse().find((listing) => bargainIds.has(listing.id));
  const nextMarketCursor: Cursor | null = lastShownMarket ? { value: lastShownMarket.sortValue ?? "", id: lastShownMarket.id } : marketCursor;
  const nextBargainCursor: Cursor | null = lastShownBargain ? { value: lastShownBargain.sortValue ?? "", id: lastShownBargain.id } : bargainCursor;
  const hasNextPage = merged.length > pageSize || Boolean(marketResult.nextCursor) || Boolean(bargainResult.nextCursor);

  return {
    listings: page,
    savedListingIds: [...marketResult.savedListingIds, ...bargainResult.savedListingIds],
    nextCursor: hasNextPage ? encodeMergedCursor({ market: nextMarketCursor, bargain: nextBargainCursor }) : null,
  };
}
