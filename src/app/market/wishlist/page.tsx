import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { WishlistClient, type WishlistItem } from "@/components/market/WishlistClient";
import { formatMarketPrice } from "@/lib/market/format-price";
import { getServerUser } from "@/lib/auth-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSignedStorageImages } from "@/lib/supabase/storage-image";

export const dynamic = "force-dynamic";
export const metadata = { title: "Wishlist" };

type SavedRow = { listing_id: string; created_at: string };
type ViewedRow = { listing_id: string; last_viewed_at: string };
type ListingRow = { id: string; title: string; price_cents: number; category_slug: string | null; status: "published" | "pending" | "sold" | "archived"; };
type BargainListingRow = { id: string; title: string; price_cents: number; category_slug: string | null; bargain_type: string; status: "published" | "pending" | "sold" | "archived"; };
type PhotoRow = { listing_id: string; storage_path: string; display_order: number };

function categoryLabel(slug: string | null) {
  if (!slug) return "Marketplace";
  return slug.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" & ");
}

export default async function MarketWishlistPage() {
  const user = await getServerUser();
  if (!user) redirect("/login?redirectTo=%2Fmarket%2Fwishlist");
  const supabase = await createServerSupabaseClient();
  if (!supabase) return <main className="marketplace-page dashboard-page dashboard-layout wishlist-page"><DashboardSidebar context="market" active="Wishlist" /><WishlistClient initialItems={[]} recentlyViewed={[]} /></main>;

  const [{ data: savedRows }, { data: bargainSavedRows }, { data: viewedRows }] = await Promise.all([
    supabase.from("market_wishlist").select("listing_id,created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("bargain_wishlist").select("listing_id,created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("market_listing_views").select("listing_id,last_viewed_at").eq("user_id", user.id).order("last_viewed_at", { ascending: false }).limit(8),
  ]);
  const saved = (savedRows ?? []) as SavedRow[];
  const bargainSaved = (bargainSavedRows ?? []) as SavedRow[];
  const viewed = (viewedRows ?? []) as ViewedRow[];
  const ids = [...new Set([...saved.map((row) => row.listing_id), ...viewed.map((row) => row.listing_id)])];
  const { data: listingRows } = ids.length ? await supabase.from("market_listings").select("id,title,price_cents,category_slug,status").in("id", ids) : { data: [] };
  const listings = (listingRows ?? []) as ListingRow[];
  const { data: photoRows } = ids.length ? await supabase.from("market_listing_photos").select("listing_id,storage_path,display_order").in("listing_id", ids).order("display_order", { ascending: true }) : { data: [] };
  const photos = (photoRows ?? []) as PhotoRow[];
  const primaryPhotos = new Map<string, string>();
  for (const photo of photos) if (!primaryPhotos.has(photo.listing_id)) primaryPhotos.set(photo.listing_id, photo.storage_path);
  const paths = [...new Set(primaryPhotos.values())];
  const signedByPath = await getSignedStorageImages("market-listing-images", paths, "thumbnail");
  const byId = new Map(listings.map((listing) => [listing.id, listing]));
  const toItem = (listingId: string): WishlistItem | null => {
    const listing = byId.get(listingId);
    if (!listing) return null;
    return { id: listing.id, space: "market", title: listing.title, price: formatMarketPrice(listing.price_cents), category: categoryLabel(listing.category_slug), categorySlug: listing.category_slug, status: listing.status === "sold" || listing.status === "archived" ? "Sold" : listing.status === "pending" ? "Pending" : "Active", imageUrl: signedByPath.get(primaryPhotos.get(listing.id) ?? "") ?? "/images/logo.png" };
  };
  const bargainIds = bargainSaved.map((row) => row.listing_id);
  const { data: bargainListingRows } = bargainIds.length
    ? await supabase.from("bargain_listings").select("id,title,price_cents,category_slug,bargain_type,status").in("id", bargainIds)
    : { data: [] };
  const bargainListings = (bargainListingRows ?? []) as BargainListingRow[];
  const { data: bargainPhotoRows } = bargainIds.length
    ? await supabase.from("bargain_listing_photos").select("listing_id,storage_path,display_order").in("listing_id", bargainIds).order("display_order", { ascending: true })
    : { data: [] };
  const bargainPrimaryPhotos = new Map<string, string>();
  for (const photo of (bargainPhotoRows ?? []) as PhotoRow[]) if (!bargainPrimaryPhotos.has(photo.listing_id)) bargainPrimaryPhotos.set(photo.listing_id, photo.storage_path);
  const bargainSignedByPath = await getSignedStorageImages("bargain-listing-images", [...new Set(bargainPrimaryPhotos.values())], "thumbnail");
  const bargainById = new Map(bargainListings.map((listing) => [listing.id, listing]));
  const toBargainItem = (listingId: string): WishlistItem | null => {
    const listing = bargainById.get(listingId);
    if (!listing) return null;
    return { id: listing.id, space: "bargain", title: listing.title, price: formatMarketPrice(listing.price_cents), category: listing.bargain_type === "garage-sale" ? "Garage Sale" : listing.bargain_type === "moving-sale" ? "Moving Sale" : categoryLabel(listing.category_slug), categorySlug: listing.category_slug, status: listing.status === "sold" || listing.status === "archived" ? "Sold" : listing.status === "pending" ? "Pending" : "Active", imageUrl: bargainSignedByPath.get(bargainPrimaryPhotos.get(listing.id) ?? "") ?? "/images/logo.png" };
  };
  const orderedWishlist = [
    ...saved.map((row) => ({ row, space: "market" as const })),
    ...bargainSaved.map((row) => ({ row, space: "bargain" as const })),
  ].sort((left, right) => right.row.created_at.localeCompare(left.row.created_at));
  const wishlist = orderedWishlist.map(({ row, space }) => space === "market" ? toItem(row.listing_id) : toBargainItem(row.listing_id)).filter((item): item is WishlistItem => Boolean(item));
  const recent = viewed.filter((row) => !saved.some((savedRow) => savedRow.listing_id === row.listing_id)).map((row) => toItem(row.listing_id)).filter((item): item is WishlistItem => Boolean(item));

  return <main className="marketplace-page dashboard-page dashboard-layout wishlist-page"><DashboardSidebar context="market" active="Wishlist" /><WishlistClient initialItems={wishlist} recentlyViewed={recent} /></main>;
}
