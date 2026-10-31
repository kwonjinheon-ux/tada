export type AppIconName = "market" | "community" | "services" | "create" | "close" | "profile";

const iconClasses: Record<AppIconName, string> = {
  market: "ms ms-storefront",
  community: "ms ms-forum",
  services: "ms ms-build",
  create: "ms ms-add",
  close: "ms ms-close",
  profile: "ms ms-account-circle",
};

export function AppIcon({ name, className = "" }: { name: AppIconName; className?: string }) {
  return <i className={`${iconClasses[name]} ${className}`.trim()} aria-hidden="true" />;
}
