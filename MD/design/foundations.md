# Design Foundations

## Single visual reference

All new screens use `src/app/globals.css` as the token source. Do not introduce arbitrary colors, font stacks, radius values or spacing values in individual components unless a token is added first.

Before production launch, place the licensed Inter WOFF2 files in `public/fonts/` and define a local `@font-face` for `--font-app`. This keeps a single font reference without making the production build depend on Google Fonts.

| Token | Current value | Use |
| --- | --- | --- |
| `--font-app` | Inter with system fallbacks | All product UI text |
| `--color-background` | `#f7f9ff` | App background |
| `--color-surface` | `#ffffff` | Cards and inputs |
| `--color-ink` | `#07172d` | Primary text |
| `--color-primary` | `#10b981` | Primary action and positive state |
| `--color-brand` | `#2546c7` | Tada brand accent |
| `--radius-ui` | `8px` | Inputs and buttons |
| `--radius-card` | `12px` | Panels and cards |

## Responsive standard

The project follows mobile first styling:

| Name | Minimum width | Typical target |
| --- | ---: | --- |
| Base | 320px | iPhone and compact Android |
| `md` | 768px | Tablet |
| `lg` | 1024px | Laptop |
| `xl` | 1280px | Desktop |

Use one column as the default. Add density only at `md` and above. Inputs must be at least `16px` on mobile so Safari does not zoom on focus.

## Component rules

- Buttons and form controls use shared `button` and `form-field` foundations.
- Use accessible labels, visible focus states and semantic headings.
- Avoid hard-coded device-specific layout adjustments. Use container widths and CSS grid instead.
- Icons must have an accessible label unless they are decorative.
