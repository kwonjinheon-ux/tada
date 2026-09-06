"use client";

import { FormEvent, useState } from "react";
import { marketplaceCategories, suggestCategoryFromTitle } from "@/data/marketplace-categories";
import { useLanguage } from "@/components/LanguageProvider";

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
  const { t } = useLanguage();
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
