import Link from "next/link";
import { redirect } from "next/navigation";
import { ManageListingsCategoryTabs, type ManageListingsCategory } from "@/components/dashboard/ManageListingsCategoryTabs";
import { ManageListingActions } from "@/components/dashboard/ManageListingActions";
import { AccountLocaleText, AccountWorkspaceHeader, AccountWorkspaceSummary } from "@/components/dashboard/AccountPagePatterns";
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
export const metadata = { title: "My items & services" };

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
const statusLabelsKo: Record<string, string> = { published: "공개 중", pending: "검토 중", sold: "판매 완료", archived: "보관됨", hidden: "비공개" };

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

export default async function ManageListingsPage({ searchParams }: { searchParams: Promise<{ category?: string; q?: string; page?: string; version?: string }> }) {
  const params = await searchParams;
  const isV0 = params.version === "v0";
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

  const listingRows = pageRows.map(({ kind, row }) => {
      if (kind === "services") {
        return <article className="listing-row" key={`service-${row.id}`}>
          <div className="listing-row-media"><img src={imageFor(kind, row.id)} alt="" loading="lazy" /></div>
          <div className="listing-row-body">
            <div className="listing-row-title"><h2>{row.provider_name}</h2><span className={`is-${row.status}`}>{isV0 ? statusLabel(row.status) : <AccountLocaleText en={statusLabel(row.status)} ko={statusLabelsKo[row.status] ?? row.status} />}</span></div>
            <strong className="listing-row-price">{isV0 ? "Service" : <AccountLocaleText en="Service" ko="서비스" />} · {row.category_slug}</strong>
            <small className="listing-row-meta">{isV0 ? "Created" : <AccountLocaleText en="Created" ko="등록일" />} {dateLabel(row.created_at)}</small>
          </div>
          <ServiceOwnerActions serviceId={row.id} providerName={row.provider_name} compact />
        </article>;
      }

      if (kind === "bargain") {
        const manageHref = isMultiItemBargain(row.bargain_type) ? `/market/${row.id}` : `/market/${row.id}/edit`;
        return <article className="listing-row" key={`bargain-${row.id}`}>
          <div className="listing-row-media"><img src={imageFor(kind, row.id)} alt="" loading="lazy" /></div>
          <div className="listing-row-body">
            <div className="listing-row-title"><h2>{row.title}</h2><span className={`is-${row.status}`}>{isV0 ? statusLabel(row.status) : <AccountLocaleText en={statusLabel(row.status)} ko={statusLabelsKo[row.status] ?? row.status} />}</span></div>
            <strong className="listing-row-price">{formatMarketPrice(row.price_cents)}</strong>
            <small className="listing-row-meta">{isV0 ? "Bargain · Created" : <><AccountLocaleText en="Bargain" ko="알뜰거래" /> · <AccountLocaleText en="Created" ko="등록일" /></>} {dateLabel(row.created_at)}</small>
          </div>
          <div className="listing-row-actions manage-listing-actions"><Link href={manageHref}><i className="ms ms-edit" /> {isV0 ? "Manage" : <AccountLocaleText en="Manage" ko="관리" />}</Link><Link href={`/market/${row.id}`}>{isV0 ? "View sale" : <AccountLocaleText en="View sale" ko="판매 보기" />}</Link></div>
        </article>;
      }

      return <article className="listing-row" key={row.id}>
        <div className="listing-row-media"><img src={imageFor(kind, row.id)} alt="" loading="lazy" /></div>
        <div className="listing-row-body">
          <div className="listing-row-title"><h2>{row.title}</h2><span className={`is-${row.status}`}>{isV0 ? statusLabel(row.status) : <AccountLocaleText en={statusLabel(row.status)} ko={statusLabelsKo[row.status] ?? row.status} />}</span></div>
          <strong className="listing-row-price">{formatMarketPrice(row.price_cents)}</strong>
          <small className="listing-row-meta">{isV0 ? "Created" : <AccountLocaleText en="Created" ko="등록일" />} {dateLabel(row.created_at)}</small>
        </div>
        <ManageListingActions id={row.id} title={row.title} status={row.status} variant={isV0 ? "v0" : "current"} />
      </article>;
  });
  const emptyState = term ? <div className="manage-listings-empty"><i className="ms ms-search" /><h2>{isV0 ? `No matches for “${term}”` : <AccountLocaleText en={`No matches for “${term}”`} ko={`“${term}” 검색 결과가 없어요`} />}</h2><p>{isV0 ? "Try a shorter word, or clear the search to see everything again." : <AccountLocaleText en="Try a shorter word, or clear the search to see everything again." ko="검색어를 줄이거나 검색을 지우고 다시 확인해 보세요." />}</p></div>
    : <div className="manage-listings-empty"><i className="ms ms-list-alt" /><h2><TranslatedText translationKey="noListingsYet" /></h2><p><TranslatedText translationKey="firstListingHint" /></p><Link href={isV0 ? "/market/create" : createHref}><TranslatedText translationKey="createListing" /></Link></div>;

  if (isV0) return <section className="dashboard-content manage-listings-content">
    <header className="manage-listings-heading"><div><p><TranslatedText translationKey="marketplace" /> &amp; Bargain</p><h1><TranslatedText translationKey="manageListings" /></h1><span>{visibleTotal} <TranslatedText translationKey="totalListings" /></span></div><Link href={createHref}><i className="ms ms-add" /> <TranslatedText translationKey="createListing" /></Link></header>
    <ManageListingsCategoryTabs activeCategory={activeCategory} counts={tabCounts} baseHref="/market/dashboard/listings-v0" />
    {pageRows.length ? <div className="manage-listings-grid">{listingRows}</div> : emptyState}
    <ListPagination page={page} totalPages={totalPages} label="Listing pages" />
    <ListSearchField placeholder="Search your listings" label="Search your listings" />
  </section>;

  return <section className="dashboard-content manage-listings-content account-modern account-workspace">
    <AccountWorkspaceHeader kind="listings" count={tabCounts.all} primaryHref={createHref} searching={Boolean(term)} />
    <AccountWorkspaceSummary items={[
      { icon: "ms-shopping-bag", label: "Market items", labelKo: "마켓 상품", value: tabCounts.market, tone: "market" },
      { icon: "ms-sell", label: "Bargain items", labelKo: "알뜰거래", value: tabCounts.bargain, tone: "market" },
      { icon: "ms-build", label: "Services", labelKo: "서비스", value: tabCounts.services, tone: "services" },
    ]} />
    <ManageListingsCategoryTabs activeCategory={activeCategory} counts={tabCounts} />
    {pageRows.length ? <div className="ui-panel account-workspace-list"><div className="account-workspace-list-heading"><div><h2><AccountLocaleText en="My items & services" ko="내 상품·서비스" /></h2><p>{visibleTotal} <TranslatedText translationKey="totalListings" /></p></div><Link href="/market/dashboard/messages"><i className="ms ms-chat" aria-hidden="true" /> <TranslatedText translationKey="messages" /></Link></div><div className="manage-listings-grid">{listingRows}</div></div> : emptyState}
    <ListPagination page={page} totalPages={totalPages} label="Listing pages" />
    <ListSearchField placeholder="Search your listings" label="Search your listings" />
  </section>;
}
