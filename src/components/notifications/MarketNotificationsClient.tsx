"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useEffect } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { Button } from "@/components/ui/Button";
import { NotificationSettingsDialog, type NotificationPreferenceKey, type NotificationPreferences } from "@/components/notifications/NotificationSettingsDialog";

export type MarketNotification = {
  id: string;
  type: "message" | "offer" | "trade" | "keyword" | "wishlist" | "community" | "service_review";
  title: string;
  body: string;
  actorName: string | null;
  listingTitle: string | null;
  metadata: Record<string, unknown>;
  href: string;
  conversationId: string | null;
  listingId: string | null;
  communityPostId: string | null;
  serviceListingId: string | null;
  readAt: string | null;
  createdAt: string;
};

type Filter = "all" | "unread" | "message" | "offer" | "trade" | "wishlist" | "alerts" | "community" | "keyword";
const EARLIER_PAGE_SIZE = 10;

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
  community: "ms-chat",
  service_review: "ms-star",
} as const;

type DisplayNotification = MarketNotification & { groupIds: string[]; groupCount: number; groupUnreadCount: number };

function groupKey(item: MarketNotification) {
  if (item.type === "message" && item.conversationId) return `message:${item.conversationId}`;
  if (item.type === "wishlist" && item.listingId) return `wishlist:${item.listingId}`;
  if (item.type === "community" && item.communityPostId) return `community:${item.communityPostId}:${String(item.metadata.event ?? "comment")}`;
  return item.id;
}

function groupNotifications(items: MarketNotification[]): DisplayNotification[] {
  const groups = new Map<string, DisplayNotification>();
  for (const item of items) {
    const key = groupKey(item);
    const current = groups.get(key);
    if (current) {
      current.groupIds.push(item.id);
      current.groupCount += 1;
      if (!item.readAt) current.groupUnreadCount += 1;
    } else {
      groups.set(key, { ...item, groupIds: [item.id], groupCount: 1, groupUnreadCount: item.readAt ? 0 : 1 });
    }
  }
  return [...groups.values()];
}

function displayTitle(item: DisplayNotification, ko: boolean) {
  const unread = item.groupUnreadCount || item.groupCount;
  if (item.type === "message") {
    const actor = item.actorName ?? (ko ? "이웃" : "A neighbour");
    if (item.groupCount > 1) return ko ? `${actor}님의 ${item.groupUnreadCount ? "새 " : ""}메시지 ${unread}개` : `${unread} ${item.groupUnreadCount ? "new " : ""}messages from ${actor}`;
    return ko ? `${actor}님이 새 메시지를 보냈어요.` : `${actor} sent a new message.`;
  }
  if (item.type === "community") {
    const isReply = item.metadata.event === "comment_reply";
    if (item.groupCount > 1) return ko ? `내 ${isReply ? "댓글에 답글" : `글에 ${item.groupUnreadCount ? "새 " : ""}댓글`} ${unread}개` : `${unread} ${item.groupUnreadCount ? "new " : ""}${isReply ? "replies" : "comments"} on your ${isReply ? "comment" : "post"}`;
    return ko ? isReply ? "내 댓글에 답글이 달렸어요." : "내 커뮤니티 글에 새 댓글이 달렸어요." : item.title;
  }
  if (item.type === "service_review") {
    const service = typeof item.metadata.serviceName === "string" ? item.metadata.serviceName : (ko ? "내 서비스" : "Your service");
    return ko ? `${service}에 새 후기가 달렸어요.` : `New review for ${service}`;
  }
  if (ko && item.type === "keyword") return "관심 키워드와 일치하는 새 상품이 올라왔어요.";
  if (ko && item.type === "offer" && item.title === "New offer received") return "새 가격 제안이 도착했어요.";
  if (ko && item.type === "trade" && item.title === "Trade complete") return "거래가 완료됐어요.";
  if (ko && item.type === "trade" && item.title === "Offer accepted") return "가격 제안이 수락됐어요.";
  if (ko && item.type === "trade" && item.title === "Offer declined") return "가격 제안이 거절됐어요.";
  if (ko && item.type === "trade" && item.title === "Offer cancelled") return "가격 제안이 취소됐어요.";
  if (ko && item.type === "wishlist") return item.title === "Saved item price updated" ? "찜한 상품의 가격이 변경됐어요." : "찜한 상품의 상태가 변경됐어요.";
  return item.title;
}

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
    metadata,
    href: typeof row.href === "string" ? row.href : "/market",
    conversationId: typeof row.conversation_id === "string" ? row.conversation_id : null,
    listingId: typeof row.listing_id === "string" ? row.listing_id : null,
    communityPostId: typeof row.community_post_id === "string" ? row.community_post_id : null,
    serviceListingId: typeof row.service_listing_id === "string" ? row.service_listing_id : null,
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

function localDay(value: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Pacific/Auckland", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}

function NotificationsServicePromo({ ko, inline = false }: { ko: boolean; inline?: boolean }) {
  return <section className={`ui-panel notifications-service-promo${inline ? " notifications-inline-promo" : ""}`} aria-label={ko ? "광고" : "Advertisement"}>
    <span className="notifications-ad-label">{ko ? "광고" : "Ad"}</span>
    <div><h2>{ko ? <>우리 동네<br />좋은 서비스</> : <>Great services<br />near you</>}</h2><p>{ko ? "이웃의 도움이 필요할 때, 타다 서비스에서 찾아보세요." : "Find a helping hand from your local community."}</p><Link className="ui-button ui-button--primary ui-button--sm" href="/services">{ko ? "서비스 둘러보기" : "Explore services"}<i className="ms ms-arrow-forward" aria-hidden="true" /></Link></div>
  </section>;
}

function NotificationsAside({ ko }: { ko: boolean }) {
  return <aside className="notifications-aside" aria-label={ko ? "타다 안내" : "Explore Tada"}>
    <NotificationsServicePromo ko={ko} />
    <section className="ui-panel notifications-rail-card is-charge"><span className="notifications-rail-icon"><i className="ms ms-bolt" aria-hidden="true" /></span><div><h2>{ko ? "타다와 함께하면 더 안심한 거래" : "Trade with more confidence"}</h2><p>{ko ? "이웃의 평가와 후기를 확인하고 안심하고 거래하세요." : "See how neighbourly feedback works on Tada."}</p><Link href="/market/dashboard/tada-charge">{ko ? "타다 충전이란?" : "About Tada Charge"}<i className="ms ms-arrow-forward" aria-hidden="true" /></Link></div></section>
    <section className="ui-panel notifications-rail-card"><span className="notifications-rail-icon"><i className="ms ms-help" aria-hidden="true" /></span><div><h2>{ko ? "도움이 필요하신가요?" : "Need a hand?"}</h2><p>{ko ? "타다 이용 중 궁금한 점이 있으면 도움말에서 확인해보세요." : "Find answers to your questions about Tada."}</p><Link className="ui-button ui-button--secondary ui-button--sm" href="/help">{ko ? "도움말 보기" : "Help centre"}<i className="ms ms-arrow-forward" aria-hidden="true" /></Link></div></section>
  </aside>;
}

export function MarketNotificationsClient({
  initialNotifications,
  initialPreferences,
  settingsAvailable,
  userId,
}: {
  initialNotifications: MarketNotification[];
  initialPreferences: NotificationPreferences;
  settingsAvailable: boolean;
  userId: string;
}) {
  const { t, locale } = useLanguage();
  const legacy = usePathname().endsWith("/notifications-v0");
  const ko = locale === "ko";
  const [notifications, setNotifications] = useState(initialNotifications);
  const [preferences, setPreferences] = useState(initialPreferences);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savingPreference, setSavingPreference] = useState<NotificationPreferenceKey | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [visibleEarlierCount, setVisibleEarlierCount] = useState(EARLIER_PAGE_SIZE);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [isConfirmingDeleteAll, setIsConfirmingDeleteAll] = useState(false);
  const unreadCount = notifications.filter((notification) => !notification.readAt).length;

  const updatePreference = async (key: NotificationPreferenceKey, enabled: boolean) => {
    if (!settingsAvailable || savingPreference) return;
    const previous = preferences[key];
    setPreferences((current) => ({ ...current, [key]: enabled }));
    setSavingPreference(key);
    setSettingsError(null);
    try {
      const response = await fetch("/api/market/notifications/preferences", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, enabled }),
      });
      if (!response.ok) throw new Error("Save failed");
    } catch {
      setPreferences((current) => ({ ...current, [key]: previous }));
      setSettingsError(ko ? "설정을 저장하지 못했어요. 다시 시도해 주세요." : "Could not save this setting. Please try again.");
    } finally {
      setSavingPreference(null);
    }
  };

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
    if (filter === "trade") return notification.type === "offer" || notification.type === "trade";
    if (filter === "wishlist") return notification.type === "wishlist";
    if (filter === "alerts") return notification.type === "keyword" || (legacy && notification.type === "wishlist");
    if (filter === "keyword") return notification.type === "keyword";
    if (filter === "community") return notification.type === "community" || notification.type === "service_review";
    return true;
  }), [filter, legacy, notifications]);

  const markRead = async (ids: string[]) => {
    const readAt = new Date().toISOString();
    const idSet = new Set(ids);
    const snapshot = notifications;
    setNotifications((current) => current.map((notification) => idSet.has(notification.id) && !notification.readAt ? { ...notification, readAt } : notification));
    try {
      const response = await fetch("/api/market/notifications/read-items", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }), keepalive: true });
      if (!response.ok) throw new Error("Read failed");
    } catch {
      setNotifications((current) => current.map((item) => idSet.has(item.id) ? snapshot.find((saved) => saved.id === item.id) ?? item : item));
      setActionError(ko ? "읽음 처리에 실패했어요." : "Could not mark this notification as read.");
    }
  };

  const markAllRead = async () => {
    if (!unreadCount || isMarkingAll) return;
    setIsMarkingAll(true);
    const snapshot = notifications;
    const readAt = new Date().toISOString();
    setNotifications((current) => current.map((notification) => notification.readAt ? notification : { ...notification, readAt }));
    const response = await fetch("/api/market/notifications/read-all", { method: "PATCH" }).catch(() => null);
    if (!response?.ok) {
      const before = new Map(snapshot.map((item) => [item.id, item]));
      setNotifications((current) => current.map((item) => before.get(item.id) ?? item));
      setActionError(ko ? "모두 읽음 처리에 실패했어요." : "Could not mark all notifications as read.");
    }
    setIsMarkingAll(false);
  };

  // Clearing is permanent, so it takes a second tap to confirm and the list comes back if the call fails.
  const deleteAll = async () => {
    if (!notifications.length || isDeletingAll) return;
    setIsDeletingAll(true);
    const snapshot = notifications;
    setNotifications([]);
    const response = await fetch("/api/market/notifications/delete-all", { method: "DELETE" }).catch(() => null);
    if (!response?.ok) {
      setNotifications((current) => [...snapshot, ...current.filter((item) => !snapshot.some((saved) => saved.id === item.id))]);
      setActionError(ko ? "알림을 삭제하지 못했어요." : "Could not delete notifications.");
    }
    setIsDeletingAll(false);
    setIsConfirmingDeleteAll(false);
  };

  if (!legacy) {
    const modernFilters: Array<{ value: Filter; en: string; ko: string; count: number }> = [
      { value: "all", en: "All", ko: "전체", count: notifications.length },
      { value: "unread", en: "Unread", ko: "안 읽음", count: unreadCount },
      { value: "message", en: "Messages", ko: "메시지", count: notifications.filter((item) => item.type === "message").length },
      { value: "trade", en: "Trades", ko: "거래", count: notifications.filter((item) => item.type === "offer" || item.type === "trade").length },
      { value: "wishlist", en: "Saved", ko: "찜", count: notifications.filter((item) => item.type === "wishlist").length },
      { value: "community", en: "Comments & reviews", ko: "댓글·후기", count: notifications.filter((item) => item.type === "community" || item.type === "service_review").length },
      { value: "keyword", en: "Keywords", ko: "키워드", count: notifications.filter((item) => item.type === "keyword").length },
    ];
    const displayNotifications = groupNotifications(visibleNotifications);
    const today = localDay(new Date().toISOString());
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const earlierItems = displayNotifications.filter((item) => new Date(item.createdAt).getTime() < weekAgo);
    const groups = [
      { key: "today", title: ko ? "오늘" : "Today", items: displayNotifications.filter((item) => localDay(item.createdAt) === today) },
      { key: "week", title: ko ? "이번 주" : "This week", items: displayNotifications.filter((item) => localDay(item.createdAt) !== today && new Date(item.createdAt).getTime() >= weekAgo) },
      { key: "earlier", title: ko ? "이전 알림" : "Earlier", items: earlierItems.slice(0, visibleEarlierCount) },
    ];
    return <div className="dashboard-content notifications-content account-modern account-notifications notifications-redesign">
      <header className="notifications-redesign-intro">
        <div><h1>{t("notifications")}</h1><p>{ko ? "새로운 소식과 중요한 알림을 확인하세요." : "Catch up on the latest news and important updates."}</p></div>
        <div className="notifications-heading-actions">
          <Button variant="secondary" size="sm" disabled={!unreadCount || isMarkingAll} onClick={() => void markAllRead()}><i className="ms ms-done-all" aria-hidden="true" />{t("markAllRead")}</Button>
          <details className="notifications-more"><summary aria-label={ko ? "알림 더 보기" : "More notification actions"}><i className="ms ms-more-vert" aria-hidden="true" /></summary><div className="ui-panel notifications-more-menu">{isConfirmingDeleteAll ? <><p>{ko ? "모든 알림을 삭제할까요?" : "Delete all notifications?"}</p><Button variant="danger" size="sm" disabled={isDeletingAll} onClick={() => void deleteAll()}>{t("deleteAllConfirm")}</Button><Button variant="ghost" size="sm" onClick={() => setIsConfirmingDeleteAll(false)}>{t("cancel")}</Button></> : <Button variant="ghost" size="sm" disabled={!notifications.length} onClick={() => setIsConfirmingDeleteAll(true)}><i className="ms ms-delete" aria-hidden="true" />{t("deleteAll")}</Button>}</div></details>
          <Button variant="secondary" size="sm" onClick={() => { setSettingsError(null); setSettingsOpen(true); }}><i className="ms ms-settings" aria-hidden="true" />{ko ? "알림 설정" : "Settings"}</Button>
        </div>
      </header>
      {actionError ? <p className="notifications-action-error" role="alert">{actionError}<Button variant="ghost" size="sm" onClick={() => setActionError(null)}>{ko ? "닫기" : "Dismiss"}</Button></p> : null}
      <div className="notifications-redesign-layout">
        <div className="notifications-main-column">
          <div className="notifications-toolbar">
            <div className="notifications-filter-row" role="tablist" aria-label={ko ? "알림 필터" : "Notification filters"}>
              {modernFilters.map((item) => <button className={filter === item.value ? "is-active" : ""} type="button" role="tab" aria-selected={filter === item.value} key={item.value} onClick={() => { setFilter(item.value); setVisibleEarlierCount(EARLIER_PAGE_SIZE); }}>{ko ? item.ko : item.en}<b>{item.count}</b></button>)}
            </div>
          </div>
          <div className="notifications-groups" aria-live="polite">
            {displayNotifications.length ? groups.filter((group) => group.items.length).map((group) => <Fragment key={group.key}>
              {group.key === "earlier" ? <NotificationsServicePromo ko={ko} inline /> : null}
              <section className="notifications-group">
                <h2>{group.title}</h2>
                <div className="notifications-group-list">{group.items.map((notification) => <Link className={`notification-row ${notification.groupUnreadCount ? "is-unread" : ""}`} href={notification.href} key={notification.id} onClick={() => void markRead(notification.groupIds)}><span className={`notification-icon is-${notification.type}`}><i className={`ms ${iconByType[notification.type]}`} aria-hidden="true" /></span><span className="notification-copy"><strong>{displayTitle(notification, ko)}</strong>{notification.type === "message" && notification.listingTitle ? <small>{notification.listingTitle}</small> : null}{notification.type === "community" && typeof notification.metadata.postTitle === "string" ? <small>{notification.metadata.postTitle}</small> : null}{notification.body ? <small>{notification.body}</small> : null}</span><time suppressHydrationWarning>{relativeTime(notification.createdAt, ko)}</time>{notification.groupUnreadCount ? <i className="notification-unread-dot" aria-label={ko ? "읽지 않음" : "Unread"} /> : null}<i className="ms ms-chevron-right notification-chevron" aria-hidden="true" /></Link>)}</div>
                {group.key === "earlier" && earlierItems.length > visibleEarlierCount ? <div className="notifications-load-more"><Button variant="secondary" size="sm" onClick={() => setVisibleEarlierCount((count) => count + EARLIER_PAGE_SIZE)}>{ko ? `더 보기 · ${earlierItems.length - visibleEarlierCount}개 남음` : `Show more · ${earlierItems.length - visibleEarlierCount} left`}<i className="ms ms-expand-more" aria-hidden="true" /></Button></div> : null}
              </section>
            </Fragment>) : <div className="notifications-empty ui-panel" role="status"><i className="ms ms-notifications" aria-hidden="true" /><strong>{ko ? filter === "unread" ? "읽지 않은 알림이 없어요" : notifications.length ? "이 필터에 알림이 없어요" : "아직 알림이 없어요" : filter === "unread" ? "You are all caught up" : notifications.length ? "Nothing in this filter" : "No notifications yet"}</strong><span>{ko ? "새로운 소식은 이곳에서 확인할 수 있어요." : "New updates will appear here."}</span>{notifications.length && filter !== "all" ? <Button variant="ghost" size="sm" onClick={() => setFilter("all")}>{ko ? "전체 알림 보기" : "View all"}</Button> : null}</div>}
          </div>
        </div>
        <NotificationsAside ko={ko} />
      </div>
      {settingsOpen ? <NotificationSettingsDialog ko={ko} preferences={preferences} available={settingsAvailable} savingKey={savingPreference} error={settingsError} onToggle={(key, enabled) => void updatePreference(key, enabled)} onClose={() => setSettingsOpen(false)} /> : null}
    </div>;
  }

  return (
    <div className="dashboard-content notifications-content">
      <header className="notifications-heading">
        <h1>{t("notifications")}</h1>
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
            {item.label}
            {item.value === "unread" && unreadCount ? <b>{unreadCount}</b> : null}
          </button>
        ))}
      </div>

      <section className="notifications-list" aria-live="polite">
        {visibleNotifications.length ? visibleNotifications.map((notification) => (
          <Link className={`notification-row ${notification.readAt ? "" : "is-unread"}`} href={notification.href} key={notification.id} onClick={() => void markRead([notification.id])}>
            <span className={`notification-icon is-${notification.type}`}><i className={`ms ${iconByType[notification.type]}`} aria-hidden="true" /></span>
            <span className="notification-copy">
              <span>
                <strong>{notification.type === "message" && notification.actorName ? notification.actorName : notification.title}</strong>
                <time suppressHydrationWarning>{relativeTime(notification.createdAt)}</time>
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
            <strong>{filter === "unread" ? "You are all caught up" : "No notifications here yet"}</strong>
            <span>New marketplace activity will appear here.</span>
          </div>
        )}
      </section>
    </div>
  );
}
