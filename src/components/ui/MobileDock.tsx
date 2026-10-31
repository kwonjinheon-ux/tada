"use client";

import Link from "next/link";
import { AppIcon, type AppIconName } from "@/components/ui/AppIcon";

export type MobileDockItem = {
  id: string;
  label: string;
  icon: AppIconName;
  href?: string;
  onClick?: () => void;
  active?: boolean;
  /** For an item that opens a menu: whether it is open, and which element it opens. */
  expanded?: boolean;
  controls?: string;
  /** A count shown on the icon, e.g. unread messages. */
  badge?: string;
  variant?: "default" | "create";
  className?: string;
};

function itemClassName(item: MobileDockItem) {
  return [
    item.active ? "is-active" : "",
    item.expanded ? "is-open" : "",
    item.variant === "create" ? "mobile-dock-create" : "",
    item.className ?? "",
  ].filter(Boolean).join(" ");
}

export function MobileDock({ items }: { items: MobileDockItem[] }) {
  return <nav className="mobile-bottom-dock" aria-label="Primary navigation">
    {items.map((item) => {
      const icon = <AppIcon name={item.icon} />;
      const content = <>{item.badge ? <span className="mobile-dock-icon">{icon}<span className="mobile-dock-badge" aria-hidden="true">{item.badge}</span></span> : icon}<span>{item.label}</span></>;
      const className = itemClassName(item);
      return item.href ? <Link key={item.id} className={className} href={item.href} aria-label={item.label} aria-current={item.active ? "page" : undefined}>{content}</Link> : <button key={item.id} className={className} type="button" aria-label={item.label} aria-expanded={item.expanded} aria-haspopup={item.controls ? "dialog" : undefined} aria-controls={item.expanded ? item.controls : undefined} onClick={item.onClick}>{content}</button>;
    })}
  </nav>;
}
