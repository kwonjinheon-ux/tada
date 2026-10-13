export type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  location: string;
};

export function isValidCalendarRange(start?: string | null, end?: string | null) {
  return Boolean(start && end && Number.isFinite(Date.parse(start)) && Date.parse(end) > Date.parse(start));
}

export function calendarProvider(userAgent: string, maxTouchPoints = 0) {
  return /iPhone|iPad|iPod|Macintosh|Mac OS X/i.test(userAgent) ||
    (/Mac/i.test(userAgent) && maxTouchPoints > 1) ? "apple" : "google";
}

const calendarDate = (value: string) => new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
const eventUrl = (id: string) => `https://tada.co.nz/community/${encodeURIComponent(id)}`;

export function googleCalendarUrl(event: CalendarEvent) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${calendarDate(event.start)}/${calendarDate(event.end)}`,
    ctz: "Pacific/Auckland",
    location: event.location,
    details: eventUrl(event.id),
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

const escapeText = (value: string) => value.replace(/\\/g, "\\\\").replace(/\r\n|\r|\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");

// RFC 5545 limits content lines to 75 UTF-8 octets, not 75 characters.
function foldLine(line: string) {
  const encoder = new TextEncoder();
  let result = "";
  let bytes = 0;
  for (const character of line) {
    const length = encoder.encode(character).length;
    if (bytes + length > 75) { result += "\r\n "; bytes = 1; }
    result += character;
    bytes += length;
  }
  return result;
}

export function calendarFile(event: CalendarEvent, now = new Date()) {
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Tada//Community Events//EN",
    "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "BEGIN:VEVENT",
    `UID:${escapeText(event.id)}@tada.co.nz`,
    `DTSTAMP:${calendarDate(now.toISOString())}`,
    `DTSTART:${calendarDate(event.start)}`, `DTEND:${calendarDate(event.end)}`,
    `SUMMARY:${escapeText(event.title)}`, `LOCATION:${escapeText(event.location)}`,
    `DESCRIPTION:${escapeText(eventUrl(event.id))}`, `URL:${eventUrl(event.id)}`,
    "END:VEVENT", "END:VCALENDAR",
  ].map(foldLine).join("\r\n") + "\r\n";
}
