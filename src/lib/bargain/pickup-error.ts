import type { TranslationKey } from "@/components/LanguageProvider";

// Pickup failures are raised by the database in English, so both the buyer and
// seller surfaces resolve them to localised copy by status rather than showing
// the raw server text.
export function pickupErrorKey(status: number): TranslationKey {
  if (status === 401) return "bargainPickupLoginRequired";
  if (status === 400) return "bargainPickupInvalidTime";
  if (status === 403) return "bargainPickupNotAllowed";
  if (status === 404) return "bargainPickupMissing";
  if (status === 409) return "bargainPickupConflict";
  return "bargainPickupFailed";
}
