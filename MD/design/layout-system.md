# Layout System

Tada uses one shared responsive page layout system for ordinary page content.

## Spacing Tokens

- `--page-padding-mobile`: 16px
- `--page-padding-tablet`: 24px
- `--page-padding-desktop`: 32px
- `--page-padding-wide`: 40px
- `--page-max-width`: 1200px
- `--section-gap`: 32px
- `--content-gap`: 16px

`--page-padding-inline` changes by breakpoint:

- default mobile: 16px
- `375px` and `768px` and up: 24px
- `1024px` and up: 32px
- `1280px` and up: 40px

Outer page padding uses `env(safe-area-inset-left)` and `env(safe-area-inset-right)` where the page touches viewport edges.

## Required Page Rule

All ordinary top-level page content must use `PageContainer` from `src/components/layout/PageContainer.tsx`.

```tsx
import { PageContainer } from "@/components/layout/PageContainer";

export default function ExamplePage() {
  return (
    <main>
      <PageContainer>
        <h1>Page title</h1>
      </PageContainer>
    </main>
  );
}
```

Use variants only when the page has a clear layout reason:

```tsx
<PageContainer size="narrow">...</PageContainer>
<PageContainer size="wide">...</PageContainer>
<PageContainer size="full" disablePadding>...</PageContainer>
```

## Rules For New Work

- Every ordinary page's top-level content area uses `PageContainer`.
- Do not write ad hoc `max-w-*`, `mx-auto`, or responsive `px-*` combinations directly in page files.
- If a new outer spacing value is needed, update layout tokens or a `PageContainer` variant instead of adding one-off page CSS.
- Do not confuse card internal padding with page outer padding.
- Use `size="full"` or `disablePadding` only for clear full-width surfaces such as app shells, maps, edge-to-edge media, or dashboards.
- Reuse existing common layout components before creating new ones.

## Exceptions

Full application shells may manage their own outer layout:

- Marketplace browse page with a desktop sidebar.
- Dashboard pages with persistent side navigation.
- Messages pages with fixed-height panes.
- Full-width banners, maps, edge-to-edge images, modals, headers, footers, and mobile bottom navigation.

These exceptions should still use the shared spacing tokens for inner content when they need ordinary content gutters.

Dashboard pages must use `marketplace-page dashboard-page dashboard-layout` on the top-level `main`. The `dashboard-layout` reference owns the sidebar rail, border, and content gutter so profile settings, messages, wishlist, and keyword alerts stay aligned across mobile and desktop.
