/**
 * Brings a list back to its own top, below the header rather than behind it.
 *
 * `scrollIntoView` aligns an element with the top of the viewport, and the
 * header is stuck over that — 61px of it on a desktop and 120px on a phone,
 * where it carries the search field as well. Choosing a category therefore
 * scrolled the page down by exactly the height of the header and hid the
 * heading and the first rows underneath it, which reads as the page having
 * been scrolled rather than reset.
 *
 * Measuring the header instead of assuming a number keeps this right at every
 * width, including the tablet row that is its own height again.
 */
export function scrollToListTop(element: HTMLElement | null) {
  if (!element || typeof window === "undefined") return;

  const header = document.querySelector(".site-header");
  const headerHeight = header?.getBoundingClientRect().height ?? 0;
  const top = element.getBoundingClientRect().top + window.scrollY - headerHeight;
  // Never past the start of the document: a short list sits there already.
  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}
