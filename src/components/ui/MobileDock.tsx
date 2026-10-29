"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { AppIcon, type AppIconName } from "@/components/ui/AppIcon";

export type MobileDockItem = {
  id: string;
  label: string;
  icon: AppIconName;
  href?: string;
  onClick?: () => void;
  active?: boolean;
  pressed?: boolean;
  /** For an item that opens a menu: whether it is open, and which element it opens. */
  expanded?: boolean;
  controls?: string;
  /** A count shown on the icon, e.g. unread messages. */
  badge?: string;
  solidIcon?: boolean;
  actionLabel?: string;
  variant?: "default" | "create" | "offer" | "save";
  className?: string;
  overlay?: ReactNode;
};

function itemClassName(item: MobileDockItem) {
  return [
    item.active ? "is-active" : "",
    item.expanded ? "is-open" : "",
    item.variant === "create" ? "mobile-dock-create" : "",
    item.variant === "offer" ? "mobile-dock-offer" : "",
    item.variant === "save" ? "mobile-dock-save" : "",
    item.className ?? "",
  ].filter(Boolean).join(" ");
}

export function MobileDock({ items }: { items: MobileDockItem[] }) {
  return <nav className="mobile-bottom-dock" aria-label="Primary navigation">
    {items.map((item) => {
      const icon = item.actionLabel ? <span className="mobile-dock-action-label">{item.actionLabel}</span> : <AppIcon name={item.icon} solid={item.solidIcon} />;
      const content = <>{item.badge ? <span className="mobile-dock-icon">{icon}<span className="mobile-dock-badge" aria-hidden="true">{item.badge}</span></span> : icon}<span>{item.label}</span>{item.overlay}</>;
      const className = itemClassName(item);
      return item.href ? <Link key={item.id} className={className} href={item.href} aria-label={item.label} aria-current={item.active ? "page" : undefined}>{content}</Link> : <button key={item.id} className={className} type="button" aria-label={item.label} aria-pressed={item.pressed} aria-expanded={item.expanded} aria-haspopup={item.controls ? "dialog" : undefined} aria-controls={item.expanded ? item.controls : undefined} onClick={item.onClick}>{content}</button>;
    })}
  </nav>;
}
