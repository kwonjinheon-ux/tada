import type { ButtonHTMLAttributes, ReactNode } from "react";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode };

export function IconButton({ children, className, type = "button", ...props }: IconButtonProps) {
  return <button {...props} type={type} className={["icon-button", className].filter(Boolean).join(" ")}>{children}</button>;
}
