# Page Layout System

Tada uses one shared outer layout system:

> **Backgrounds are full-bleed. Ordinary content uses the Global Shell; persistent-sidebar workspaces use the App Shell.**

These are design-system primitives, not page-specific variations. Never add a
new page-level outer width, margin, or desktop gutter.

## Global Shell dimensions

Use the Global Shell for Home, Search, Services, Jobs, detail pages, focused
forms, and other ordinary page content.

| Viewport | Global Shell rule |
| --- | --- |
| Below `768px` | Full width with `16px` inline gutters |
| `768px` to `1023px` | Full width with `24px` inline gutters |
| `1024px` and above | `90%` viewport width, centered, capped at `1360px` |

## App Shell dimensions

Use the App Shell for Marketplace browse, Community browse, My Page, Admin,
and Messages.

| Viewport | App Shell rule |
| --- | --- |
| Up to `1680px` | Full viewport workspace |
| `1681px` and above | Centered, capped at `1680px` |

The App Shell deliberately leaves mobile and tablet geometry unchanged. When a
workspace becomes narrow, reduce its internal grid density or use the existing
drawer behaviour rather than narrowing its outer workspace.

The tokens live in `src/app/globals.css`:

- `--global-shell-mobile-gutter`
- `--global-shell-tablet-gutter`
- `--global-shell-desktop-width`
- `--global-shell-max-width`
- `--app-shell-max-width`

## Required composition

Use `PageContainer` for every new ordinary page. It is Tada's Global Shell and
has no wide, home, narrow, or page-specific outer-width variants.

```tsx
import { PageContainer, PageInner } from "@/components/layout/PageContainer";

export default function ExamplePage() {
  return (
    <main>
      <PageContainer>
        <PageInner size="reading">
          <h1>Page title</h1>
        </PageInner>
      </PageContainer>
    </main>
  );
}
```

`PageInner` is optional. It constrains only the content inside the shared
frame:

- `size="reading"` for long-form text, help, profile summaries, and detail copy.
- `size="form"` for focused forms.

For a new persistent-sidebar workspace, use the shared App Shell class on its
top-level application surface:

```tsx
<main className="app-shell">
  <aside>{/* sidebar */}</aside>
  <section>{/* main workspace */}</section>
</main>
```

Existing `marketplace-page` surfaces use the same App Shell cap while the
application migrates to the explicit class.

## Full-bleed surfaces

Header and footer backgrounds, section backgrounds, borders, maps, image
lightboxes, dialogs, mobile drawers, and mobile bottom navigation may extend to
the viewport edge. Their ordinary content belongs to the Global Shell.

For a sidebar workspace, the sidebar and main content belong in one App Shell:

```text
Full-bleed page background
App Shell
|- sidebar
`- main workspace
```

## Rules for new work

- Do not add page-specific `max-width`, `width: 90vw`, `margin-inline: auto`,
  or outer `padding-inline` rules.
- Do not use an outer `wide`, `home`, `narrow`, or `full` container variant.
- Do not add a page-specific width to a sidebar workspace; use `app-shell`.
- Keep Header navigation and Footer content on the Global Shell line for
  ordinary page content.
- Use `PageInner` or an internal grid to constrain readable text, focused
  forms, or detail panels.
- Keep card padding and grid gaps separate from outer-shell spacing.

## Existing exceptions

Fixed-height message panes, modal overlays, photo viewers, maps, mobile
drawers, and bottom navigation can be viewport-anchored. This does not permit a
different ordinary page width behind the overlay.

Before introducing a new outer layout, extend `PageContainer`, `PageInner`, or
`app-shell`. A new outer-width variant requires an explicit design-system
decision.
