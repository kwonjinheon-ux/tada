# Messaging and List Surfaces

Rules established while building the marketplace messages and notifications
screens. They apply to any surface with the same shape: a scrolling list of
rows, a chat-style thread, or a header that owns bulk actions.

Read [Design Foundations](./foundations.md) and [Layout System](./layout-system.md)
first — this document adds to them, it does not replace them.

---

## 1. Viewport-anchored surfaces

A chat thread is not ordinary page content. On a real phone the browser pans the
page when an input takes focus and collapses its own chrome as you scroll, so
anything positioned in the document flow can slide out of view. A thread header
carries the back link, the listing being traded, and who the counterpart is —
losing it strands the user.

**Rule.** A mobile surface that must stay put anchors to the *visual* viewport,
not the document.

```css
.messages-page.has-selected-conversation .messages-thread-panel {
  --messages-thread-top-inset: var(--messages-site-header-height, 118px);
  position: fixed;
  top: calc(var(--messages-viewport-offset-top, 0px) + var(--messages-thread-top-inset));
  height: calc(var(--messages-viewport-height, 100dvh) - var(--messages-thread-top-inset));
}
```

`top` must carry `visualViewport.offsetTop`. iOS Safari lays `position: fixed`
out against the **layout** viewport, and the layout viewport does not shrink for
the keyboard — it only gets panned. Drop the offset and the panel spans the whole
screen with its composer hidden behind the keyboard.

**A blank strip above the header is not an offset bug.** Measure it: if it is the
height of the site header, the keyboard-open class simply never applied and the
top inset never went to zero. Fix the detection, not the offset. Getting this
backwards trades one real-device bug for another, and neither reproduces on a
desktop browser.

The three custom properties are written by JS from `window.visualViewport` in
`MarketMessagesClient`, and removed on unmount. Track both `resize` and `scroll`
on `visualViewport`: iOS changes `offsetTop` during its pan-into-view without
always firing `resize`.

**Two hazards that will silently break this.**

- A transformed ancestor becomes the containing block for a `position: fixed`
  child, so `position: fixed` stops meaning "the viewport". The dashboard shell
  carries `transform: translateY(...)`; it is switched off for exactly this case
  via `:has(.messages-page.has-selected-conversation)`. Match the *full* class
  chain of the rule you are overriding — `:has()` specificity is the specificity
  of its most specific argument, which loses to a four-class selector otherwise.
- `100dvh` is not the visual viewport. It excludes browser chrome but not the
  keyboard. Use `--messages-viewport-height` where the keyboard matters and keep
  `100dvh` only as the fallback value.

## 2. The keyboard is measured, not guessed

`visualViewport.height` already excludes the on-screen keyboard. A composer
pinned to the bottom of a panel sized from it lands directly above the keyboard
with no keyboard-height math.

Where a surface needs to *know* the keyboard is open — to reclaim the space the
site header was using, or to drop `env(safe-area-inset-bottom)` padding that the
keyboard now covers — derive it:

```js
const keyboardInset = Math.max(0, window.innerHeight - viewportHeight);
document.documentElement.classList.toggle("messages-keyboard-open", keyboardInset > 120);
```

`window.innerHeight` stays at the layout viewport height while the keyboard
shrinks the visual one, so the difference is the inset. **Do not subtract
`offsetTop`** — iOS pans the layout viewport by roughly the keyboard height when
the composer takes focus, so subtracting it cancels the quantity being measured
and the inset never crosses the threshold. Expose the result as a
class on `<html>` and let CSS react. Never hardcode a keyboard height, and never
infer "mobile" from a user-agent string for this.

Re-pin the scroller to the bottom when the keyboard state *changes*, not on every
`visualViewport` event — `scroll` fires continuously during a pan and would fight
the user.

## 3. One scroller per surface

**Rule.** In a fixed-height surface, exactly one region scrolls. Everything else
is `flex: 0 0 auto`.

```
.messages-thread-panel   display: flex; flex-direction: column; overflow: hidden
  ├─ header              flex: 0 0 auto
  ├─ body                flex: 1 1 auto; min-height: 0; overflow-y: auto   ← the only scroller
  └─ composer            flex: 0 0 auto
```

`min-height: 0` on the scrolling child is required. Without it a flex item
refuses to shrink below its content size, the panel grows past its own height,
and the header and footer get pushed out — the exact failure this rule prevents.

Add `overscroll-behavior: contain` so reaching the end of the thread does not
start scrolling the page behind it.

## 4. Optional elements never move fixed ones

An unread badge appears on some rows and not others. If it occupies its own grid
column, every row that has one squeezes the column beside it and the timestamp
above shifts — the list looks ragged as messages are read.

**Rule.** Conditional content sits *inside* a flexible region, never in a grid
column of its own alongside content that must stay aligned.

```css
/* 52px thumbnail | flexible copy — two columns, not three */
.messages-conversation { grid-template-columns: 52px minmax(0, 1fr); }
/* the badge rides the preview line, so the timestamp above keeps its right edge */
.messages-conversation-preview { display: flex; justify-content: space-between; gap: 8px; }
```

Verify by measuring, not by eye: every row's timestamp should report the same
`getBoundingClientRect().right` regardless of whether it has a badge.

## 5. Unread and destructive are red

Unread counts use `--red-850`, matching the header total and the navigation
badge. One meaning, one colour, everywhere it appears.

Destructive controls get `.is-danger` — a red border and red text on a normal
surface, never a filled red button. A filled red control reads as the primary
action of the screen, which deletion never is.

## 6. Bulk actions

Bulk controls live in the surface's own header — `.messages-list-header`,
`.notifications-heading` — so one implementation serves mobile and desktop. Do
not build a separate mobile affordance.

They share one class, `.bulk-action-button`, with `.is-danger` for destructive
and `.is-compact` for narrow rails. A second surface needing a bulk control
extends that class; it does not copy the declarations into a new one.

- Disable, do not hide, when there is nothing to act on. A control that appears
  and disappears is harder to find than one that greys out.
- Update local state optimistically, then fire the request. The user sees the
  result immediately.
- **Non-destructive** (mark all read): optimistic update, fire and forget. A lost
  read receipt is recoverable.
- **Destructive** (delete all): keep a snapshot, clear the list, and **restore the
  snapshot if the request fails**. Never leave the UI showing a deletion that did
  not happen.
- **Destructive actions take two taps.** The button becomes its own confirmation
  (`Delete all` → `Delete all?` + `Cancel`) rather than opening a dialog. Both
  states carry an icon, because these buttons collapse to icon-only squares below
  768px and a text-only Cancel would render as an empty box.

Bulk endpoints are their own route (`read-all`, `delete-all`) beside the
per-item route, scoped to `user.id` server-side. They must not widen the blast
radius of the surface they belong to: messages' `read-all` clears
conversation-bound notifications only, leaving offer and listing alerts alone.

## 7. Filter tabs

`role="tablist"` on the row, `role="tab"` and `aria-selected` on each button,
driven by one `useState` and a pure predicate. Render the set from an array —
four hand-written buttons drift.

Every filter needs its own empty state. "No messages yet" is wrong when the
inbox is full and the *filter* is empty; distinguish "you have nothing" from
"nothing matches this filter" and point the way back.

## 8. Message bubbles

Mine: filled `--green-550`, white text, transparent border, `align-self: flex-end`.
Theirs: `--neutral-50` with a `--neutral-250` border, `align-self: flex-start`.

Both carry the same border width so the two sides have identical geometry —
`is-mine` sets `border-color: transparent`, it does not remove the border.

## 9. One shape per repeated object

Two screens showing the same kind of object must lay it out identically. Wishlist
and Manage Listings both list a listing, so both use `.listing-row`: image,
title, status pill and price sit in the same place on both, and only the trailing
`.listing-row-actions` column differs. Verified by measurement — same
`min-height`, same media box, same title and price x-offsets on both screens.

The same rule governs the dashboard rail. It is described once in the
`.dashboard-layout` reference block. A shell that needs different anchoring
overrides `--dashboard-rail-top` / `--dashboard-rail-height` /
`--dashboard-rail-min-height` and nothing else — Messages does exactly this
because it is a fixed-height surface. Never redeclare the rail itself.

**Rule.** When a second screen needs an existing pattern, it adds a class and,
if truly necessary, overrides the pattern's variables. Copying declarations into
a parallel class is how the two drift apart in the first place.

## 10. Per-participant state

Anything a user does to a shared object — archiving, deleting, muting a
conversation — is their copy only. `market_conversation_states` is keyed by
`(conversation_id, user_id)` for this reason: one participant clearing their
inbox must never destroy the other's record of the same trade. The shared row is
removed only once every participant has deleted it.

Retention follows from the same principle: a new message clears both marks for
both sides, so housekeeping can never silence a live negotiation.

## 11. Colour tokens in feature CSS

[Foundations](./foundations.md) says to reference a semantic role, not a palette
step. Feature CSS in `styles.css` does not currently follow that: roughly 1,280
palette-step references against 19 semantic ones.

**Rule for now.** Match the surrounding file. New rules in `styles.css` use
palette steps like the code around them; new *primitives* in `globals.css` use
semantic roles. Introducing semantic roles into one corner of `styles.css` makes
the file harder to read, not easier — migrating it is its own task, not a
side effect of a feature.

`npm run check:tokens` enforces the part that actually matters: no raw hex
outside the palette block.

---

## Before calling this kind of work done

1. `npx tsc --noEmit`
2. `npm run lint`
3. `node scripts/check-design-tokens.mjs`
4. Load the surface at **375px and at desktop width** — a fixed-position mobile
   rule that leaks past its breakpoint hides the desktop layout entirely.
5. Confirm the claim you are about to make. Measure the geometry
   (`position`, `top`, `height`, aligned edges) rather than eyeballing a
   screenshot, and say plainly what you could not verify — keyboard behaviour
   only exists on a real device.
6. Never trigger a destructive action to "test" it against real data.
