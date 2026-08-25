import type { ReactNode } from "react";

export type AppIconName = "home" | "message" | "create" | "categories" | "profile" | "offer" | "share" | "check" | "heart" | "edit" | "delete";

const iconClasses: Record<AppIconName, string> = {
  home: "ti ti-home",
  message: "ti ti-message-circle",
  create: "ti ti-plus",
  categories: "ti ti-list-details",
  profile: "ti ti-user-circle",
  offer: "ti ti-tag",
  share: "ti ti-share",
  check: "ti ti-check",
  heart: "ti ti-heart",
  edit: "ti ti-edit",
  delete: "ti ti-trash",
};

/** `solid` fills the glyph, for icons that carry an on/off state. */
export function AppIcon({ name, solid = false, className = "" }: { name: AppIconName; solid?: boolean; className?: string }) {
  const iconClass = name === "heart" && solid ? "ti ti-heart-filled" : iconClasses[name];
  return <i className={`${iconClass} ${className}`.trim()} aria-hidden="true" />;
}

export function DockIcon({ name, solid = false, children }: { name: AppIconName; solid?: boolean; children?: ReactNode }) {
  return <><AppIcon name={name} solid={solid} />{children}</>;
}
