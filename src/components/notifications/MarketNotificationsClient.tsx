"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useEffect } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { AccountPageIntro, DashboardAdBanner } from "@/components/dashboard/AccountPagePatterns";
import { Button } from "@/components/ui/Button";

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
  message: "ms-sms",
  offer: "ms-handshake",
  trade: "ms-check-circle",
  keyword: "ms-notifications",
  wishlist: "ms-favorite",
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

function relativeTime(value: string, ko = false) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return ko ? "방금" : "Just now";
  if (seconds < 3600) return ko ? `${Math.floor(seconds / 60)}분 전` : `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return ko ? `${Math.floor(seconds / 3600)}시간 전` : `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return ko ? `${Math.floor(seconds / 86400)}일 전` : `${Math.floor(seconds / 86400)}d`;
  return new Intl.DateTimeFormat(ko ? "ko-KR" : "en-NZ", { day: "numeric", month: "short" }).format(new Date(value));
}

export function MarketNotificationsClient({
  initialNotifications,
  userId,
}: {
  initialNotifications: MarketNotification[];
  userId: string;
}) {
  const { t, locale } = useLanguage();
  const legacy = usePathname().endsWith("/notifications-v0");
  const ko = locale === "ko";
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
    <div className={`dashboard-content notifications-content${legacy ? "" : " account-modern account-notifications"}`}>
      {legacy ? null : <AccountPageIntro icon="ms-notifications" title={t("notifications")} description={ko ? "놓치지 말아야 할 동네 소식을 한곳에서 확인하세요." : "The local updates that matter, all in one place."} detail={ko ? `최근 알림 중 읽지 않은 항목 ${unreadCount}개` : `${unreadCount} unread among recent updates`} />}
      {!legacy ? <div className="ui-panel account-priority"><div><i className="ms ms-drafts" aria-hidden="true" /><strong>{ko ? "먼저 확인할 알림" : "Check first"}</strong><span>{ko ? `${unreadCount}개 남았어요` : `${unreadCount} to review`}</span></div><p>{ko ? "새 메시지와 거래 제안을 확인하고 동네 활동을 이어가세요." : "Catch up on messages and offers, then keep things moving."}</p><Link href="/market/dashboard/messages">{ko ? "메시지 보기" : "Open messages"}<i className="ms ms-arrow-forward" aria-hidden="true" /></Link></div> : null}
      <header className="notifications-heading">
        {legacy ? <h1>{t("notifications")}</h1> : <div><h2>{ko ? "최근 알림" : "Recent updates"}</h2><span>{ko ? `최근 항목 ${notifications.length}개` : `${notifications.length} recent items`}</span></div>}
        <div className="notifications-heading-actions">
          <button className="bulk-action-button" type="button" disabled={!unreadCount || isMarkingAll} onClick={() => void markAllRead()}>
            <i className="ms ms-drafts" aria-hidden="true" />
            {t("markAllRead")}
          </button>
          {isConfirmingDeleteAll ? (
            <>
              <button className="bulk-action-button is-danger" type="button" disabled={isDeletingAll} onClick={() => void deleteAll()}>
                <i className="ms ms-warning" aria-hidden="true" />
                {t("deleteAllConfirm")}
              </button>
              <button className="bulk-action-button" type="button" disabled={isDeletingAll} onClick={() => setIsConfirmingDeleteAll(false)}>
                <i className="ms ms-close" aria-hidden="true" />
                {t("cancel")}
              </button>
            </>
          ) : (
            <button className="bulk-action-button is-danger" type="button" disabled={!notifications.length} onClick={() => setIsConfirmingDeleteAll(true)}>
              <i className="ms ms-delete" aria-hidden="true" />
              {t("deleteAll")}
            </button>
          )}
        </div>
      </header>

      <div className="notifications-filter-row" role="tablist" aria-label="Notification filters">
        {filters.map((item) => (
          <button className={filter === item.value ? "is-active" : ""} type="button" role="tab" aria-selected={filter === item.value} key={item.value} onClick={() => setFilter(item.value)}>
            {!legacy && ko ? { all: "전체", unread: "읽지 않음", message: "메시지", offer: "제안·거래", alerts: "관심 알림" }[item.value] : item.label}
            {item.value === "unread" && unreadCount ? <b>{unreadCount}</b> : null}
          </button>
        ))}
      </div>

      <section className="notifications-list" aria-live="polite">
        {visibleNotifications.length ? visibleNotifications.map((notification) => (
          <Link className={`notification-row ${notification.readAt ? "" : "is-unread"}`} href={notification.href} key={notification.id} onClick={() => void markRead(notification.id)}>
            <span className={`notification-icon is-${notification.type}`}><i className={`ms ${iconByType[notification.type]}`} aria-hidden="true" /></span>
            <span className="notification-copy">
              <span>
                <strong>{notification.type === "message" && notification.actorName ? notification.actorName : notification.title}</strong>
                <time suppressHydrationWarning>{relativeTime(notification.createdAt, !legacy && ko)}</time>
              </span>
              {notification.type === "message" && notification.listingTitle ? (
                <small className="notification-listing-title">
                  <i className="ms ms-sell" aria-hidden="true" />
                  {notification.listingTitle}
                </small>
              ) : null}
              {notification.body ? <small>{notification.body}</small> : null}
            </span>
            {!notification.readAt ? <i className="notification-unread-dot" aria-label="Unread" /> : null}
            <i className="ms ms-chevron-right notification-chevron" aria-hidden="true" />
          </Link>
        )) : (
          <div className="notifications-empty" role="status">
            <i className="ms ms-notifications" aria-hidden="true" />
            <strong>{!legacy && ko ? filter === "unread" ? "읽지 않은 알림이 없어요" : notifications.length ? "이 필터에 알림이 없어요" : "아직 알림이 없어요" : filter === "unread" ? "You are all caught up" : !legacy && notifications.length && filter !== "all" ? "Nothing in this filter" : "No notifications here yet"}</strong>
            <span>{!legacy && ko ? notifications.length ? "전체 알림에서 다른 소식도 확인해 보세요." : "새로운 마켓 소식이 생기면 여기에 표시됩니다." : "New marketplace activity will appear here."}</span>
            {!legacy && notifications.length > 0 && filter !== "all" ? <Button variant="ghost" size="sm" onClick={() => setFilter("all")}>{ko ? "전체 알림 보기" : "View all updates"}</Button> : null}
          </div>
        )}
      </section>
      {!legacy ? <DashboardAdBanner kind="notifications" /> : null}
    </div>
  );
}
