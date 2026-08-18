import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { formatMarketPrice } from "@/lib/market/format-price";
import { getServerUser } from "@/lib/auth-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSignedStorageImages } from "@/lib/supabase/storage-image";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bargain Reservations" };

type ReservationRow = { id: string; listing_id: string; item_id: string; buyer_id: string; seller_id: string; amount_cents: number; status: "requested" | "confirmed" | "on_the_way" | "picked_up" | "declined" | "cancelled" | "expired" | "no_show"; created_at: string };
type ItemRow = { id: string; listing_id: string; title: string; photo_id: string };
type ListingRow = { id: string; title: string };
type PhotoRow = { id: string; storage_path: string };

function statusLabel(status: ReservationRow["status"]) { return status.charAt(0).toUpperCase() + status.slice(1); }
function createdLabel(value: string) { return new Intl.DateTimeFormat("en-NZ", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value)); }

export default async function BargainReservationsPage() {
  const user = await getServerUser();
  if (!user) redirect("/login?redirectTo=%2Fmarket%2Fdashboard%2Freservations");
  const supabase = await createServerSupabaseClient();
  const { data } = supabase
    ? await supabase.from("bargain_item_reservations").select("id,listing_id,item_id,buyer_id,seller_id,amount_cents,status,created_at").or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`).order("created_at", { ascending: false })
    : { data: [] };
  const reservations = (data ?? []) as ReservationRow[];
  const itemIds = [...new Set(reservations.map((reservation) => reservation.item_id))];
  const listingIds = [...new Set(reservations.map((reservation) => reservation.listing_id))];
  const [{ data: itemData }, { data: listingData }] = supabase && reservations.length
    ? await Promise.all([
      supabase.from("bargain_listing_items").select("id,listing_id,title,photo_id").in("id", itemIds),
      supabase.from("bargain_listings").select("id,title").in("id", listingIds),
    ])
    : [{ data: [] }, { data: [] }];
  const items = new Map(((itemData ?? []) as ItemRow[]).map((item) => [item.id, item]));
  const listings = new Map(((listingData ?? []) as ListingRow[]).map((listing) => [listing.id, listing]));
  const photoIds = [...new Set([...items.values()].map((item) => item.photo_id))];
  const { data: photoData } = supabase && photoIds.length
    ? await supabase.from("bargain_listing_photos").select("id,storage_path").in("id", photoIds)
    : { data: [] };
  const photos = new Map(((photoData ?? []) as PhotoRow[]).map((photo) => [photo.id, photo.storage_path]));
  const imageUrls = await getSignedStorageImages("bargain-listing-images", [...new Set([...photos.values()])], "thumbnail");
  const buying = reservations.filter((reservation) => reservation.buyer_id === user.id);
  const selling = reservations.filter((reservation) => reservation.seller_id === user.id);
  const renderRows = (rows: ReservationRow[], role: "buying" | "selling") => rows.map((reservation) => {
    const item = items.get(reservation.item_id);
    const listing = listings.get(reservation.listing_id);
    const imageUrl = item ? imageUrls.get(photos.get(item.photo_id) ?? "") ?? "/images/logo.png" : "/images/logo.png";
    const href = role === "selling" && ["requested", "confirmed", "on_the_way"].includes(reservation.status) ? `/market/${reservation.listing_id}/items/${reservation.item_id}/edit` : `/market/${reservation.listing_id}`;
    return <article className="listing-row" key={reservation.id}>
      <div className="listing-row-media"><img src={imageUrl} alt="" /></div>
      <div className="listing-row-body"><div className="listing-row-title"><h2>{item?.title ?? "Bargain item"}</h2><span className={`is-${reservation.status}`}>{statusLabel(reservation.status)}</span></div><strong className="listing-row-price">{formatMarketPrice(reservation.amount_cents)}</strong><small className="listing-row-meta">{listing?.title ?? "Bargain sale"} · {createdLabel(reservation.created_at)}</small></div>
      <div className="listing-row-actions manage-listing-actions"><Link href={href}>{role === "selling" && ["requested", "confirmed", "on_the_way"].includes(reservation.status) ? "Manage pickup" : "View sale"}</Link></div>
    </article>;
  });

  return <main className="marketplace-page dashboard-page dashboard-layout manage-listings-page"><DashboardSidebar context="market" active="Reservations" /><section className="dashboard-content manage-listings-content"><header className="manage-listings-heading"><div><p>Bargain</p><h1>Reservations</h1><span>{reservations.length} purchase and sale {reservations.length === 1 ? "reservation" : "reservations"}</span></div><Link href="/market"><i className="fa-solid fa-magnifying-glass" /> Browse Bargain</Link></header>{reservations.length ? <><section className="manage-listings-grid" aria-labelledby="buying-reservations"><h2 id="buying-reservations">Purchases</h2>{buying.length ? renderRows(buying, "buying") : <p>No purchase reservations yet.</p>}</section><section className="manage-listings-grid" aria-labelledby="selling-reservations"><h2 id="selling-reservations">Sales</h2>{selling.length ? renderRows(selling, "selling") : <p>No sale reservations yet.</p>}</section></> : <div className="manage-listings-empty"><i className="fa-regular fa-calendar-check" /><h2>No reservations yet</h2><p>Your Bargain purchase and sale reservations will appear here.</p><Link href="/market">Browse Bargain</Link></div>}</section></main>;
}
