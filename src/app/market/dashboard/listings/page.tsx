import Link from "next/link";
import { redirect } from "next/navigation";
import { ManageListingsCategoryTabs, type ManageListingsCategory } from "@/components/dashboard/ManageListingsCategoryTabs";
import { ManageListingActions } from "@/components/dashboard/ManageListingActions";
import { AccountLocaleText, AccountPageIntro, AccountWorkspaceAside } from "@/components/dashboard/AccountPagePatterns";
import { NewListingMenu } from "@/components/dashboard/NewListingMenu";
import { OwnedListingRow, type OwnedListingItem } from "@/components/dashboard/OwnedListingRow";
import { OwnedListingsViewControls } from "@/components/dashboard/OwnedListingsViewControls";
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
type ServiceListingRow = { id: string; provider_name: string; category_slug: string; service_areas: string[] | null; suburbs: string[] | null; review_count: number | null; status: "pending" | "published" | "hidden" | "archived"; created_at: string };
type ServicePhotoRow = { listing_id: string; storage_path: string; display_order: number; photo_kind: string };

type SupabaseClient = NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>;
type Kind = "market" | "bargain" | "services";

const SOURCES = {
  market: { table: "market_listings", columns: "id,title,price_cents,status,created_at", searchColumn: "title", bucket: "market-listing-images", photoTable: "market_listing_photos" },
  bargain: { table: "bargain_listings", columns: "id,title,price_cents,status,created_at,bargain_type", searchColumn: "title", bucket: "bargain-listing-images", photoTable: "bargain_listing_photos" },
  services: { table: "service_listings", columns: "id,provider_name,category_slug,service_areas,suburbs,review_count,status,created_at", searchColumn: "provider_name", bucket: "service-listing-images", photoTable: "service_listing_photos" },
} as const;

function statusLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}
const statusLabelsKo: Record<string, string> = { published: "공개 중", pending: "검토 중", sold: "판매 완료", archived: "보관됨", hidden: "비공개" };

const dateLabel = (value: string) => new Intl.DateTimeFormat("en-NZ", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));

/** One page of rows plus the full match count, resolved in the database rather
 *  than by pulling every row and slicing in memory. */
async function fetchRows(supabase: SupabaseClient, kind: Kind, ownerId: string, term: string, limit: number, sort: "newest" | "oldest", excludeCompleted: boolean) {
  const source = SOURCES[kind];
  let query = supabase
    .from(source.table)
    .select(source.columns, { count: "exact" })
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: sort === "oldest" })
    .order("id", { ascending: sort === "oldest" });

  if (term) query = query.ilike(source.searchColumn, `%${escapeLikePattern(term)}%`);
  if (excludeCompleted && kind !== "services") query = query.neq("status", "sold");

  const { data, count, error } = await query.range(0, Math.max(limit - 1, 0));
  if (error) throw error;
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
  const logos = new Map<string, string>();
  for (const photo of (data ?? []) as unknown as (PhotoRow & Partial<ServicePhotoRow>)[]) {
    if (kind === "services" && photo.photo_kind === "logo") {
      if (!logos.has(photo.listing_id)) logos.set(photo.listing_id, photo.storage_path);
      continue;
    }
    if (!primaryByListing.has(photo.listing_id)) primaryByListing.set(photo.listing_id, photo.storage_path);
  }
  if (kind === "services") for (const [id, path] of logos) if (!primaryByListing.has(id)) primaryByListing.set(id, path);

  const signed = await getSignedStorageImages(source.bucket, [...new Set(primaryByListing.values())], "thumbnail");
  return new Map([...primaryByListing].map(([listingId, path]) => [listingId, signed.get(path) ?? "/images/logo.png"]));
}

export default async function ManageListingsPage({ searchParams }: { searchParams: Promise<{ category?: string; q?: string; page?: string; version?: string; sort?: string; excludeCompleted?: string }> }) {
  const params = await searchParams;
  const isV0 = params.version === "v0";
  const requested = params.category;
  const activeCategory: ManageListingsCategory = requested === "market" || requested === "bargain" || requested === "services" ? requested : "all";
  const term = normaliseSearchTerm(params.q);
  const sort = !isV0 && params.sort === "oldest" ? "oldest" : "newest";
  const excludeCompleted = !isV0 && params.excludeCompleted === "1";
  const currentQuery = new URLSearchParams();
  if (activeCategory !== "all") currentQuery.set("category", activeCategory);
  if (sort === "oldest") currentQuery.set("sort", "oldest");
  if (excludeCompleted) currentQuery.set("excludeCompleted", "1");
  const hrefWithout = (key: "q" | "excludeCompleted") => {
    const query = new URLSearchParams(currentQuery);
    query.delete(key);
    return query.size ? `/market/dashboard/listings?${query}` : "/market/dashboard/listings";
  };

  const user = await getServerUser();
  if (!user) redirect("/login?redirectTo=%2Fmarket%2Fdashboard%2Flistings");
  const supabase = await createServerSupabaseClient();

  const requestedPage = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  // "All" interleaves three tables by date, so each one has to offer enough
  // rows to cover the requested page before the merge picks the winners.
  const reach = requestedPage * LIST_PAGE_SIZE;
  const kinds: Kind[] = activeCategory === "all" ? ["market", "bargain", "services"] : [activeCategory];

  let loadError = !supabase;
  const results = supabase
    ? await Promise.all(kinds.map(async (kind) => {
      try { return await fetchRows(supabase, kind, user.id, term, reach, sort, excludeCompleted); }
      catch { loadError = true; return { rows: [], count: 0 }; }
    }))
    : kinds.map(() => ({ rows: [], count: 0 }));

  const countByKind = new Map<Kind, number>(kinds.map((kind, index) => [kind, results[index].count]));
  const merged = kinds
    .flatMap((kind, index) => results[index].rows.map((row) => ({ kind, row: row as ListingRow & BargainListingRow & ServiceListingRow })))
    .sort((a, b) => {
      const byDate = a.row.created_at.localeCompare(b.row.created_at);
      const byKind = a.kind.localeCompare(b.kind);
      const byId = a.row.id.localeCompare(b.row.id);
      const order = byDate || byKind || byId;
      return sort === "oldest" ? order : -order;
    });

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
        if (countByKind.has(kind)) return countByKind.get(kind) ?? 0;
        try { const { count } = await fetchRows(supabase, kind, user.id, term, 1, sort, excludeCompleted); return count; }
        catch { loadError = true; return 0; }
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
  const ownedRows: OwnedListingItem[] = pageRows.map(({ kind, row }) => {
    if (kind === "services") {
      const service = row as ServiceListingRow;
      return { id: service.id, kind, title: service.provider_name, status: service.status, image: imageFor(kind, service.id), createdAt: service.created_at, categorySlug: service.category_slug, location: service.suburbs?.[0] ?? service.service_areas?.[0] ?? "", reviewCount: service.review_count ?? 0, canEdit: true, canDelete: true };
    }
    if (kind === "bargain") {
      const bargain = row as BargainListingRow;
      const standard = !isMultiItemBargain(bargain.bargain_type);
      return { id: bargain.id, kind, title: bargain.title, status: bargain.status, image: imageFor(kind, bargain.id), createdAt: bargain.created_at, priceCents: bargain.price_cents, canEdit: standard && bargain.status !== "sold", canDelete: standard, canMarkSold: standard && bargain.status !== "sold" };
    }
    const market = row as ListingRow;
    return { id: market.id, kind, title: market.title, status: market.status, image: imageFor(kind, market.id), createdAt: market.created_at, priceCents: market.price_cents, canEdit: market.status === "published" || market.status === "archived", canDelete: market.status === "published" || market.status === "archived", canRelist: market.status === "published" };
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

  return <section className="dashboard-content manage-listings-content account-modern account-workspace owned-listings-page">
    <div className="owned-listings-header">
      <AccountPageIntro title={<AccountLocaleText en="My items & services" ko="내 상품·서비스" />} description={<AccountLocaleText en="See the status of your listings and manage them here." ko="등록한 상품과 서비스의 상태를 확인하고 관리하세요." />} backToMyPage />
      <NewListingMenu />
    </div>
    <div className="account-content-rail-layout owned-listings-layout">
      <div className="owned-listings-main">
        <ManageListingsCategoryTabs activeCategory={activeCategory} counts={tabCounts} showDomainIcons />
        <div className="owned-listings-toolbar"><ListSearchField placeholder="Search your listings" copyKey="ownedListingSearch" actionKey="ownedListingSearchAction" submitInField /><OwnedListingsViewControls sort={sort} excludeCompleted={excludeCompleted} allowCompletedFilter={activeCategory !== "services"} /></div>
        {loadError ? <div className="manage-listings-empty" role="alert"><i className="ms ms-error" aria-hidden="true" /><h2><AccountLocaleText en="We couldn't load your listings." ko="등록 항목을 불러오지 못했어요" /></h2><p><AccountLocaleText en="Please try again." ko="잠시 후 다시 시도해 주세요." /></p><Link href="/market/dashboard/listings"><AccountLocaleText en="Try again" ko="다시 시도" /></Link></div>
          : ownedRows.length ? <div className="ui-panel account-workspace-list"><div className="manage-listings-grid">{ownedRows.map((item) => <OwnedListingRow key={`${item.kind}-${item.id}`} item={item} />)}</div></div>
          : term ? <div className="manage-listings-empty"><i className="ms ms-search" aria-hidden="true" /><h2><AccountLocaleText en="No listings match your search." ko="일치하는 등록 항목이 없어요" /></h2><Link href={hrefWithout("q")}><AccountLocaleText en="Clear search" ko="검색 지우기" /></Link></div>
          : excludeCompleted && activeCategory !== "services" ? <div className="manage-listings-empty"><i className="ms ms-inventory-2" aria-hidden="true" /><h2><AccountLocaleText en="No current listings to show." ko="진행 중인 등록 항목이 없어요" /></h2><Link href={hrefWithout("excludeCompleted")}><AccountLocaleText en="Show completed listings" ko="완료 항목 보기" /></Link></div>
          : <div className="manage-listings-empty"><i className="ms ms-list-alt" aria-hidden="true" /><h2><AccountLocaleText en={activeCategory === "services" ? "You haven't listed a service yet." : "You haven't listed anything yet."} ko={activeCategory === "services" ? "등록한 서비스가 없어요" : "아직 등록한 상품이나 서비스가 없어요"} /></h2><Link href={activeCategory === "services" ? "/services/create" : "/market/create"}><AccountLocaleText en={activeCategory === "services" ? "List a service" : "Create a listing"} ko={activeCategory === "services" ? "서비스 등록" : "새로 등록"} /></Link></div>}
        <ListPagination page={page} totalPages={totalPages} label="Listing pages" />
      </div>
      <AccountWorkspaceAside />
    </div>
  </section>;
}
