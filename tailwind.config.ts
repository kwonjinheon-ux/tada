import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "var(--color-ink)",
        brand: "var(--color-brand)",
        primary: "var(--color-primary)",
        surface: "var(--color-surface)",
      },
      borderRadius: { ui: "var(--radius-ui)", card: "var(--radius-card)" },
    },
  },
  plugins: [],
};

export default config;
