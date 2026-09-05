const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

export function formatGroupBuyCardDate(value: string, locale: string, includeYear = true) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale === "ko" ? "ko-NZ" : "en-NZ", {
    month: "short",
    day: "numeric",
    ...(includeYear ? { year: "numeric" as const } : {}),
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Pacific/Auckland",
  }).format(date);
}

export function getGroupBuyClosingDays(value: string | undefined, now = Date.now()) {
  if (!value) return null;
  const closesAt = new Date(value).getTime();
  if (Number.isNaN(closesAt) || closesAt <= now) return null;
  return Math.max(1, Math.ceil((closesAt - now) / DAY_IN_MILLISECONDS));
}
