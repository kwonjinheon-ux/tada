"use client";

import type { HTMLAttributes, ReactNode } from "react";

type PopupBackdropProps = Omit<HTMLAttributes<HTMLDivElement>, "children" | "onClick" | "onPointerDown"> & {
  children?: ReactNode;
  onClose: () => void;
  isDismissible?: boolean;
};

type DialogOverlayProps = PopupBackdropProps & {
  children: ReactNode;
};

/**
 * Shared popup backdrop. It consumes outside clicks before dismissing so a
 * pointer action can never continue through to controls behind an open popup.
 */
export function PopupBackdrop({ children, className, onClose, isDismissible = true, ...props }: PopupBackdropProps) {
  return (
    <div
      {...props}
      className={["popup-backdrop", className].filter(Boolean).join(" ")}
      role={props.role ?? "presentation"}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) event.stopPropagation();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;

        event.preventDefault();
        event.stopPropagation();
        if (isDismissible) onClose();
      }}
    >
      {children}
    </div>
  );
}

export function DialogOverlay({ children, className, onClose, isDismissible = true, ...props }: DialogOverlayProps) {
  return (
    <PopupBackdrop
      {...props}
      className={["dialog-overlay", className].filter(Boolean).join(" ")}
      role="dialog"
      aria-modal="true"
      onClose={onClose}
      isDismissible={isDismissible}
    >
      {children}
    </PopupBackdrop>
  );
}
