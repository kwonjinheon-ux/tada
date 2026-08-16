# Design Foundations

## The layering rule

Styling flows in one direction. A layer may only use the layer above it.

```
1. Palette      src/app/globals.css  — the only raw colour values in the repo
2. Semantic     src/app/globals.css  — --color-*, what a colour means
3. Scales       src/app/globals.css  — radius, type, weight, shadow, height, space
4. Primitives   src/app/globals.css  — .ui-button, .ui-card, .ui-field, .ui-pill …
5. Components   src/components/ui/   — Button, PageContainer, DialogOverlay
6. Feature CSS  styles.css           — per-screen classes, layered on primitives
```

`styles.css` loads after `globals.css`, so a feature class always wins over a
primitive it redeclares. That is deliberate: adding a primitive to an existing
element is safe, because the element keeps whatever the feature class already
sets and only gains the shared base it was missing.

`npm run check:tokens` fails the build if a raw hex value appears anywhere
outside the palette block.

## 1. Palette

131 steps, grouped by hue family and numbered by lightness: `--neutral-*`,
`--green-*`, `--blue-*`, `--red-*`, `--rose-*`, `--amber-*`, `--teal-*`,
`--violet-*`, plus a `-soft-` variant of each family for the desaturated shades.
Lower number = lighter.

These were derived from the 616 distinct colours the product already used, so
every step is a real shade from the existing design. Never add a hex here by
hand without checking whether a neighbouring step already covers it.

Never reference a palette step from a component. Reference a semantic role.

## 2. Semantic roles

| Token | Use |
| --- | --- |
| `--color-surface` | Cards, inputs, anything raised |
| `--color-surface-soft` | Subtle fills, hover backgrounds |
| `--color-background` | Page background |
| `--color-ink` / `--color-ink-soft` | Primary and secondary text |
| `--color-muted` / `--color-muted-soft` | Labels, metadata, placeholders |
| `--color-line` / `--color-line-soft` | Borders and dividers |
| `--color-primary` (+ `-hover` `-dark` `-strong` `-deep` `-soft`) | Primary action, positive state |
| `--color-brand` | Tada brand accent |
| `--color-danger` / `--color-warning` / `--color-success` (+ `-soft`) | Status |
| `--color-on-primary` / `--color-on-danger` | Text on a filled control |

Adding a vertical (property, community) means adding roles here, not new hexes.

## 3. Scales

| Scale | Steps |
| --- | --- |
| `--radius-*` | `xs 4` `sm 6` `md 8` `lg 12` `xl 16` `2xl 24` `pill` `circle` |
| `--text-*` | `2xs 10` `xs 11` `sm 12` `base 13` `md 14` `lg 16` `xl 18` `2xl 20` `3xl 24` `4xl 28` `5xl 32` |
| `--weight-*` | `regular 400` `medium 500` `semibold 600` `bold 700` `extrabold 800` |
| `--shadow-*` | `xs` `sm` `md` `lg` `xl` `card` `primary` |
| `--ring-focus`, `--ring-focus-strong` | Focus states — never `outline: none` without one |
| `--control-h-*` | `xs 28` `compact 30` `sm 32` `md 36` `lg 40` `xl 44` `2xl 48` |
| `--space-*` | `1 4` `2 8` `3 12` `4 16` `5 20` `6 24` `8 32` `10 40` `12 48` |

`--radius-ui` and `--radius-card` remain as aliases of `md` and `lg`.

A value that is not on a scale does not go in. If a design genuinely needs a
new step, add it to the scale first so the next screen can reuse it.

## 4. Primitives

`.ui-button` (`--primary` `--secondary` `--ghost` `--danger`, sizes `--sm`
`--lg`, plus `--pill` `--block`), `.ui-card`, `.ui-panel`, `.ui-field`,
`.ui-input`, `.ui-pill` (`--success` `--danger` `--warning`), `.ui-avatar`
(`--sm` `--lg`), `.ui-backdrop`.

Build a new surface by composing these. Do not create another `*-button`,
`*-card`, `*-panel`, `*-status` or `*-backdrop` class — that is how the
codebase ended up with 8 card classes, 9 panel classes and 13 status pills that
each redeclared the same recipe.

When an existing feature class duplicates a primitive, add the primitive class
to the element and delete the duplicated declarations from the feature class.

## 5. Components

Reach for the component before the class:

| Component | Replaces |
| --- | --- |
| `Button` | Any `<button>` that looks like a button |
| `PageContainer` | Page-level `max-width` + `margin auto` + safe-area padding |
| `DialogOverlay` | Any `position: fixed; inset: 0` backdrop |
| `IconButton` | Icon-only controls |

## Responsive standard

Mobile first. One column by default; add density at `md` and above.

| Name | Minimum width | Typical target |
| --- | ---: | --- |
| Base | 320px | iPhone and compact Android |
| `md` | 768px | Tablet |
| `lg` | 1024px | Laptop |
| `xl` | 1280px | Desktop |

Inputs must be at least `16px` on mobile so Safari does not zoom on focus —
`--font-size-mobile-control` enforces this globally.

Page outer spacing and content width rules live in `MD/design/layout-system.md`.

## Known exceptions

Four places hold raw colour on purpose and are allowlisted in
`scripts/check-design-tokens.mjs`:

- `ProfilePhotoUploader.tsx` — canvas `fillStyle` cannot take a CSS variable.
- `PostAdPageClient.tsx` — the listing colour picker persists its value to the
  database, so it must store a real colour.
- `avatar-fallback.ts` — deterministic per-user avatar palette.
- `AuthForms.tsx` — Google brand marks, which must not be recoloured.

Two SVG data URIs in `styles.css` carry a percent-encoded colour (`%23…`) that
a variable cannot reach.

## Fonts

Before production launch, place the licensed Inter WOFF2 files in
`public/fonts/` and define a local `@font-face` for `--font-app`, so the
production build does not depend on Google Fonts.
