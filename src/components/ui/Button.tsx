import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { ButtonSize, ButtonVariant } from "@/design-system/variants";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  pill?: boolean;
  block?: boolean;
};

// Each variant carries the primitive plus the legacy class that already styles
// it. styles.css loads after globals.css, so the legacy rules still win and the
// rendered result is unchanged — the primitive only supplies the shared base
// (focus ring, disabled state, box model) that these classes never declared.
const variantClass: Record<ButtonVariant, string> = {
  primary: "ui-button--primary primary-button",
  secondary: "ui-button--secondary passkey-button",
  ghost: "ui-button--ghost",
  danger: "ui-button--danger",
  social: "ui-button--secondary social-button",
};

const sizeClass: Record<ButtonSize, string> = {
  sm: "ui-button--sm",
  md: "",
  lg: "ui-button--lg",
};

export function Button({
  children,
  className,
  type = "button",
  variant = "primary",
  size = "md",
  pill = false,
  block = false,
  ...props
}: ButtonProps) {
  const classes = [
    "ui-button",
    variantClass[variant],
    sizeClass[size],
    pill ? "ui-button--pill" : "",
    block ? "ui-button--block" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <button {...props} type={type} className={classes}>{children}</button>;
}
