import { parsePageParam, totalPageCount } from "@/lib/list-pagination";

/**
 * Resolves `?page=` against a feed loader that reports its own total.
 *
 * The page has to be chosen before the total is known, and a request for a page
 * past the end comes back with neither rows nor a usable count — so clamping to
 * the last page needs a second read of a page that actually exists. That only
 * happens for an out-of-range URL; the ordinary case is one query.
 */
export async function loadPagedFeed<T extends { total: number }>(
  rawPage: string | undefined,
  pageSize: number,
  load: (page: number) => Promise<T>,
): Promise<{ feed: T; page: number; totalPages: number }> {
  const requested = Math.max(1, Number.parseInt(rawPage ?? "1", 10) || 1);
  const first = await load(requested);
  const firstTotalPages = totalPageCount(first.total, pageSize);
  if (parsePageParam(rawPage, firstTotalPages) === requested) return { feed: first, page: requested, totalPages: firstTotalPages };

  // Past the end. Page one always exists, so read it for the real total, then
  // land on the last page rather than the first — asking for page 99 of 3 means
  // "the end", not "the beginning".
  const firstPage = await load(1);
  const totalPages = totalPageCount(firstPage.total, pageSize);
  const page = parsePageParam(rawPage, totalPages);
  if (page === 1) return { feed: firstPage, page, totalPages };
  return { feed: await load(page), page, totalPages };
}
