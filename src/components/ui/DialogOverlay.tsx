"use client";

import type { HTMLAttributes, ReactNode } from "react";

type DialogOverlayProps = Omit<HTMLAttributes<HTMLDivElement>, "children" | "onPointerDown"> & {
  children: ReactNode;
  onClose: () => void;
  isDismissible?: boolean;
  dismissHint?: string;
};

export function DialogDismissHint({ children = "Click outside to close" }: { children?: ReactNode }) {
  return <p className="dialog-overlay-dismiss-hint" aria-hidden="true">{children}</p>;
}

export function DialogOverlay({ children, className, onClose, isDismissible = true, dismissHint, ...props }: DialogOverlayProps) {
  return (
    <div
      {...props}
      className={["dialog-overlay", className].filter(Boolean).join(" ")}
      role="dialog"
      aria-modal="true"
      onPointerDown={(event) => {
        if (isDismissible && event.target === event.currentTarget) onClose();
      }}
    >
      {children}
      {isDismissible ? <DialogDismissHint>{dismissHint}</DialogDismissHint> : null}
    </div>
  );
}
