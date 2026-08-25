/** How long a listing wears the "Newly listed" badge.
 *
 *  The badge used to be pinned to `status === "published"` alone, so every
 *  live listing carried it forever and it stopped meaning anything. */
export const NEWLY_LISTED_DAYS = 7;

const WINDOW_MS = NEWLY_LISTED_DAYS * 24 * 60 * 60 * 1000;

/** True while `createdAt` is inside the window. An unparseable or future date
 *  returns false rather than granting a badge that would never expire. */
export function isNewlyListed(createdAt: string | Date | null | undefined, now: Date = new Date()) {
  if (!createdAt) return false;
  const created = createdAt instanceof Date ? createdAt : new Date(createdAt);
  const age = now.getTime() - created.getTime();
  if (!Number.isFinite(age) || age < 0) return false;
  return age < WINDOW_MS;
}

/** The badge a feed row should carry, or undefined for none. */
export function newlyListedBadge(status: string, createdAt: string | Date | null | undefined, now?: Date) {
  return status === "published" && isNewlyListed(createdAt, now) ? ("Newly Listed" as const) : undefined;
}
