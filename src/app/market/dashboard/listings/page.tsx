import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { ManageListingActions } from "@/components/dashboard/ManageListingActions";
import { formatMarketPrice } from "@/lib/market/format-price";
import { TranslatedText } from "@/components/LanguageProvider";
import { getServerUser } from "@/lib/auth-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSignedStorageImages } from "@/lib/supabase/storage-image";

export const dynamic = "force-dynamic";
export const metadata = { title: "Manage Listings" };

type ListingRow = { id: string; title: string; price_cents: number; status: "published" | "pending" | "sold" | "archived"; created_at: string };
type PhotoRow = { listing_id: string; storage_path: string; display_order: number };

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
      <header className="manage-listings-heading"><div><p><TranslatedText translationKey="marketplace" /></p><h1><TranslatedText translationKey="manageListings" /></h1><span>{listings.length} <TranslatedText translationKey="totalListings" /></span></div><Link href="/market/create"><i className="fa-solid fa-plus" /> <TranslatedText translationKey="createListing" /></Link></header>
      {listings.length ? <div className="manage-listings-grid">{listings.map((listing) => {
        const imageUrl = signedPhotos.get(primaryPhotoByListing.get(listing.id) ?? "") ?? "/images/logo.png";
        return <article className="listing-row" key={listing.id}>
          <div className="listing-row-media"><img src={imageUrl} alt="" /></div>
          <div className="listing-row-body">
            <div className="listing-row-title"><h2>{listing.title}</h2><span className={`is-${listing.status}`}>{statusLabel(listing.status)}</span></div>
            <strong className="listing-row-price">{formatMarketPrice(listing.price_cents)}</strong>
            <small className="listing-row-meta">Created {new Intl.DateTimeFormat("en-NZ", { day: "numeric", month: "short", year: "numeric" }).format(new Date(listing.created_at))}</small>
          </div>
          <ManageListingActions id={listing.id} title={listing.title} status={listing.status} />
        </article>;
      })}</div> : <div className="manage-listings-empty"><i className="fa-regular fa-rectangle-list" /><h2><TranslatedText translationKey="noListingsYet" /></h2><p><TranslatedText translationKey="firstListingHint" /></p><Link href="/market/create"><TranslatedText translationKey="createListing" /></Link></div>}
    </section>
  </main>;
}
