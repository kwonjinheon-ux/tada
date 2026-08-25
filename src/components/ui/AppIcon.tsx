import type { ReactNode } from "react";

export type AppIconName = "home" | "message" | "create" | "categories" | "profile" | "offer" | "share" | "check" | "heart" | "edit" | "delete";

const iconClasses: Record<AppIconName, string> = {
  home: "ms ms-home",
  message: "ms ms-chat-bubble",
  create: "ms ms-add",
  categories: "ms ms-list-alt",
  profile: "ms ms-account-circle",
  offer: "ms ms-sell",
  share: "ms ms-share",
  check: "ms ms-check",
  heart: "ms ms-favorite",
  edit: "ms ms-edit",
  delete: "ms ms-delete",
};

/** `solid` fills the glyph, for icons that carry an on/off state. Fill is an
 *  axis on the icon font, so the outline form is a modifier, not another glyph. */
export function AppIcon({ name, solid = false, className = "" }: { name: AppIconName; solid?: boolean; className?: string }) {
  const outline = name === "heart" && !solid ? " ms--outline" : "";
  return <i className={`${iconClasses[name]}${outline} ${className}`.trim()} aria-hidden="true" />;
}

export function DockIcon({ name, solid = false, children }: { name: AppIconName; solid?: boolean; children?: ReactNode }) {
  return <><AppIcon name={name} solid={solid} />{children}</>;
}
