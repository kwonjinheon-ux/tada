"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useEffect } from "react";
import { useLanguage } from "@/components/LanguageProvider";

export type MarketNotification = {
  id: string;
  type: "message" | "offer" | "trade" | "keyword" | "wishlist";
  title: string;
  body: string;
  actorName: string | null;
  listingTitle: string | null;
  href: string;
  readAt: string | null;
  createdAt: string;
};

type Filter = "all" | "unread" | "message" | "offer" | "alerts";

const filters: Array<{ value: Filter; label: string }> = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "message", label: "Messages" },
  { value: "offer", label: "Offers & trades" },
  { value: "alerts", label: "Saved alerts" },
];

const iconByType = {
  message: "fa-comment-dots",
  offer: "fa-handshake",
  trade: "fa-circle-check",
  keyword: "fa-bell",
  wishlist: "fa-heart",
} as const;

function mapRealtimeNotification(row: Record<string, unknown>): MarketNotification | null {
  if (typeof row.id !== "string" || typeof row.type !== "string" || typeof row.title !== "string") return null;
  const metadata = row.metadata && typeof row.metadata === "object"
    ? row.metadata as Record<string, unknown>
    : {};
  return {
    id: row.id,
    type: row.type as MarketNotification["type"],
    title: row.title,
    body: typeof row.body === "string" ? row.body : "",
    actorName: typeof metadata.actorName === "string" ? metadata.actorName : null,
    listingTitle: typeof metadata.listingTitle === "string" ? metadata.listingTitle : null,
    href: typeof row.href === "string" ? row.href : "/market",
    readAt: typeof row.read_at === "string" ? row.read_at : null,
    createdAt: typeof row.created_at === "string" ? row.created_at : new Date().toISOString(),
  };
}

function relativeTime(value: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return new Intl.DateTimeFormat("en-NZ", { day: "numeric", month: "short" }).format(new Date(value));
}

export function MarketNotificationsClient({
  initialNotifications,
  userId,
}: {
  initialNotifications: MarketNotification[];
  userId: string;
}) {
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [filter, setFilter] = useState<Filter>("all");
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [isConfirmingDeleteAll, setIsConfirmingDeleteAll] = useState(false);
  const unreadCount = notifications.filter((notification) => !notification.readAt).length;

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    const channel = supabase
      .channel(`market-notifications-page:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "market_notifications", filter: `user_id=eq.${userId}` }, (payload) => {
        const notification = mapRealtimeNotification(payload.new as Record<string, unknown>);
        if (!notification) return;
        setNotifications((current) => current.some((item) => item.id === notification.id) ? current : [notification, ...current]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "market_notifications", filter: `user_id=eq.${userId}` }, (payload) => {
        const notification = mapRealtimeNotification(payload.new as Record<string, unknown>);
        if (!notification) return;
        setNotifications((current) => current.map((item) => item.id === notification.id ? notification : item));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "market_notifications" }, (payload) => {
        const id = (payload.old as { id?: string }).id;
        if (id) setNotifications((current) => current.filter((item) => item.id !== id));
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel).catch(() => undefined); };
  }, [userId]);

  const visibleNotifications = useMemo(() => notifications.filter((notification) => {
    if (filter === "unread") return !notification.readAt;
    if (filter === "message") return notification.type === "message";
    if (filter === "offer") return notification.type === "offer" || notification.type === "trade";
    if (filter === "alerts") return notification.type === "keyword" || notification.type === "wishlist";
    return true;
  }), [filter, notifications]);

  const markRead = async (id: string) => {
    const readAt = new Date().toISOString();
    setNotifications((current) => current.map((notification) => notification.id === id && !notification.readAt ? { ...notification, readAt } : notification));
    await fetch(`/api/market/notifications/${id}/read`, { method: "PATCH", keepalive: true }).catch(() => undefined);
  };

  const markAllRead = async () => {
    if (!unreadCount || isMarkingAll) return;
    setIsMarkingAll(true);
    const readAt = new Date().toISOString();
    setNotifications((current) => current.map((notification) => notification.readAt ? notification : { ...notification, readAt }));
    await fetch("/api/market/notifications/read-all", { method: "PATCH" }).catch(() => undefined);
    setIsMarkingAll(false);
  };

  // Clearing is permanent, so it takes a second tap to confirm and the list comes back if the call fails.
  const deleteAll = async () => {
    if (!notifications.length || isDeletingAll) return;
    setIsDeletingAll(true);
    const snapshot = notifications;
    setNotifications([]);
    const response = await fetch("/api/market/notifications/delete-all", { method: "DELETE" }).catch(() => null);
    if (!response?.ok) setNotifications(snapshot);
    setIsDeletingAll(false);
    setIsConfirmingDeleteAll(false);
  };

  return (
    <div className="dashboard-content notifications-content">
      <header className="notifications-heading">
        <h1>{t("notifications")}</h1>
        <div className="notifications-heading-actions">
          <button type="button" disabled={!unreadCount || isMarkingAll} onClick={() => void markAllRead()}>
            <i className="fa-regular fa-envelope-open" aria-hidden="true" />
            {t("markAllRead")}
          </button>
          {isConfirmingDeleteAll ? (
            <>
              <button className="is-danger" type="button" disabled={isDeletingAll} onClick={() => void deleteAll()}>
                <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                {t("deleteAllConfirm")}
              </button>
              <button type="button" disabled={isDeletingAll} onClick={() => setIsConfirmingDeleteAll(false)}>
                <i className="fa-solid fa-xmark" aria-hidden="true" />
                {t("cancel")}
              </button>
            </>
          ) : (
            <button className="is-danger" type="button" disabled={!notifications.length} onClick={() => setIsConfirmingDeleteAll(true)}>
              <i className="fa-regular fa-trash-can" aria-hidden="true" />
              {t("deleteAll")}
            </button>
          )}
        </div>
      </header>

      <div className="notifications-filter-row" role="tablist" aria-label="Notification filters">
        {filters.map((item) => (
          <button className={filter === item.value ? "is-active" : ""} type="button" role="tab" aria-selected={filter === item.value} key={item.value} onClick={() => setFilter(item.value)}>
            {item.label}
            {item.value === "unread" && unreadCount ? <b>{unreadCount}</b> : null}
          </button>
        ))}
      </div>

      <section className="notifications-list" aria-live="polite">
        {visibleNotifications.length ? visibleNotifications.map((notification) => (
          <Link className={`notification-row ${notification.readAt ? "" : "is-unread"}`} href={notification.href} key={notification.id} onClick={() => void markRead(notification.id)}>
            <span className={`notification-icon is-${notification.type}`}><i className={`fa-solid ${iconByType[notification.type]}`} aria-hidden="true" /></span>
            <span className="notification-copy">
              <span>
                <strong>{notification.type === "message" && notification.actorName ? notification.actorName : notification.title}</strong>
                <time suppressHydrationWarning>{relativeTime(notification.createdAt)}</time>
              </span>
              {notification.type === "message" && notification.listingTitle ? (
                <small className="notification-listing-title">
                  <i className="fa-solid fa-tag" aria-hidden="true" />
                  {notification.listingTitle}
                </small>
              ) : null}
              {notification.body ? <small>{notification.body}</small> : null}
            </span>
            {!notification.readAt ? <i className="notification-unread-dot" aria-label="Unread" /> : null}
            <i className="fa-solid fa-chevron-right notification-chevron" aria-hidden="true" />
          </Link>
        )) : (
          <div className="notifications-empty" role="status">
            <i className="fa-regular fa-bell" aria-hidden="true" />
            <strong>{filter === "unread" ? "You are all caught up" : "No notifications here yet"}</strong>
            <span>New marketplace activity will appear here.</span>
          </div>
        )}
      </section>
    </div>
  );
}
