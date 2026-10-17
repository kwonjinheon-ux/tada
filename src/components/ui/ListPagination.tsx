"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { pageWindow } from "@/lib/list-pagination";

type ListPaginationProps = {
  page: number;
  totalPages: number;
  label?: string;
  /** The query the list is actually showing, for pushed-URL feeds. */
  search?: string;
  /** Set by a list that pages through its own state rather than the URL. */
  onPageChange?: (page: number) => void;
  /** Links jump to the top by default; a list inside a page keeps its place. */
  scroll?: boolean;
};

/** The numbered index under a long list. Every other query param on the URL
 *  survives the jump, so paging does not silently drop the active filter or
 *  the current search.
 *
 *  A list that swaps its own feed rewrites the URL with history.pushState,
 *  which the App Router does not observe — useSearchParams would hand back the
 *  filters the page was last served with, so those lists pass the query they
 *  are actually showing as `search`.
 *
 *  One index for every long list in the product: search results and seller
 *  reviews page through state rather than the URL, so they hand over
 *  `onPageChange` and get the same control as a button. */
export function ListPagination({ page, totalPages, label = "Pagination", search, onPageChange, scroll = true }: ListPaginationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  const hrefFor = (target: number) => {
    const next = new URLSearchParams(search ?? searchParams.toString());
    if (target <= 1) next.delete("page");
    else next.set("page", String(target));
    const query = next.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  const control = (target: number, { className, ariaLabel, isCurrent = false, isDisabled = false, children }: {
    className?: string; ariaLabel?: string; isCurrent?: boolean; isDisabled?: boolean; children: ReactNode;
  }) => (onPageChange ? (
    <button
      className={className}
      type="button"
      aria-label={ariaLabel}
      aria-current={isCurrent ? "page" : undefined}
      disabled={isDisabled}
      onClick={() => onPageChange(target)}
    >
      {children}
    </button>
  ) : (
    <Link
      className={className}
      href={hrefFor(target)}
      scroll={scroll}
      aria-label={ariaLabel}
      aria-current={isCurrent ? "page" : undefined}
      aria-disabled={isDisabled || undefined}
      tabIndex={isDisabled ? -1 : undefined}
    >
      {children}
    </Link>
  ));

  return (
    <nav className="list-pagination" aria-label={label}>
      {control(page - 1, {
        className: "list-pagination-step",
        ariaLabel: "Previous page",
        isDisabled: page === 1,
        children: <i className="ms ms-chevron-left" aria-hidden="true" />,
      })}

      <ol className="list-pagination-pages">
        {pageWindow(page, totalPages).map((entry, index) => (
          <li key={entry ?? `gap-${index}`}>
            {entry === null ? (
              <span className="list-pagination-gap" aria-hidden="true">…</span>
            ) : control(entry, {
              className: entry === page ? "is-current" : "",
              ariaLabel: `Page ${entry}`,
              isCurrent: entry === page,
              children: entry,
            })}
          </li>
        ))}
      </ol>

      {control(page + 1, {
        className: "list-pagination-step",
        ariaLabel: "Next page",
        isDisabled: page === totalPages,
        children: <i className="ms ms-chevron-right" aria-hidden="true" />,
      })}
    </nav>
  );
}
