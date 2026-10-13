"use client";

import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/components/LanguageProvider";
import { calendarProvider, googleCalendarUrl, isValidCalendarRange } from "@/lib/community/calendar-event";

export type CommunityEventScheduleProps = {
  id: string;
  title: string;
  location: string;
  /** The formatted range shown to the reader. */
  eventDate?: string | null;
  /** The raw bounds the calendar export needs; absent on a post with no event. */
  eventStartAt?: string | null;
  eventEndAt?: string | null;
};

/**
 * The event strip an Events post carries: its dates and the export. Shared so
 * the blog card and the post detail show one thing, rather than the detail
 * carrying the panel while a card showed the date as a bare meta chip.
 */
export function CommunityEventSchedule({ id, title, location, eventDate, eventStartAt, eventEndAt }: CommunityEventScheduleProps) {
  const { t, locale } = useLanguage();
  if (!eventDate) return null;

  const canAddToCalendar = isValidCalendarRange(eventStartAt, eventEndAt);
  const addToCalendar = () => {
    if (!canAddToCalendar || !eventStartAt || !eventEndAt) return;
    const event = { id, title, location, start: new Date(eventStartAt).toISOString(), end: new Date(eventEndAt).toISOString() };
    // Apple's calendar takes an .ics download; everything else opens Google.
    if (calendarProvider(navigator.userAgent, navigator.maxTouchPoints) === "apple") {
      window.location.assign(`/api/community/calendar?${new URLSearchParams(event)}`);
    } else {
      window.open(googleCalendarUrl(event), "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="ui-panel community-detail-event-schedule">
      <i className="ms ms-calendar-today" aria-hidden="true" />
      <div><span>{t("communityCategoryEvents")}</span><strong>{eventDate}</strong></div>
      {canAddToCalendar ? <Button size="sm" onClick={addToCalendar}><i className="ms ms-add" aria-hidden="true" />{locale === "ko" ? "캘린더에 추가" : "Add to calendar"}</Button> : null}
    </div>
  );
}
