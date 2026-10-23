"use client";

import { FormEvent, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { marketplaceCategories, suggestCategoryFromTitle } from "@/data/marketplace-categories";
import { useLanguage } from "@/components/LanguageProvider";
import { AccountPageIntro, DashboardAdBanner } from "@/components/dashboard/AccountPagePatterns";
import { Button } from "@/components/ui/Button";

export type KeywordAlert = { id: string; keyword: string; categorySlug: string | null };
type KeywordAlertResponse = { id: string; keyword: string; category_slug: string | null };

const keywordRemovalDelayMs = 160;

function getAlertCategory(alert: KeywordAlert) {
  const categorySlug = alert.categorySlug ?? suggestCategoryFromTitle(alert.keyword)?.mainCategory ?? null;
  const category = marketplaceCategories.find(({ value }) => value === categorySlug);
  return {
    slug: categorySlug,
    label: category?.label ?? "General",
    tone: categorySlug ? `keyword-chip-${categorySlug}` : "keyword-chip-general",
  };
}

export function KeywordAlertsClient({ initialAlerts, initialNotificationEnabled = true, notificationSettingsAvailable = false }: { initialAlerts: KeywordAlert[]; initialNotificationEnabled?: boolean; notificationSettingsAvailable?: boolean }) {
  const { t, locale } = useLanguage();
  const legacy = usePathname().endsWith("/keywords-v0");
  const ko = locale === "ko";
  const [alerts, setAlerts] = useState(initialAlerts);
  const [keyword, setKeyword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [leavingId, setLeavingId] = useState<string | null>(null);
  const [notificationEnabled, setNotificationEnabled] = useState(initialNotificationEnabled);
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);
  const [savingNotification, setSavingNotification] = useState(false);
  const [notificationError, setNotificationError] = useState<string | null>(null);

  const updateNotification = async (enabled: boolean) => {
    if (savingNotification || !notificationSettingsAvailable) return;
    setNotificationEnabled(enabled);
    setSavingNotification(true);
    setNotificationError(null);
    try {
      const response = await fetch("/api/market/notifications/preferences", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: "keyword_enabled", enabled }) });
      if (!response.ok) throw new Error("Unable to save notification settings.");
    } catch {
      setNotificationEnabled(!enabled);
      setNotificationError(ko ? "알림 설정을 저장하지 못했어요. 다시 시도해 주세요." : "We couldn't save this setting. Please try again.");
    } finally {
      setSavingNotification(false);
    }
  };

  const addKeyword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/market/keywords", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ keyword }) });
      const payload = await response.json().catch(() => null) as { alert?: KeywordAlertResponse; error?: string } | null;
      if (!response.ok || !payload?.alert) {
        setError(payload?.error ?? "Unable to add this keyword right now.");
        return;
      }
      const savedAlert = payload.alert;
      setAlerts((current) => [{ id: savedAlert.id, keyword: savedAlert.keyword, categorySlug: savedAlert.category_slug }, ...current]);
      setKeyword("");
    } catch {
      setError("Unable to reach keyword alerts right now.");
    } finally {
      setIsSaving(false);
    }
  };

  const removeKeyword = async (id: string) => {
    if (removingId) return;
    const removedAlert = alerts.find((alert) => alert.id === id);
    if (!removedAlert) return;
    const restoreRemovedAlert = () => setAlerts((current) => current.some((alert) => alert.id === id) ? current : [removedAlert, ...current]);
    setError(null);
    setRemovingId(id);
    setLeavingId(id);
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      await new Promise<void>((resolve) => window.setTimeout(resolve, keywordRemovalDelayMs));
    }
    setAlerts((current) => current.filter((alert) => alert.id !== id));
    try {
      const response = await fetch("/api/market/keywords", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      if (!response.ok) {
        restoreRemovedAlert();
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        setError(payload?.error ?? "Unable to remove this keyword right now.");
      }
    } catch {
      restoreRemovedAlert();
      setError("Unable to reach keyword alerts right now.");
    } finally {
      setLeavingId(null);
      setRemovingId(null);
    }
  };

  if (!legacy) return <div className="dashboard-content keywords-content account-modern account-keywords">
    <AccountPageIntro icon="ms-key" title={ko ? "관심 키워드" : "Saved keywords"} description={ko ? "찾는 상품이 올라오면 알려드려요." : "Get notified when something you're looking for is listed."} />
    <div className="keyword-redesign-layout">
      <div className="keyword-main-column">
        <form className="ui-panel keyword-create-panel" onSubmit={addKeyword}>
          <label htmlFor="new-keyword">{ko ? "새 키워드 추가" : "Add a keyword"}</label>
          <div className="keyword-create-controls"><div className="keywords-input-wrap"><i className="ms ms-search" aria-hidden="true" /><input id="new-keyword" value={keyword} onChange={(event) => setKeyword(event.target.value)} type="text" placeholder={ko ? "예: 식탁, 노트북, 자전거" : "e.g. dining table, laptop, bicycle"} minLength={2} maxLength={80} disabled={alerts.length >= 20} /></div><Button type="submit" disabled={keyword.trim().length < 2 || isSaving || alerts.length >= 20}>{isSaving ? t("saving") : ko ? "키워드 저장" : "Save keyword"}</Button></div>
          <p>{ko ? "2~80자 · 최대 20개까지 저장할 수 있어요." : "2–80 characters · Save up to 20 keywords."}</p>
          {alerts.length >= 20 ? <p role="status">{ko ? "저장 한도에 도달했어요. 새 키워드를 추가하려면 하나를 삭제해 주세요." : "Your keyword list is full. Remove one to add another."}</p> : null}
          {error ? <p className="keywords-error" role="alert">{error}</p> : null}
        </form>
        <section className="ui-panel keyword-saved-panel" aria-labelledby="saved-keywords-title">
          <h2 id="saved-keywords-title">{ko ? "저장한 키워드" : "Saved keywords"} <small>{alerts.length}/20</small></h2>
          {alerts.length ? <div className="keyword-saved-list">{alerts.map((alert) => {
            const category = getAlertCategory(alert);
            return <div className={`keyword-saved-row${leavingId === alert.id ? " is-removing" : ""}`} key={alert.id}>
              <i className="ms ms-search keyword-saved-icon" aria-hidden="true" />
              <div className="keyword-saved-info"><strong>{alert.keyword}</strong><span>{category.slug ? category.label : ko ? "전체 카테고리" : "All categories"}</span></div>
              <Link className="ui-button ui-button--secondary ui-button--sm keyword-search-link" href={`/market?q=${encodeURIComponent(alert.keyword)}`} aria-label={ko ? `${alert.keyword} 지금 검색` : `Search ${alert.keyword} now`}><i className="ms ms-search" aria-hidden="true" />{ko ? "검색" : "Search"}</Link>
              <Button variant="ghost" size="sm" className="keyword-remove-button" disabled={removingId === alert.id} onClick={() => void removeKeyword(alert.id)} aria-label={ko ? `${alert.keyword} 삭제` : `Remove ${alert.keyword}`}><i className="ms ms-delete" aria-hidden="true" /><span>{ko ? "삭제" : "Remove"}</span></Button>
            </div>;
          })}</div> : <div className="keywords-empty"><i className="ms ms-search" aria-hidden="true" /><strong>{ko ? "아직 저장한 키워드가 없어요" : "No saved keywords yet"}</strong><span>{ko ? "찾고 싶은 상품을 위에 입력해 보세요." : "Add an item you're looking for above."}</span></div>}
          <p className="keyword-match-note"><i className="ms ms-info" aria-hidden="true" />{ko ? "키워드와 카테고리가 모두 일치할 때 새 상품 알림이 와요." : "You'll be notified when both the keyword and category match."}</p>
        </section>
      </div>
      <aside className="keyword-side-column" aria-label={ko ? "키워드 알림 안내" : "Keyword alert information"}>
        <section className={`ui-panel keyword-status-panel${mobileSettingsOpen ? " is-open" : ""}`}>
          <Button variant="ghost" className="keyword-status-trigger" aria-expanded={mobileSettingsOpen} aria-controls="keyword-status-details" onClick={() => setMobileSettingsOpen((open) => !open)}>
            <span className="keyword-status-icon"><i className="ms ms-notifications" aria-hidden="true" /></span>
            <strong>{ko ? "키워드 알림" : "Keyword alerts"}</strong>
            <span className={`keyword-status-value${!notificationSettingsAvailable ? " is-unavailable" : notificationEnabled ? " is-on" : ""}`}>{!notificationSettingsAvailable ? ko ? "확인 불가" : "Unavailable" : notificationEnabled ? ko ? "켜짐" : "On" : ko ? "꺼짐" : "Off"}</span>
            <i className={`ms ${mobileSettingsOpen ? "ms-expand-less" : "ms-expand-more"}`} aria-hidden="true" />
          </Button>
          <div className="keyword-status-details" id="keyword-status-details">
            <div className="keyword-status-heading"><span className="keyword-status-icon"><i className="ms ms-notifications" aria-hidden="true" /></span><strong><span className="keyword-desktop-label">{ko ? `키워드 알림 ${notificationEnabled ? "켜짐" : "꺼짐"}` : `Keyword alerts ${notificationEnabled ? "on" : "off"}`}</span><span className="keyword-mobile-label">{ko ? "새 상품 알림 받기" : "Notify me of new listings"}</span></strong><label className="keyword-alert-switch"><input className="notification-settings-input" type="checkbox" checked={notificationEnabled} onChange={(event) => void updateNotification(event.target.checked)} disabled={!notificationSettingsAvailable || savingNotification} aria-label={ko ? "키워드 알림" : "Keyword alerts"} /><span className="notification-settings-track" /></label></div>
            <p>{ko ? "저장한 키워드와 카테고리에 맞는 새 상품을 알려드려요." : "Get notified when a new listing matches your keyword and category."}</p>
            {!notificationSettingsAvailable ? <p className="keyword-status-error" role="status">{ko ? "현재 알림 설정을 불러올 수 없어요." : "Notification settings are currently unavailable."}</p> : null}
            {notificationError ? <p className="keyword-status-error" role="alert">{notificationError}</p> : null}
            <Link className="keyword-settings-link" href="/market/dashboard/notifications">{ko ? "전체 알림 설정" : "All notification settings"}<i className="ms ms-arrow-forward" aria-hidden="true" /></Link>
          </div>
        </section>
        <section className="ui-panel keyword-how-panel"><h2><i className="ms ms-lightbulb" aria-hidden="true" />{ko ? "이렇게 작동해요" : "How it works"}</h2><ol><li><span>1</span><div><strong>{ko ? "키워드 저장" : "Save a keyword"}</strong><p>{ko ? "찾고 싶은 상품 키워드를 저장해요." : "Save the item you want to find."}</p></div></li><li><span>2</span><div><strong>{ko ? "새 상품 등록" : "New listing"}</strong><p>{ko ? "마켓에 새로운 상품이 올라와요." : "A new listing appears in Market."}</p></div></li><li><span>3</span><div><strong>{ko ? "알림 도착" : "Get notified"}</strong><p>{ko ? "키워드와 카테고리가 맞으면 알려드려요." : "We notify you when both match."}</p></div></li></ol></section>
        <DashboardAdBanner kind="keywords" />
      </aside>
    </div>
  </div>;

  return <div className="dashboard-content keywords-content">
    <header className="keywords-heading"><div className="keywords-heading-icon"><i className="ms ms-notifications" aria-hidden="true" /></div><div><h1>{t("keywordAlerts")}</h1><p>{t("keywordAlertsHint")}</p></div></header>
    <form className="keywords-add-panel" onSubmit={addKeyword}>
      <div className="keywords-input-wrap"><i className="ms ms-search" aria-hidden="true" /><input value={keyword} onChange={(event) => setKeyword(event.target.value)} type="text" placeholder={t("keywordPlaceholder")} aria-label={t("keywordInputLabel")} maxLength={80} /></div>
      <button type="submit" disabled={!keyword.trim() || isSaving}><i className="ms ms-add" aria-hidden="true" /> {isSaving ? t("saving") : t("addKeyword")}</button>
    </form>
    {error ? <p className="keywords-error" role="alert">{error}</p> : null}
    <section className="keywords-saved" aria-labelledby="saved-keywords-title"><div className="keywords-saved-heading"><h2 id="saved-keywords-title">{t("yourKeywords")} <small>{alerts.length}/20</small></h2></div>
      {alerts.length ? <div className="keywords-chip-list">{alerts.map((alert) => {
        const category = getAlertCategory(alert);
        return <div className={`keyword-chip ${category.tone}${leavingId === alert.id ? " is-removing" : ""}`} key={alert.id} title={category.label}>
          <span>{alert.keyword}</span>
          <small>{category.label}</small>
          <button type="button" disabled={removingId === alert.id} onClick={() => void removeKeyword(alert.id)} aria-label={`Remove ${alert.keyword}`}><i className="ms ms-close" aria-hidden="true" /></button>
        </div>;
      })}</div> : <div className="keywords-empty"><i className="ms ms-notifications-off" aria-hidden="true" /><strong>{t("noKeywordAlerts")}</strong><span>{t("addKeywordHint")}</span></div>}
    </section>
    <section className="keywords-notice" aria-label={t("keywordNoticeLabel")}><i className="ms ms-lightbulb" aria-hidden="true" /><p>{t("keywordNotice")}</p></section>
  </div>;
}
