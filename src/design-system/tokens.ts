/**
 * Canonical design values. CSS custom properties in `src/app/globals.css` are
 * the runtime source of truth; these names keep component APIs consistent.
 */
export const designTokens = {
  breakpoints: { sm: 375, md: 768, lg: 1024, xl: 1280, "2xl": 1536 },
  radius: { control: "var(--radius-ui)", card: "var(--radius-card)" },
  spacing: { content: "var(--content-gap)", section: "var(--section-gap)" },
  container: { default: "var(--page-max-width)", narrow: "var(--page-narrow-max-width)", wide: "var(--page-wide-max-width)" },
  color: { surface: "var(--color-surface)", ink: "var(--color-ink)", muted: "var(--color-muted)", primary: "var(--color-primary)" },
  shadow: { card: "var(--shadow-card)" },
} as const;
