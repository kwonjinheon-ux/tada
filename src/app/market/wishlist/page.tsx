import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { WishlistClient, type WishlistItem } from "@/components/market/WishlistClient";
import { getServerUser } from "@/lib/auth-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Wishlist" };

type SavedRow = { listing_id: string; created_at: string };
type ViewedRow = { listing_id: string; last_viewed_at: string };
type ListingRow = { id: string; title: string; price_cents: number; category_slug: string | null; status: "published" | "pending" | "sold" | "archived"; };
type PhotoRow = { listing_id: string; storage_path: string; thumbnail_path: string | null; listing_path: string | null; display_order: number };

function formatPrice(priceCents: number) {
  return new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: priceCents % 100 === 0 ? 0 : 2 }).format(priceCents / 100);
}

function categoryLabel(slug: string | null) {
  if (!slug) return "Marketplace";
  return slug.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" & ");
}

export default async function MarketWishlistPage() {
  const user = await getServerUser();
  if (!user) redirect("/login?redirectTo=%2Fmarket%2Fwishlist");
  const supabase = await createServerSupabaseClient();
  if (!supabase) return <main className="marketplace-page dashboard-page wishlist-page"><DashboardSidebar context="market" active="Wishlist" /><WishlistClient initialItems={[]} recentlyViewed={[]} /></main>;

  const [{ data: savedRows }, { data: viewedRows }] = await Promise.all([
    supabase.from("market_wishlist").select("listing_id,created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("market_listing_views").select("listing_id,last_viewed_at").eq("user_id", user.id).order("last_viewed_at", { ascending: false }).limit(8),
  ]);
  const saved = (savedRows ?? []) as SavedRow[];
  const viewed = (viewedRows ?? []) as ViewedRow[];
  const ids = [...new Set([...saved.map((row) => row.listing_id), ...viewed.map((row) => row.listing_id)])];
  const { data: listingRows } = ids.length ? await supabase.from("market_listings").select("id,title,price_cents,category_slug,status").in("id", ids) : { data: [] };
  const listings = (listingRows ?? []) as ListingRow[];
  const { data: photoRows } = ids.length ? await supabase.from("market_listing_photos").select("listing_id,storage_path,thumbnail_path,listing_path,display_order").in("listing_id", ids).order("display_order", { ascending: true }) : { data: [] };
  const photos = (photoRows ?? []) as PhotoRow[];
  const primaryPhotos = new Map<string, string>();
  for (const photo of photos) if (!primaryPhotos.has(photo.listing_id)) primaryPhotos.set(photo.listing_id, photo.thumbnail_path ?? photo.listing_path ?? photo.storage_path);
  const paths = [...new Set(primaryPhotos.values())];
  const { data: signedPhotos } = paths.length ? await supabase.storage.from("market-listing-images").createSignedUrls(paths, 3600) : { data: [] };
  const signedByPath = new Map((signedPhotos ?? []).filter((photo) => photo.path && photo.signedUrl).map((photo) => [photo.path, photo.signedUrl]));
  const byId = new Map(listings.map((listing) => [listing.id, listing]));
  const toItem = (listingId: string): WishlistItem | null => {
    const listing = byId.get(listingId);
    if (!listing) return null;
    return { id: listing.id, title: listing.title, price: formatPrice(listing.price_cents), category: categoryLabel(listing.category_slug), categorySlug: listing.category_slug, status: listing.status === "sold" || listing.status === "archived" ? "Sold" : listing.status === "pending" ? "Pending" : "Active", imageUrl: signedByPath.get(primaryPhotos.get(listing.id) ?? "") ?? "/images/logo.png" };
  };
  const wishlist = saved.map((row) => toItem(row.listing_id)).filter((item): item is WishlistItem => Boolean(item));
  const recent = viewed.filter((row) => !saved.some((savedRow) => savedRow.listing_id === row.listing_id)).map((row) => toItem(row.listing_id)).filter((item): item is WishlistItem => Boolean(item));

  return <main className="marketplace-page dashboard-page wishlist-page"><DashboardSidebar context="market" active="Wishlist" /><WishlistClient initialItems={wishlist} recentlyViewed={recent} /></main>;
}
