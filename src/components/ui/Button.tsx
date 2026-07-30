import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { ButtonVariant } from "@/design-system/variants";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
};

const variantClass: Record<ButtonVariant, string> = {
  primary: "primary-button",
  social: "social-button",
  secondary: "passkey-button",
};

export function Button({ children, className, type = "button", variant = "primary", ...props }: ButtonProps) {
  return <button {...props} type={type} className={[variantClass[variant], className].filter(Boolean).join(" ")}>{children}</button>;
}
