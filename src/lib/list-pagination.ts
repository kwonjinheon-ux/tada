/** Shared paging maths for the dashboard's long lists.
 *
 *  Paging is not only a navigation affordance here. Every row on these screens
 *  needs a signed thumbnail URL, and `getSignedStorageImages` issues one
 *  request per path — so an unpaged list of 200 listings meant 200 signing
 *  round trips before the page could render. Bounding the page bounds that. */

export const LIST_PAGE_SIZE = 20;

/** Page numbers are 1-based and clamped; a junk `?page=` falls back to 1. */
export function parsePageParam(value: string | undefined, totalPages: number) {
  const parsed = Number.parseInt(value ?? "1", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.min(parsed, Math.max(totalPages, 1));
}

export function totalPageCount(totalItems: number, pageSize = LIST_PAGE_SIZE) {
  return Math.max(1, Math.ceil(totalItems / pageSize));
}

export function pageRange(page: number, pageSize = LIST_PAGE_SIZE) {
  const from = (page - 1) * pageSize;
  return { from, to: from + pageSize - 1, limit: pageSize };
}

/** The `1 … 4 5 6 … 12` window. `null` marks a gap. */
export function pageWindow(current: number, total: number, span = 2): Array<number | null> {
  if (total <= 1) return [1];
  const pages = new Set<number>([1, total]);
  for (let p = current - span; p <= current + span; p += 1) {
    if (p >= 1 && p <= total) pages.add(p);
  }

  const ordered = [...pages].sort((a, b) => a - b);
  const out: Array<number | null> = [];
  let previous = 0;
  for (const p of ordered) {
    if (previous && p - previous > 1) out.push(null);
    out.push(p);
    previous = p;
  }
  return out;
}

/** Postgres treats `%` and `_` as wildcards inside ilike. */
export function escapeLikePattern(term: string) {
  return term.replace(/[\\%_]/g, (match) => `\\${match}`);
}

export function normaliseSearchTerm(value: string | undefined) {
  const term = (value ?? "").trim();
  return term.length ? term.slice(0, 100) : "";
}
