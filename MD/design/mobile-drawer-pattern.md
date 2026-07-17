# Mobile Drawer Pattern

## Purpose

Use one mobile drawer system so category and account navigation retain the same layout, type scale, backdrop, motion, and closing behavior.

## Shared Implementation

Both the profile dashboard and category menu use `src/components/MobileDrawer.tsx`. Keep the panel shell, backdrop, state classes, close behavior, menu item typography, and stagger animation in that component's exported class map:

- `mobile-side-drawer`
- `mobile-drawer-backdrop`
- `mobile-drawer-menu-item`
- `mobile-drawer-stagger-item`

Feature components should only supply their panel variant class and inner menu content. Do not add a separate drawer shell or a second menu-state event for a new mobile category.

Use this pattern for mobile-only navigation or category surfaces that need the same interaction as the Market profile dashboard drawer. The drawer opens from the left, fills the viewport height, dims and blurs the remaining page, and closes when the user chooses an item, presses the close control, or taps outside the drawer.

The profile dashboard and Market category menu are the reference implementations. Their content lives in `src/components/Navbar.tsx` and `src/components/market/MarketPageClient.tsx`; shared behavior lives in `src/components/MobileDrawer.tsx` and shared presentation lives in `styles.css`.

## Visual Contract

- Breakpoint: apply the drawer presentation below `768px` only.
- Placement: fixed to the left edge, `top: 0`, `bottom: 0`.
- Width: use `--mobile-drawer-width` (`min(78vw, 320px)`).
- Surface: solid white background, no rounded corners, and a right-facing shadow.
- Backdrop: fixed full-screen layer with a subtle dark tint and blur.
- Close control: 36px square at the upper-right of the drawer, with no rounded corners.
- Header: use a compact brand row at the top-left and reserve the top-right for the close control. Do not add a redundant `Categories` title.
- Category rows: present one vertical row per category with an icon and label, a 44px minimum height, and a muted selected state.
- Supporting filters: hide price, price range, item condition, and the apply button on mobile category drawers. Keep them available in the desktop filter panel.
- Bottom dock: hide it while a drawer is open so it cannot sit above the overlay.

## Required Structure

Use `MobileDrawer` for the backdrop and panel. It renders either an `aside` or `nav` while keeping the shared state classes and close behavior adjacent.

```tsx
<MobileDrawer
  open={isOpen}
  onClose={closeDrawer}
  ariaLabel="Close categories"
  className="filter-backdrop"
  panelClassName="market-filter-panel"
>
  <button type="button" aria-label="Close categories" onClick={closeDrawer}>
    <i className="fa-solid fa-xmark" aria-hidden="true" />
  </button>
  <div className="mobile-category-drawer-brand" aria-hidden="true">Tada</div>
  {/* Vertical category rows */}
</MobileDrawer>
```

Use `as="nav"` with `panelClassName="mobile-dashboard-menu"` for account navigation. Use `panelClassName="market-filter-panel"` for the Market category surface.

## State And Events

The Market category drawer is controlled by `isFilterOpen`.

1. The bottom dock dispatches `mobile-category-menu-request`.
2. `MarketPageClient` listens for that event and sets `isFilterOpen` to `true`.
3. The component toggles `has-open-filter` on `document.body` to lock page scrolling.
4. The open backdrop closes the drawer with `setIsFilterOpen(false)`.
5. Selecting a category or using the close control closes the drawer. Opening the dashboard also closes the category through the existing request event.

When adding another drawer, do not leave two drawers open at once. Listen for the competing drawer's open event and close the current surface first.

## Layering Rules

The page contains independent stacking contexts, so z-index values are part of the contract.

| Layer | Mobile z-index | Notes |
| --- | ---: | --- |
| Open drawer backdrop | `121` | Covers content and receives outside clicks. |
| Drawer panel | `122` | Must always be above its backdrop. |
| Active dashboard header | `123` | Keeps the dashboard drawer above the page-level backdrop. |
| Bottom dock | `130` | Hide it with `opacity: 0` and `pointer-events: none` while any drawer is open. |

Do not create a second drawer backdrop. Use `MobileDrawer`, which owns the backdrop and panel pair.

## Styling Checklist

1. Declare a shared width variable: `--mobile-drawer-width: min(78vw, 320px)`.
2. Keep desktop/tablet styling separate; only override the panel into a drawer inside the mobile media query.
3. Use `overflow-y: auto` on the drawer, not on the document body.
4. Respect `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)` in padding and close-control placement.
5. Use the shared `mobile-side-drawer` transition and `mobile-drawer-stagger-item` sequence for every mobile drawer.
6. Keep price and condition controls in the desktop filter panel. On mobile, the category drawer is navigation-first and should not include secondary filtering controls.

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
2. Confirm it matches the profile drawer width, left placement, white surface, close control, and blurred backdrop, without a redundant title.
3. Confirm the brand row and single-column category menu are visible, with no price, condition, range, or apply controls.
4. Tap a category row and confirm the drawer closes.
5. Tap the blurred content area and confirm the drawer closes.
6. Confirm the bottom dock cannot be clicked while the drawer is open.
7. Open the profile drawer after categories and confirm only one overlay is visible.
8. Check a device with a display cutout to confirm safe-area spacing remains intact.
