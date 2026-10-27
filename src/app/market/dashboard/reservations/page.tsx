import Link from "next/link";
import { redirect } from "next/navigation";
import { formatMarketPrice } from "@/lib/market/format-price";
import { getServerUser } from "@/lib/auth-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSignedStorageImages } from "@/lib/supabase/storage-image";
import { ListPagination } from "@/components/ui/ListPagination";
import { ListSearchField } from "@/components/ui/ListSearchField";
import { ReservationsWorkspace, type ReservationListItem, type ReservationView } from "@/components/dashboard/ReservationsWorkspace";
import { LIST_PAGE_SIZE, escapeLikePattern, normaliseSearchTerm, pageRange, parsePageParam, totalPageCount } from "@/lib/list-pagination";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bargain Reservations" };

type ReservationRow = { id: string; listing_id: string; item_id: string; buyer_id: string; seller_id: string; amount_cents: number; status: "requested" | "confirmed" | "on_the_way" | "picked_up" | "declined" | "cancelled" | "expired" | "no_show"; created_at: string; pickup_start_at: string | null };
type ItemRow = { id: string; listing_id: string; title: string; photo_id: string };
type ListingRow = { id: string; title: string };
type PhotoRow = { id: string; storage_path: string };

function createdLabel(value: string) { return new Intl.DateTimeFormat("en-NZ", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value)); }

export default async function BargainReservationsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; version?: string; view?: string; excludeCancelled?: string; excludeCompleted?: string }> }) {
  const params = await searchParams;
  const isV0 = params.version === "v0";
  const view: ReservationView = !isV0 && (params.view === "attention" || params.view === "buying" || params.view === "selling") ? params.view : "all";
  const excludeCancelled = !isV0 && params.excludeCancelled === "1";
  const excludeCompleted = !isV0 && params.excludeCompleted === "1";
  const term = normaliseSearchTerm(params.q);
  const user = await getServerUser();
  if (!user) redirect("/login?redirectTo=%2Fmarket%2Fdashboard%2Freservations");
  const supabase = await createServerSupabaseClient();
  // A search runs against the item name, which lives one table over, so the
  // matching ids are resolved first and used to narrow the reservations.
  const itemSearch = supabase && term ? await supabase.from("bargain_listing_items").select("id").ilike("title", `%${escapeLikePattern(term)}%`).limit(500) : null;
  const matchingItemIds = itemSearch ? (itemSearch.data ?? []).map((row) => (row as { id: string }).id) : null;
  let loadError = !supabase || Boolean(itemSearch?.error);

  const buildQuery = (selectedView: ReservationView) => {
    let query = supabase!
      .from("bargain_item_reservations")
      .select("id,listing_id,item_id,buyer_id,seller_id,amount_cents,status,created_at,pickup_start_at", { count: "exact" })
      .order("created_at", { ascending: false });
    if (selectedView === "all") query = query.or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`);
    else if (selectedView === "buying") query = query.eq("buyer_id", user.id);
    else query = query.eq("seller_id", user.id);
    if (selectedView === "attention") query = query.eq("status", "requested");
    if (excludeCancelled) query = query.neq("status", "cancelled");
    if (excludeCompleted) query = query.neq("status", "picked_up");
    if (matchingItemIds) query = query.in("item_id", matchingItemIds);
    return query;
  };

  const views: ReservationView[] = isV0 ? ["all"] : ["all", "attention", "buying", "selling"];
  const countResults = supabase && !loadError && (!matchingItemIds || matchingItemIds.length)
    ? await Promise.all(views.map((selectedView) => buildQuery(selectedView).range(0, 0)))
    : views.map(() => ({ count: 0, error: null }));
  loadError ||= countResults.some((result) => Boolean(result.error));
  const counts = Object.fromEntries(views.map((selectedView, index) => [selectedView, countResults[index].count ?? 0])) as Record<ReservationView, number>;
  const totalReservations = counts[view] ?? 0;
  const totalPages = totalPageCount(totalReservations ?? 0);
  const page = parsePageParam(params.page, totalPages);
  const { from } = pageRange(page);

  // Only this page is fetched, so only this page is signed. The list used
  // to sign one thumbnail per reservation across the whole account.
  const pageResult = supabase && !loadError && totalReservations ? await buildQuery(view).range(from, from + LIST_PAGE_SIZE - 1) : { data: [], error: null };
  loadError ||= Boolean(pageResult.error);
  const { data } = pageResult;
  const reservations = (data ?? []) as ReservationRow[];
  const itemIds = [...new Set(reservations.map((reservation) => reservation.item_id))];
  const listingIds = [...new Set(reservations.map((reservation) => reservation.listing_id))];
  const [{ data: itemData, error: itemError }, { data: listingData, error: listingError }] = supabase && reservations.length
    ? await Promise.all([
      supabase.from("bargain_listing_items").select("id,listing_id,title,photo_id").in("id", itemIds),
      supabase.from("bargain_listings").select("id,title").in("id", listingIds),
    ])
    : [{ data: [], error: null }, { data: [], error: null }];
  loadError ||= Boolean(itemError || listingError);
  const items = new Map(((itemData ?? []) as ItemRow[]).map((item) => [item.id, item]));
  const listings = new Map(((listingData ?? []) as ListingRow[]).map((listing) => [listing.id, listing]));
  const photoIds = [...new Set([...items.values()].map((item) => item.photo_id))];
  const { data: photoData, error: photoError } = supabase && photoIds.length
    ? await supabase.from("bargain_listing_photos").select("id,storage_path").in("id", photoIds)
    : { data: [], error: null };
  loadError ||= Boolean(photoError);
  const photos = new Map(((photoData ?? []) as PhotoRow[]).map((photo) => [photo.id, photo.storage_path]));
  const imageUrls = await getSignedStorageImages("bargain-listing-images", [...new Set([...photos.values()])], "thumbnail");
  const buying = reservations.filter((reservation) => reservation.buyer_id === user.id);
  const selling = reservations.filter((reservation) => reservation.seller_id === user.id);
  const renderV0Rows = (rows: ReservationRow[], role: "buying" | "selling") => rows.map((reservation) => {
    const item = items.get(reservation.item_id);
    const listing = listings.get(reservation.listing_id);
    const imageUrl = item ? imageUrls.get(photos.get(item.photo_id) ?? "") ?? "/images/logo.png" : "/images/logo.png";
    const href = role === "selling" && ["requested", "confirmed", "on_the_way"].includes(reservation.status) ? `/market/${reservation.listing_id}/items/${reservation.item_id}/edit` : `/market/${reservation.listing_id}`;
    return <article className="listing-row" key={reservation.id}>
      <div className="listing-row-media"><img src={imageUrl} alt="" /></div>
      <div className="listing-row-body"><div className="listing-row-title"><h2>{item?.title ?? "Bargain item"}</h2><span className={`is-${reservation.status}`}>{reservation.status.charAt(0).toUpperCase() + reservation.status.slice(1)}</span></div><strong className="listing-row-price">{formatMarketPrice(reservation.amount_cents)}</strong><small className="listing-row-meta">{listing?.title ?? "Bargain sale"} · {createdLabel(reservation.created_at)}</small></div>
      <div className="listing-row-actions manage-listing-actions"><Link href={href}>{role === "selling" && ["requested", "confirmed", "on_the_way"].includes(reservation.status) ? "Manage pickup" : "View sale"}</Link></div>
    </article>;
  });

  if (isV0) return <section className="dashboard-content manage-listings-content"><header className="manage-listings-heading"><div><p>Bargain</p><h1>Reservations</h1><span>{totalReservations ?? 0} purchase and sale {(totalReservations ?? 0) === 1 ? "reservation" : "reservations"}</span></div><Link href="/market"><i className="ms ms-search" /> Browse Bargain</Link></header>{reservations.length ? <><section className="manage-listings-grid" aria-labelledby="buying-reservations"><h2 id="buying-reservations">Purchases</h2>{buying.length ? renderV0Rows(buying, "buying") : <p>No purchase reservations yet.</p>}</section><section className="manage-listings-grid" aria-labelledby="selling-reservations"><h2 id="selling-reservations">Sales</h2>{selling.length ? renderV0Rows(selling, "selling") : <p>No sale reservations yet.</p>}</section></> : <div className="manage-listings-empty"><i className="ms ms-event-available" /><h2>No reservations yet</h2><p>Your Bargain purchase and sale reservations will appear here.</p><Link href="/market">Browse Bargain</Link></div>}<ListPagination page={page} totalPages={totalPages} label="Reservation pages" /><ListSearchField placeholder="Search reservations by item" label="Search reservations by item" /></section>;

  const itemsForWorkspace: ReservationListItem[] = reservations.map((reservation) => {
    const item = items.get(reservation.item_id);
    return {
      id: reservation.id,
      listingId: reservation.listing_id,
      itemId: reservation.item_id,
      title: item?.title ?? "",
      saleTitle: listings.get(reservation.listing_id)?.title ?? "",
      imageUrl: item ? imageUrls.get(photos.get(item.photo_id) ?? "") ?? "/images/logo.png" : "/images/logo.png",
      amountCents: reservation.amount_cents,
      status: reservation.status,
      role: reservation.seller_id === user.id ? "selling" : "buying",
      createdAt: reservation.created_at,
      pickupStartAt: reservation.pickup_start_at,
    };
  });
  return <ReservationsWorkspace items={itemsForWorkspace} counts={counts} view={view} page={page} totalPages={totalPages} term={term} loadError={loadError} excludeCancelled={excludeCancelled} excludeCompleted={excludeCompleted} />;
}
