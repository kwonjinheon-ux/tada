# Global Page Shell

Tada has one shared outer layout rule:

> **Backgrounds are full-bleed. Content lives in one Global Shell.**

Every new page uses the same outer frame. Differences between a browse page, a
detail page, and a form belong inside that frame, never in a page-specific
outer width, margin, or desktop gutter.

## Shell dimensions

| Viewport | Global Shell rule |
| --- | --- |
| Below `768px` | Full width with `16px` inline gutters |
| `768px` to `1023px` | Full width with `24px` inline gutters |
| `1024px` and above | `90%` viewport width, centered, capped at `1360px` |

The tokens live in `src/app/globals.css`:

- `--global-shell-mobile-gutter`
- `--global-shell-tablet-gutter`
- `--global-shell-desktop-width`
- `--global-shell-max-width`

## Required composition

Use `PageContainer` for every new ordinary page. It is Tada's Global Shell;
it has no wide, home, narrow, or page-specific outer-width variants.

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

`PageInner` is optional. Use it only when the content itself needs to be more
focused than the shared frame:

- `size="reading"` for long-form text, help, profile summaries, and detail copy.
- `size="form"` for focused forms.

The page still begins and ends on the Global Shell's alignment line.

## Full-bleed surfaces

Header and footer backgrounds, section backgrounds, borders, maps, image
lightboxes, dialogs, mobile drawers, and mobile bottom navigation may extend to
the viewport edge. Their ordinary contents must sit in the Global Shell.

For application layouts, the entire working surface belongs inside the shell:

```text
Full-bleed page background
└─ Global Shell
   ├─ sidebar, when present
   └─ main content
```

Marketplace, Community, dashboard, and admin screens must keep the sidebar and
main content together inside this shared frame. When a viewport becomes too
narrow, collapse columns or reduce grid density; do not widen the outer frame.

## Rules for new work

- Do not add page-specific `max-width`, `width: 90vw`, `margin-inline: auto`,
  or outer `padding-inline` rules.
- Do not use an outer `wide`, `home`, `narrow`, or `full` container variant.
- Do not place a persistent sidebar against the viewport while centering only
  its main content.
- Keep Header navigation and Footer content on the same Global Shell line as
  page content.
- Use `PageInner` or a component's internal grid to constrain readable text,
  focused forms, or detail panels.
- Keep card padding and grid gaps separate from page-shell spacing.

## Existing exceptions

Fixed-height message panes, modal overlays, photo viewers, maps, mobile
drawers, and bottom navigation can be viewport-anchored. This does not permit a
different ordinary page width behind the overlay.

Before introducing a new page shell, extend `PageContainer` or `PageInner`
instead. A new outer-width variant requires an explicit design-system decision.
