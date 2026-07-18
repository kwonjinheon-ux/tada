"use client";

import { useEffect, type ReactNode } from "react";

export const mobileDrawerClasses = {
  panel: "mobile-side-drawer",
  backdrop: "mobile-drawer-backdrop",
  menuItem: "mobile-drawer-menu-item",
  staggerItem: "mobile-drawer-stagger-item",
} as const;

type MobileDrawerBackdropProps = {
  open: boolean;
  onClose: () => void;
  ariaLabel: string;
  className?: string;
};

type MobileDrawerProps = MobileDrawerBackdropProps & {
  children: ReactNode;
  panelClassName: string;
  as?: "aside" | "nav";
  id?: string;
};

const joinClasses = (...classes: Array<string | false | undefined>) => classes.filter(Boolean).join(" ");

export function MobileDrawerBackdrop({ open, onClose, ariaLabel, className }: MobileDrawerBackdropProps) {
  return (
    <button
      className={joinClasses(className, mobileDrawerClasses.backdrop, open && "is-open")}
      type="button"
      aria-label={ariaLabel}
      onClick={onClose}
    />
  );
}

export function MobileDrawer({
  open,
  onClose,
  ariaLabel,
  className,
  panelClassName,
  as = "aside",
  id,
  children,
}: MobileDrawerProps) {
  useEffect(() => {
    if (!open) return;

    document.body.classList.add("has-open-mobile-drawer");
    return () => document.body.classList.remove("has-open-mobile-drawer");
  }, [open]);

  const panelClasses = joinClasses(panelClassName, mobileDrawerClasses.panel, open && "is-open");
  const backdrop = <MobileDrawerBackdrop open={open} onClose={onClose} ariaLabel={ariaLabel} className={className} />;

  return (
    <>
      {backdrop}
      {as === "nav" ? (
        <nav className={panelClasses} id={id} aria-label={ariaLabel}>
          {children}
        </nav>
      ) : (
        <aside className={panelClasses} id={id} aria-label={ariaLabel}>
          {children}
        </aside>
      )}
    </>
  );
}
