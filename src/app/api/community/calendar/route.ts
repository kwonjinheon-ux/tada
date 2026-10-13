import { z } from "zod";
import { calendarFile, isValidCalendarRange } from "@/lib/community/calendar-event";

const eventSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(120),
  start: z.string().datetime({ offset: true }),
  end: z.string().datetime({ offset: true }),
  location: z.string().max(300),
}).refine((event) => isValidCalendarRange(event.start, event.end));

// This only formats the supplied public event data; it does not write to a calendar.
export function GET(request: Request) {
  const parsed = eventSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return new Response("Invalid event", { status: 400 });
  return new Response(calendarFile(parsed.data), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="tada-event.ics"',
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
