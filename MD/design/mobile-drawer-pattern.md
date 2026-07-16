# Mobile Drawer Pattern

## Purpose

Use this pattern for mobile-only navigation or category surfaces that need the same interaction as the Market profile dashboard drawer. The drawer opens from the left, fills the viewport height, dims and blurs the remaining page, and closes when the user chooses an item, presses the close control, or taps outside the drawer.

The Market category menu is the reference implementation. It lives in `src/components/market/MarketPageClient.tsx` and is styled in `styles.css`.

## Visual Contract

- Breakpoint: apply the drawer presentation below `768px` only.
- Placement: fixed to the left edge, `top: 0`, `bottom: 0`.
- Width: use `--mobile-drawer-width` (`min(78vw, 320px)`).
- Surface: solid white background, no rounded corners, and a right-facing shadow.
- Backdrop: fixed full-screen layer with a subtle dark tint and blur.
- Close control: 36px square at the upper-right of the drawer, with no rounded corners.
- Header: 46px circular icon surface followed by a compact title.
- Menu rows: icon first, label second, 46px minimum height, and a light selected state.
- Bottom dock: hide it while a drawer is open so it cannot sit above the overlay.

## Required Structure

Use a button for the backdrop, an `aside` for the drawer, and a real button for closing it. Keep the backdrop adjacent to the drawer so their state is easy to review.

```tsx
<button
  className="mobile-category-backdrop"
  type="button"
  aria-label="Close categories"
  onClick={closeDrawer}
/>

<aside className="mobile-category-drawer" aria-label="Categories">
  <button type="button" aria-label="Close categories" onClick={closeDrawer}>
    <i className="fa-solid fa-xmark" aria-hidden="true" />
  </button>
  <div className="mobile-category-drawer-heading">
    <i className="fa-solid fa-rectangle-list" aria-hidden="true" />
    <strong>Categories</strong>
  </div>
  {/* Menu rows */}
</aside>
```

The current Market implementation reuses `market-filter-panel`, `filter-backdrop`, and `filter-close-button` instead of introducing duplicate markup. Future category drawers may do the same when their desktop and mobile surfaces share data.

## State And Events

The Market category drawer is controlled by `isFilterOpen`.

1. The bottom dock dispatches `mobile-category-menu-request`.
2. `MarketPageClient` listens for that event and sets `isFilterOpen` to `true`.
3. The component toggles `has-open-filter` on `document.body` to lock page scrolling.
4. The open backdrop closes the drawer with `setIsFilterOpen(false)`.
5. Selecting a category, using the close control, or opening the dashboard drawer also closes the category drawer.

When adding another drawer, do not leave two drawers open at once. Listen for the competing drawer's open event and close the current surface first.

## Layering Rules

The page contains independent stacking contexts, so z-index values are part of the contract.

| Layer | Mobile z-index | Notes |
| --- | ---: | --- |
| Open drawer backdrop | `121` | Covers content and receives outside clicks. |
| Drawer panel | `122` | Must always be above its backdrop. |
| Active dashboard header | `123` | Keeps the dashboard drawer above the page-level backdrop. |
| Bottom dock | `130` | Hide it with `opacity: 0` and `pointer-events: none` while any drawer is open. |

Do not add a second page-level backdrop without reviewing these values. A duplicate backdrop can blur or block the drawer itself.

## Styling Checklist

1. Declare a shared width variable: `--mobile-drawer-width: min(78vw, 320px)`.
2. Keep desktop/tablet styling separate; only override the panel into a drawer inside the mobile media query.
3. Use `overflow-y: auto` on the drawer, not on the document body.
4. Respect `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)` in padding and close-control placement.
5. Use the left-to-right `mobile-category-drawer-in` animation for category drawers and the existing dashboard drawer transition for profile navigation.
6. Hide unrelated filters in a category-only drawer rather than rendering a second copy of category data.

## Accessibility Checklist

- The trigger must expose `aria-expanded` and `aria-controls` when possible.
- The drawer must use an explicit `aria-label` that identifies its content.
- The backdrop and close control need distinct, descriptive accessible names.
- Every interactive row must remain keyboard reachable.
- Keep icons `aria-hidden` when an adjacent text label supplies the accessible name.
- Selecting a menu item should close the drawer before navigation or content filtering changes.

## Verification Checklist

Test at a 455px-wide viewport and on a real mobile device.

1. Open the category drawer from the bottom dock.
2. Confirm it matches the profile drawer width, left placement, white surface, close control, and blurred backdrop.
3. Tap a category row and confirm the drawer closes.
4. Tap the blurred content area and confirm the drawer closes.
5. Confirm the bottom dock cannot be clicked while the drawer is open.
6. Open the profile drawer after categories and confirm only one overlay is visible.
7. Check a device with a display cutout to confirm safe-area spacing remains intact.

