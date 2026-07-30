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
  solidIcon?: boolean;
  variant?: "default" | "create" | "offer" | "save";
  className?: string;
  overlay?: ReactNode;
};

function itemClassName(item: MobileDockItem) {
  return [
    item.active ? "is-active" : "",
    item.variant === "create" ? "mobile-dock-create" : "",
    item.variant === "offer" ? "mobile-dock-offer" : "",
    item.variant === "save" ? "mobile-dock-save" : "",
    item.className ?? "",
  ].filter(Boolean).join(" ");
}

export function MobileDock({ items }: { items: MobileDockItem[] }) {
  return <nav className="mobile-bottom-dock" aria-label="Primary navigation">
    {items.map((item) => {
      const content = <><AppIcon name={item.icon} solid={item.solidIcon} /><span>{item.label}</span>{item.overlay}</>;
      const className = itemClassName(item);
      return item.href ? <Link key={item.id} className={className} href={item.href} aria-label={item.label} aria-current={item.active ? "page" : undefined}>{content}</Link> : <button key={item.id} className={className} type="button" aria-label={item.label} aria-pressed={item.pressed} onClick={item.onClick}>{content}</button>;
    })}
  </nav>;
}
