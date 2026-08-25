"use client";

import type { ReactNode } from "react";
import { MobileDrawer } from "@/components/MobileDrawer";

export type BrowseFilterDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  openLabel: string;
  closeLabel: string;
  /** Extra class on the rail, e.g. the Services variant. */
  panelClassName?: string;
  children: ReactNode;
};

/**
 * The floating toggle and the rail it opens. Every browse surface mounted its
 * own copy of this markup, which is how one of them ended up missing a piece.
 */
export function BrowseFilterDrawer({ open, onOpenChange, openLabel, closeLabel, panelClassName, children }: BrowseFilterDrawerProps) {
  return (
    <>
      <button
        className={`floating-filter-button ${open ? "is-open" : ""}`}
        type="button"
        aria-label={open ? closeLabel : openLabel}
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
      >
        <i className="ti ti-adjustments filter-toggle-icon filter-toggle-icon-open" aria-hidden="true" />
        <i className="ti ti-x filter-toggle-icon filter-toggle-icon-close" aria-hidden="true" />
      </button>

      <MobileDrawer
        open={open}
        onClose={() => onOpenChange(false)}
        ariaLabel={closeLabel}
        className="filter-backdrop"
        panelClassName={["market-filter-panel", panelClassName].filter(Boolean).join(" ")}
      >
        <button className="filter-close-button" type="button" aria-label={closeLabel} onClick={() => onOpenChange(false)}>
          <i className="ti ti-x" aria-hidden="true" />
        </button>
        {children}
      </MobileDrawer>
    </>
  );
}
