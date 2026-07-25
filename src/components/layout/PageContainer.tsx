import type { ReactNode } from "react";

type PageContainerProps = {
  children: ReactNode;
  size?: "default" | "narrow" | "wide" | "full";
  disablePadding?: boolean;
  className?: string;
};

const sizeClass = {
  default: "page-container-default",
  narrow: "page-container-narrow",
  wide: "page-container-wide",
  full: "page-container-full",
} as const;

export function PageContainer({
  children,
  size = "default",
  disablePadding = false,
  className,
}: PageContainerProps) {
  return (
    <div className={["page-container", sizeClass[size], disablePadding && "page-container-no-padding", className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}
