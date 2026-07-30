export const buttonVariants = ["primary", "social", "secondary"] as const;
export type ButtonVariant = (typeof buttonVariants)[number];
