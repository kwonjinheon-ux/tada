"use client";

import { FormEvent, useState } from "react";
import { usePathname } from "next/navigation";
import { marketplaceCategories, suggestCategoryFromTitle } from "@/data/marketplace-categories";
import { useLanguage } from "@/components/LanguageProvider";
import { AccountPageIntro, DashboardAdBanner } from "@/components/dashboard/AccountPagePatterns";

export type KeywordAlert = { id: string; keyword: string; categorySlug: string | null };

const keywordRemovalDelayMs = 160;

function getAlertCategory(alert: KeywordAlert) {
  const categorySlug = alert.categorySlug ?? suggestCategoryFromTitle(alert.keyword)?.mainCategory ?? null;
  const category = marketplaceCategories.find(({ value }) => value === categorySlug);
  return {
    label: category?.label ?? "General",
    tone: categorySlug ? `keyword-chip-${categorySlug}` : "keyword-chip-general",
  };
}

export function KeywordAlertsClient({ initialAlerts }: { initialAlerts: KeywordAlert[] }) {
  const { t, locale } = useLanguage();
  const legacy = usePathname().endsWith("/keywords-v0");
  const ko = locale === "ko";
  const [alerts, setAlerts] = useState(initialAlerts);
  const [keyword, setKeyword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [leavingId, setLeavingId] = useState<string | null>(null);

  const addKeyword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/market/keywords", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ keyword }) });
      const payload = await response.json().catch(() => null) as { alert?: KeywordAlert; error?: string } | null;
      if (!response.ok || !payload?.alert) {
        setError(payload?.error ?? "Unable to add this keyword right now.");
        return;
      }
      setAlerts((current) => [payload.alert!, ...current]);
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

  return <div className={`dashboard-content keywords-content${legacy ? "" : " account-modern account-keywords"}`}>
    {legacy ? <header className="keywords-heading"><div className="keywords-heading-icon"><i className="ms ms-notifications" aria-hidden="true" /></div><div><h1>{t("keywordAlerts")}</h1><p>{t("keywordAlertsHint")}</p></div></header> : <AccountPageIntro icon="ms-key" title={ko ? "관심 키워드" : "Saved keywords"} description={ko ? "찾는 상품의 이름을 저장하고 새 소식을 놓치지 마세요." : "Save what you're looking for and stay close to new local finds."} detail={ko ? `저장한 키워드 ${alerts.length}/20개 · 마켓 상품 알림` : `${alerts.length}/20 saved · Market listing alerts`} />}
    {!legacy ? <div className="ui-panel account-keyword-guide"><i className="ms ms-lightbulb" aria-hidden="true" /><div><strong>{ko ? "찾는 상품을 적어보세요" : "What are you looking for?"}</strong><p>{ko ? "예: 자전거, 식탁. 키워드에 맞는 마켓 상품이 올라오면 알려드려요." : "Try a specific item, such as a bicycle or dining table. We'll alert you to matching Market listings."}</p></div></div> : null}
    <form className="keywords-add-panel" onSubmit={addKeyword}>
      <div className="keywords-input-wrap"><i className="ms ms-search" aria-hidden="true" /><input value={keyword} onChange={(event) => setKeyword(event.target.value)} type="text" placeholder={t("keywordPlaceholder")} aria-label={t("keywordInputLabel")} maxLength={80} disabled={!legacy && alerts.length >= 20} /></div>
      <button type="submit" disabled={!keyword.trim() || isSaving || (!legacy && alerts.length >= 20)}><i className="ms ms-add" aria-hidden="true" /> {isSaving ? t("saving") : t("addKeyword")}</button>
    </form>
    {error ? <p className="keywords-error" role="alert">{error}</p> : null}
    {!legacy && alerts.length >= 20 ? <p className="account-keyword-limit" role="status">{ko ? "키워드는 최대 20개까지 저장할 수 있어요. 새 키워드를 추가하려면 기존 키워드를 하나 삭제해 주세요." : "You can save up to 20 keywords. Remove one before adding another."}</p> : null}
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
    {!legacy ? <DashboardAdBanner kind="keywords" /> : null}
  </div>;
}
