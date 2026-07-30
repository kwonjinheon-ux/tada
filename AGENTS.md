# Front-end architecture rules

This project uses reusable React components and a shared design system.

Before creating or modifying UI:

1. Inspect existing resources before creating anything: `src/components`, `src/design-system`, `src/app`, `src/lib`, `public`, `styles.css`, `src/app/globals.css`, and relevant documentation in `MD` and `docs`.
2. Search `src/components` for an existing component and search existing CSS for an established visual pattern.
3. Reuse or extend an existing component, asset, utility, token, or style before creating a new one.
4. Prefer existing images, icons, copy, routes, data helpers, and design tokens over new substitutes.
5. Do not implement reusable buttons, cards, inputs, avatars, badges, modals, tabs, headers, navigation bars, or page containers directly inside page files.
6. Page files should primarily compose existing components.
7. Use shared UI primitives from `src/components/ui`.
8. Use shared layout components from `src/components/layout`.
9. Use design tokens from `src/design-system`.
10. Do not introduce arbitrary spacing, font sizes, shadows, colours, heights, widths, or border radii.
11. Use component variants instead of duplicate components.
12. Extract repeated JSX and Tailwind class combinations.
13. Preserve existing responsive behaviour and accessibility.
14. Do not create a new component, CSS file, asset, or utility unless an existing resource cannot reasonably be extended.

## Resource reuse checklist

Before adding a file or a new visual pattern, confirm all of the following:

- No suitable component exists in `src/components`.
- No suitable design token, icon, image, utility, or style already exists.
- The new resource has a clear reuse boundary and is placed in the appropriate shared or feature folder.
- Existing imports and public assets are used where they meet the requirement.
- Duplicated CSS and one-off JSX have been avoided.

A task is not complete if reusable UI has been duplicated inside a page.

## Dialog and popup standard

- Use `src/components/ui/DialogOverlay.tsx` for every dismissible modal or popup.
- Every dialog backdrop must blur the page behind it and visibly state that clicking or tapping outside closes the dialog.
- A click or tap on the backdrop must close the dialog unless a submission or destructive operation is in progress.
- Keep an explicit close or cancel control in the dialog for keyboard and assistive-technology users.
- Reuse `DialogDismissHint` for lightboxes or other overlays that require a custom backdrop structure.

Before completing any UI task:

- Check for duplicate implementations.
- Run TypeScript validation.
- Run linting.
- Confirm mobile and desktop behaviour.
- Report which existing components were reused.
- Report any new components created and why they were necessary.
