import type { ReactNode } from "react";

type BrowseFilterSidebarProps = {
  location: ReactNode;
  children: ReactNode;
};

// Both browse surfaces use this shell so their rail geometry stays stable
// while each product area supplies its own filter menu.
export function BrowseFilterSidebar({ location, children }: BrowseFilterSidebarProps) {
  return (
    <div className="browse-filter-sidebar">
      <div className="browse-filter-sidebar-location">{location}</div>
      <div className="browse-filter-sidebar-menu">{children}</div>
    </div>
  );
}
