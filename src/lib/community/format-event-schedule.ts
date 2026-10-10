const eventDateFormatter = new Intl.DateTimeFormat("en-NZ", {
  day: "numeric",
  month: "short",
  timeZone: "Pacific/Auckland",
});

const eventTimeFormatter = new Intl.DateTimeFormat("en-NZ", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Pacific/Auckland",
});

export function formatCommunityEventSchedule(start: string | null, end: string | null) {
  if (!start || !end) return undefined;

  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return undefined;

  const startDay = eventDateFormatter.format(startDate);
  const endDay = eventDateFormatter.format(endDate);
  const startTime = eventTimeFormatter.format(startDate);
  const endTime = eventTimeFormatter.format(endDate);

  return startDay === endDay
    ? `${startDay} · ${startTime}–${endTime}`
    : `${startDay} · ${startTime} – ${endDay} · ${endTime}`;
}
