import type { ReactNode } from "react";

type PageContainerProps = {
  children: ReactNode;
  className?: string;
};

type PageInnerProps = {
  children: ReactNode;
  size?: "reading" | "form";
  className?: string;
};

export function PageContainer({
  children,
  className,
}: PageContainerProps) {
  return (
    <div className={["global-shell", "page-container", className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}

/**
 * Narrows a page's content without changing its shared outer frame.
 * Use this for long-form reading and focused forms inside PageContainer.
 */
export function PageInner({ children, size = "reading", className }: PageInnerProps) {
  return (
    <div className={["page-inner", `page-inner-${size}`, className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}
