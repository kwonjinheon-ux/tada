import type { ReactNode } from "react";

export type AppIconName = "home" | "message" | "create" | "categories" | "profile" | "offer" | "share" | "check" | "heart" | "edit" | "delete";

const iconClasses: Partial<Record<AppIconName, string>> = {
  message: "fa-regular fa-comment",
  create: "fa-solid fa-plus",
  categories: "fa-regular fa-rectangle-list",
  profile: "fa-regular fa-circle-user",
  offer: "fa-solid fa-tag",
  share: "fa-solid fa-arrow-up-from-bracket",
  check: "fa-solid fa-check",
  heart: "fa-regular fa-heart",
  edit: "fa-solid fa-pen-to-square",
  delete: "fa-regular fa-trash-can",
};

export function AppIcon({ name, solid = false, className = "" }: { name: AppIconName; solid?: boolean; className?: string }) {
  if (name === "home") {
    return <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><path d="m3.5 10.5 8.5-7 8.5 7v9.25a1.75 1.75 0 0 1-1.75 1.75H5.25a1.75 1.75 0 0 1-1.75-1.75z" /><path d="M9.25 21.5v-6.25h5.5v6.25" /></svg>;
  }

  const iconClass = name === "heart" && solid ? "fa-solid fa-heart" : iconClasses[name];
  return <i className={`${iconClass} ${className}`.trim()} aria-hidden="true" />;
}

export function DockIcon({ name, solid = false, children }: { name: AppIconName; solid?: boolean; children?: ReactNode }) {
  return <><AppIcon name={name} solid={solid} />{children}</>;
}
