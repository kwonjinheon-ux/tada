import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { getServerUser } from "@/lib/auth-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSignedStorageImages } from "@/lib/supabase/storage-image";

export const dynamic = "force-dynamic";
export const metadata = { title: "Manage Listings" };

type ListingRow = { id: string; title: string; price_cents: number; status: "published" | "pending" | "sold" | "archived"; created_at: string };
type PhotoRow = { listing_id: string; storage_path: string; display_order: number };

function formatPrice(priceCents: number) {
  return new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: priceCents % 100 === 0 ? 0 : 2 }).format(priceCents / 100);
}

function statusLabel(status: ListingRow["status"]) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default async function ManageListingsPage() {
  const user = await getServerUser();
  if (!user) redirect("/login?redirectTo=%2Fmarket%2Fdashboard%2Flistings");
  const supabase = await createServerSupabaseClient();
  const { data: listingRows } = supabase
    ? await supabase.from("market_listings").select("id,title,price_cents,status,created_at").eq("owner_id", user.id).order("created_at", { ascending: false })
    : { data: [] };
  const listings = (listingRows ?? []) as ListingRow[];
  const { data: photoRows } = supabase && listings.length
    ? await supabase.from("market_listing_photos").select("listing_id,storage_path,display_order").in("listing_id", listings.map((listing) => listing.id)).order("display_order", { ascending: true })
    : { data: [] };
  const primaryPhotoByListing = new Map<string, string>();
  for (const photo of (photoRows ?? []) as PhotoRow[]) if (!primaryPhotoByListing.has(photo.listing_id)) primaryPhotoByListing.set(photo.listing_id, photo.storage_path);
  const signedPhotos = await getSignedStorageImages("market-listing-images", [...new Set(primaryPhotoByListing.values())], "thumbnail");

  return <main className="marketplace-page dashboard-page dashboard-layout manage-listings-page">
    <DashboardSidebar context="market" active="Manage Listings" />
    <section className="dashboard-content manage-listings-content">
      <header className="manage-listings-heading"><div><p>Marketplace</p><h1>Manage listings</h1><span>{listings.length} total listings</span></div><Link href="/market/create"><i className="fa-solid fa-plus" /> Create listing</Link></header>
      {listings.length ? <div className="manage-listings-grid">{listings.map((listing) => {
        const imageUrl = signedPhotos.get(primaryPhotoByListing.get(listing.id) ?? "") ?? "/images/logo.png";
        return <article key={listing.id}><img src={imageUrl} alt="" /><div><div className="manage-listings-title"><h2>{listing.title}</h2><span className={`is-${listing.status}`}>{statusLabel(listing.status)}</span></div><strong>{formatPrice(listing.price_cents)}</strong><small>Created {new Intl.DateTimeFormat("en-NZ", { day: "numeric", month: "short", year: "numeric" }).format(new Date(listing.created_at))}</small></div><Link href={`/market/${listing.id}/edit`} aria-label={`Manage ${listing.title}`}><i className="fa-solid fa-pen" /> Manage</Link></article>;
      })}</div> : <div className="manage-listings-empty"><i className="fa-regular fa-rectangle-list" /><h2>No listings yet</h2><p>Create your first listing to start selling on Tada.</p><Link href="/market/create">Create listing</Link></div>}
    </section>
  </main>;
}
