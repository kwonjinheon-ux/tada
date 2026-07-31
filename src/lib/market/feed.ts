import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";
import { marketFeedQuerySchema } from "@/contracts/api";
import type { Listing } from "@/data/listings";
import { formatMarketPrice } from "@/lib/market/format-price";
import { getSignedStorageImages } from "@/lib/supabase/storage-image";

const PAGE_SIZE = 24;
type FeedQuery = z.infer<typeof marketFeedQuerySchema>;
type Row = { id: string; title: string; price_cents: number; region_city: string | null; region_suburb: string | null; item_condition: "brand_new" | "like_new" | "excellent" | "good" | "fair"; status: "published" | "pending" | "sold"; category_slug: string | null; subcategory_slug: string | null; created_at: string };
type Photo = { listing_id: string; storage_path: string | null; original_name: string | null; is_primary: boolean; display_order: number };
type Cursor = { value: string | number; id: string };

function decodeCursor(cursor: string | undefined): Cursor | null {
  if (!cursor) return null;
  try {
    const value = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as Cursor;
    return typeof value.id === "string" && (typeof value.value === "string" || typeof value.value === "number") ? value : null;
  } catch { return null; }
}
function encodeCursor(value: string | number, id: string) { return Buffer.from(JSON.stringify({ value, id })).toString("base64url"); }
function formatLocation(city: string | null, suburb: string | null) { return [suburb, city].filter(Boolean).join(", ") || "New Zealand"; }
function safeSearch(value: string) { return value.replace(/[,%()]/g, " ").trim(); }

export async function getMarketFeed(supabase: SupabaseClient, rawQuery: FeedQuery, userId?: string): Promise<{ listings: Listing[]; savedListingIds: string[]; nextCursor: string | null }> {
  const query = marketFeedQuerySchema.parse(rawQuery);
  const category = query.category && query.category !== "all" ? query.category : null;
  const subcategory = query.subcategory && query.subcategory !== "all" ? query.subcategory : null;
  const sortColumn = query.sort === "newest" ? "created_at" : "price_cents";
  const ascending = query.sort === "priceAsc";
  const cursor = decodeCursor(query.cursor);
  let request = supabase.from("market_listings").select("id,title,price_cents,region_city,region_suburb,item_condition,status,category_slug,subcategory_slug,created_at").in("status", ["published", "pending", "sold"]);
  if (category) request = request.eq("category_slug", category);
  if (subcategory) request = request.eq("subcategory_slug", subcategory);
  if (query.maxPrice) request = request.lte("price_cents", query.maxPrice * 100);
  if (query.condition) request = request.eq("item_condition", query.condition);
  const search = safeSearch(query.q);
  if (search) request = request.or(`title.ilike.%${search}%,region_city.ilike.%${search}%,region_suburb.ilike.%${search}%`);
  if (cursor) {
    const operator = ascending ? "gt" : "lt";
    request = request.or(`${sortColumn}.${operator}.${cursor.value},and(${sortColumn}.eq.${cursor.value},id.${operator}.${cursor.id})`);
  }
  const { data } = await request.order(sortColumn, { ascending }).order("id", { ascending }).limit(PAGE_SIZE + 1);
  const rows = ((data ?? []) as Row[]);
  const page = rows.slice(0, PAGE_SIZE);
  const ids = page.map((row) => row.id);
  const { data: photoRows } = ids.length ? await supabase.from("market_listing_photos").select("listing_id,storage_path,original_name,is_primary,display_order").in("listing_id", ids).order("display_order") : { data: [] };
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
  const listings = page.map((row) => {
    const photo = photos.get(row.id);
    return { id: row.id, title: row.title, price: formatMarketPrice(row.price_cents), location: formatLocation(row.region_city, row.region_suburb), image: photo?.storage_path ? signedImages.get(photo.storage_path) ?? "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=700&q=80" : "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=700&q=80", imageAlt: photo?.original_name ?? row.title, categorySlug: row.category_slug, subcategorySlug: row.subcategory_slug, badge: row.status === "published" ? "Newly Listed" : undefined, status: row.status === "sold" ? "sold" : row.status === "pending" ? "pending" : "available" } satisfies Listing;
  });
  const last = page.at(-1);
  return { listings, savedListingIds, nextCursor: rows.length > PAGE_SIZE && last ? encodeCursor(query.sort === "newest" ? last.created_at : last.price_cents, last.id) : null };
}
