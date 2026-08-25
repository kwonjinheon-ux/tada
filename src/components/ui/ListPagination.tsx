"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { pageWindow } from "@/lib/list-pagination";

/** The numbered index under a long list. Every other query param on the URL
 *  survives the jump, so paging does not silently drop the active filter or
 *  the current search. */
export function ListPagination({ page, totalPages, label = "Pagination" }: { page: number; totalPages: number; label?: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  const hrefFor = (target: number) => {
    const next = new URLSearchParams(searchParams.toString());
    if (target <= 1) next.delete("page");
    else next.set("page", String(target));
    const query = next.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  return (
    <nav className="list-pagination" aria-label={label}>
      <Link
        className="list-pagination-step"
        href={hrefFor(page - 1)}
        aria-label="Previous page"
        aria-disabled={page === 1}
        tabIndex={page === 1 ? -1 : undefined}
      >
        <i className="ms ms-chevron-left" aria-hidden="true" />
      </Link>

      <ol className="list-pagination-pages">
        {pageWindow(page, totalPages).map((entry, index) => (
          <li key={entry ?? `gap-${index}`}>
            {entry === null ? (
              <span className="list-pagination-gap" aria-hidden="true">…</span>
            ) : (
              <Link
                className={entry === page ? "is-current" : ""}
                href={hrefFor(entry)}
                aria-label={`Page ${entry}`}
                aria-current={entry === page ? "page" : undefined}
              >
                {entry}
              </Link>
            )}
          </li>
        ))}
      </ol>

      <Link
        className="list-pagination-step"
        href={hrefFor(page + 1)}
        aria-label="Next page"
        aria-disabled={page === totalPages}
        tabIndex={page === totalPages ? -1 : undefined}
      >
        <i className="ms ms-chevron-right" aria-hidden="true" />
      </Link>
    </nav>
  );
}
