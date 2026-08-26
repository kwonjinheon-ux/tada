import Link from "next/link";
import { redirect } from "next/navigation";
import { ManageListingsCategoryTabs, type ManageListingsCategory } from "@/components/dashboard/ManageListingsCategoryTabs";
import { ManageListingActions } from "@/components/dashboard/ManageListingActions";
import { ServiceOwnerActions } from "@/components/services/ServiceOwnerActions";
import { ListPagination } from "@/components/ui/ListPagination";
import { ListSearchField } from "@/components/ui/ListSearchField";
import { formatMarketPrice } from "@/lib/market/format-price";
import { MARKET_LISTING_PLACEHOLDER_IMAGE } from "@/lib/market/listing-image";
import { TranslatedText } from "@/components/LanguageProvider";
import { getServerUser } from "@/lib/auth-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSignedStorageImages } from "@/lib/supabase/storage-image";
import { isMultiItemBargain, type BargainListingType } from "@/lib/bargain/listing-types";
import { LIST_PAGE_SIZE, escapeLikePattern, normaliseSearchTerm, pageRange, parsePageParam, totalPageCount } from "@/lib/list-pagination";

export const dynamic = "force-dynamic";
export const metadata = { title: "Manage Listings" };

type ListingRow = { id: string; title: string; price_cents: number; status: "published" | "pending" | "sold" | "archived"; created_at: string };
type PhotoRow = { listing_id: string; storage_path: string; display_order: number };
type BargainListingRow = ListingRow & { bargain_type: BargainListingType };
type ServiceListingRow = { id: string; provider_name: string; category_slug: string; status: "pending" | "published" | "hidden" | "archived"; created_at: string };
type ServicePhotoRow = { listing_id: string; storage_path: string; display_order: number; photo_kind: string };

type SupabaseClient = NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>;
type Kind = "market" | "bargain" | "services";

const SOURCES = {
  market: { table: "market_listings", columns: "id,title,price_cents,status,created_at", searchColumn: "title", bucket: "market-listing-images", photoTable: "market_listing_photos" },
  bargain: { table: "bargain_listings", columns: "id,title,price_cents,status,created_at,bargain_type", searchColumn: "title", bucket: "bargain-listing-images", photoTable: "bargain_listing_photos" },
  services: { table: "service_listings", columns: "id,provider_name,category_slug,status,created_at", searchColumn: "provider_name", bucket: "service-listing-images", photoTable: "service_listing_photos" },
} as const;

function statusLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

const dateLabel = (value: string) => new Intl.DateTimeFormat("en-NZ", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));

/** One page of rows plus the full match count, resolved in the database rather
 *  than by pulling every row and slicing in memory. */
async function fetchRows(supabase: SupabaseClient, kind: Kind, ownerId: string, term: string, limit: number) {
  const source = SOURCES[kind];
  let query = supabase
    .from(source.table)
    .select(source.columns, { count: "exact" })
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });

  if (term) query = query.ilike(source.searchColumn, `%${escapeLikePattern(term)}%`);

  const { data, count } = await query.range(0, Math.max(limit - 1, 0));
  return { rows: (data ?? []) as unknown[], count: count ?? 0 };
}

/** Signs thumbnails for the rows on screen only — the reason this page was
 *  slow was one signing request per listing across the whole account. */
async function signThumbnails(supabase: SupabaseClient, kind: Kind, ids: string[]) {
  if (!ids.length) return new Map<string, string>();
  const source = SOURCES[kind];
  const columns = kind === "services" ? "listing_id,storage_path,display_order,photo_kind" : "listing_id,storage_path,display_order";
  const { data } = await supabase.from(source.photoTable).select(columns).in("listing_id", ids).order("display_order", { ascending: true });

  const primaryByListing = new Map<string, string>();
  for (const photo of (data ?? []) as unknown as (PhotoRow & Partial<ServicePhotoRow>)[]) {
    if (kind === "services" && photo.photo_kind === "logo") continue;
    if (!primaryByListing.has(photo.listing_id)) primaryByListing.set(photo.listing_id, photo.storage_path);
  }

  const signed = await getSignedStorageImages(source.bucket, [...new Set(primaryByListing.values())], "thumbnail");
  return new Map([...primaryByListing].map(([listingId, path]) => [listingId, signed.get(path) ?? "/images/logo.png"]));
}

export default async function ManageListingsPage({ searchParams }: { searchParams: Promise<{ category?: string; q?: string; page?: string }> }) {
  const params = await searchParams;
  const requested = params.category;
  const activeCategory: ManageListingsCategory = requested === "market" || requested === "bargain" || requested === "services" ? requested : "all";
  const term = normaliseSearchTerm(params.q);

  const user = await getServerUser();
  if (!user) redirect("/login?redirectTo=%2Fmarket%2Fdashboard%2Flistings");
  const supabase = await createServerSupabaseClient();

  const requestedPage = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  // "All" interleaves three tables by date, so each one has to offer enough
  // rows to cover the requested page before the merge picks the winners.
  const reach = requestedPage * LIST_PAGE_SIZE;
  const kinds: Kind[] = activeCategory === "all" ? ["market", "bargain", "services"] : [activeCategory];

  const results = supabase
    ? await Promise.all(kinds.map((kind) => fetchRows(supabase, kind, user.id, term, reach)))
    : kinds.map(() => ({ rows: [], count: 0 }));

  const countByKind = new Map<Kind, number>(kinds.map((kind, index) => [kind, results[index].count]));
  const merged = kinds
    .flatMap((kind, index) => results[index].rows.map((row) => ({ kind, row: row as ListingRow & BargainListingRow & ServiceListingRow })))
    .sort((a, b) => b.row.created_at.localeCompare(a.row.created_at));

  const visibleTotal = [...countByKind.values()].reduce((sum, count) => sum + count, 0);
  const totalPages = totalPageCount(visibleTotal);
  const page = parsePageParam(params.page, totalPages);
  const { from } = pageRange(page);
  const pageRows = merged.slice(from, from + LIST_PAGE_SIZE);

  const thumbnails = supabase
    ? new Map(await Promise.all(kinds.map(async (kind) =>
      [kind, await signThumbnails(supabase, kind, pageRows.filter((entry) => entry.kind === kind).map((entry) => entry.row.id))] as const,
    )))
    : new Map<Kind, Map<string, string>>();

  const imageFor = (kind: Kind, id: string) => thumbnails.get(kind)?.get(id) ?? (kind === "market" ? MARKET_LISTING_PLACEHOLDER_IMAGE : "/images/logo.png");
  const createHref = activeCategory === "services" ? "/services/create" : activeCategory === "bargain" ? "/market/create/bargain" : "/market/create";

  // The tabs show how much sits behind each one, so they need counts that the
  // active category's query does not cover.
  const tabCounts = supabase
    ? await (async () => {
      const all = await Promise.all((["market", "bargain", "services"] as Kind[]).map(async (kind) => {
        if (countByKind.has(kind) && !term) return countByKind.get(kind) ?? 0;
        const { count } = await fetchRows(supabase, kind, user.id, term, 1);
        return count;
      }));
      return { market: all[0], bargain: all[1], services: all[2], all: all[0] + all[1] + all[2] };
    })()
    : { market: 0, bargain: 0, services: 0, all: 0 };

  return <section className="dashboard-content manage-listings-content">
    <header className="manage-listings-heading">
      <div>
        <p><TranslatedText translationKey="marketplace" /> &amp; Bargain</p>
        <h1><TranslatedText translationKey="manageListings" /></h1>
        <span>{visibleTotal} <TranslatedText translationKey="totalListings" /></span>
      </div>
      <Link href={createHref}><i className="ms ms-add" /> <TranslatedText translationKey="createListing" /></Link>
    </header>

    <ManageListingsCategoryTabs activeCategory={activeCategory} counts={tabCounts} />

    {pageRows.length ? <div className="manage-listings-grid">{pageRows.map(({ kind, row }) => {
      if (kind === "services") {
        return <article className="listing-row" key={`service-${row.id}`}>
          <div className="listing-row-media"><img src={imageFor(kind, row.id)} alt="" loading="lazy" /></div>
          <div className="listing-row-body">
            <div className="listing-row-title"><h2>{row.provider_name}</h2><span className={`is-${row.status}`}>{statusLabel(row.status)}</span></div>
            <strong className="listing-row-price">Service · {row.category_slug}</strong>
            <small className="listing-row-meta">Created {dateLabel(row.created_at)}</small>
          </div>
          <ServiceOwnerActions serviceId={row.id} providerName={row.provider_name} compact />
        </article>;
      }

      if (kind === "bargain") {
        const manageHref = isMultiItemBargain(row.bargain_type) ? `/market/${row.id}` : `/market/${row.id}/edit`;
        return <article className="listing-row" key={`bargain-${row.id}`}>
          <div className="listing-row-media"><img src={imageFor(kind, row.id)} alt="" loading="lazy" /></div>
          <div className="listing-row-body">
            <div className="listing-row-title"><h2>{row.title}</h2><span className={`is-${row.status}`}>{statusLabel(row.status)}</span></div>
            <strong className="listing-row-price">{formatMarketPrice(row.price_cents)}</strong>
            <small className="listing-row-meta">Bargain · Created {dateLabel(row.created_at)}</small>
          </div>
          <div className="listing-row-actions manage-listing-actions"><Link href={manageHref}><i className="ms ms-edit" /> Manage</Link><Link href={`/market/${row.id}`}>View sale</Link></div>
        </article>;
      }

      return <article className="listing-row" key={row.id}>
        <div className="listing-row-media"><img src={imageFor(kind, row.id)} alt="" loading="lazy" /></div>
        <div className="listing-row-body">
          <div className="listing-row-title"><h2>{row.title}</h2><span className={`is-${row.status}`}>{statusLabel(row.status)}</span></div>
          <strong className="listing-row-price">{formatMarketPrice(row.price_cents)}</strong>
          <small className="listing-row-meta">Created {dateLabel(row.created_at)}</small>
        </div>
        <ManageListingActions id={row.id} title={row.title} status={row.status} />
      </article>;
    })}</div> : term ? (
      <div className="manage-listings-empty"><i className="ms ms-search" /><h2>No matches for “{term}”</h2><p>Try a shorter word, or clear the search to see everything again.</p></div>
    ) : (
      <div className="manage-listings-empty"><i className="ms ms-list-alt" /><h2><TranslatedText translationKey="noListingsYet" /></h2><p><TranslatedText translationKey="firstListingHint" /></p><Link href="/market/create"><TranslatedText translationKey="createListing" /></Link></div>
    )}

    <ListPagination page={page} totalPages={totalPages} label="Listing pages" />
    <ListSearchField placeholder="Search your listings" label="Search your listings" />
  </section>;
}
