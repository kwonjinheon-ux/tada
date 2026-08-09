export function formatBargainEventDateRange(start: string | null, end: string | null) {
  if (!start) return null;

  const format = (value: string) => new Intl.DateTimeFormat("en-NZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Pacific/Auckland",
  }).format(new Date(`${value}T12:00:00Z`));

  return end && end !== start ? `${format(start)} – ${format(end)}` : format(start);
}
