"use client";

import { FormEvent, useState } from "react";
import { marketplaceCategories, suggestCategoryFromTitle } from "@/data/marketplace-categories";
import { useLanguage } from "@/components/LanguageProvider";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";

export type KeywordAlert = { id: string; keyword: string; categorySlug: string | null };

function getAlertCategory(alert: KeywordAlert) {
  const categorySlug = alert.categorySlug ?? suggestCategoryFromTitle(alert.keyword)?.mainCategory ?? null;
  const category = marketplaceCategories.find(({ value }) => value === categorySlug);
  return {
    label: category?.label ?? "General",
  };
}

export function KeywordAlertsClient({ initialAlerts }: { initialAlerts: KeywordAlert[] }) {
  const { t } = useLanguage();
  const [alerts, setAlerts] = useState(initialAlerts);
  const [keyword, setKeyword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

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
    const previous = alerts;
    setRemovingId(id);
    setAlerts((current) => current.filter((alert) => alert.id !== id));
    try {
      const response = await fetch("/api/market/keywords", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      if (!response.ok) {
        setAlerts(previous);
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        setError(payload?.error ?? "Unable to remove this keyword right now.");
      }
    } catch {
      setAlerts(previous);
      setError("Unable to reach keyword alerts right now.");
    } finally {
      setRemovingId(null);
    }
  };

  return <div className="dashboard-content keywords-content">
    <header className="keywords-heading">
      <div className="keywords-heading-icon"><i className="ms ms-notifications" aria-hidden="true" /></div>
      <div><h1>{t("keywordAlerts")}</h1><p>{t("keywordAlertsHint")}</p></div>
    </header>
    <form className="keywords-add-panel ui-panel" onSubmit={addKeyword}>
      <div className="keywords-add-copy">
        <span><i className="ms ms-sell" aria-hidden="true" /> {t("marketplace")}</span>
        <strong>{t("addKeyword")}</strong>
        <p>{t("keywordNotice")}</p>
      </div>
      <label className="keywords-field" htmlFor="keyword-alert-input">
        <span>{t("keywordInputLabel")}</span>
        <div className="keywords-input-wrap"><i className="ms ms-search" aria-hidden="true" /><input id="keyword-alert-input" value={keyword} onChange={(event) => setKeyword(event.target.value)} type="text" placeholder={t("keywordPlaceholder")} maxLength={80} /></div>
      </label>
      <Button type="submit" className="keywords-add-button" disabled={!keyword.trim() || isSaving}>
        <i className="ms ms-add" aria-hidden="true" /> {isSaving ? t("saving") : t("addKeyword")}
      </Button>
    </form>
    {error ? <p className="keywords-error" role="alert">{error}</p> : null}
    <section className="keywords-saved" aria-labelledby="saved-keywords-title">
      <div className="keywords-saved-heading"><div><h2 id="saved-keywords-title">{t("yourKeywords")} <small>{alerts.length}/20</small></h2><p>{t("addKeywordHint")}</p></div></div>
      {alerts.length ? <ul className="keywords-list">{alerts.map((alert) => {
        const category = getAlertCategory(alert);
        return <li className="keyword-row ui-panel" key={alert.id}>
          <div className="keyword-row-copy"><strong>{alert.keyword}</strong><span>{category.label}</span></div>
          <IconButton className="keyword-remove-button" disabled={removingId === alert.id} onClick={() => void removeKeyword(alert.id)} aria-label={`Remove ${alert.keyword}`} title={`Remove ${alert.keyword}`}><i className="ms ms-close" aria-hidden="true" /></IconButton>
        </li>;
      })}</ul> : <div className="keywords-empty ui-panel"><i className="ms ms-notifications-off" aria-hidden="true" /><strong>{t("noKeywordAlerts")}</strong><span>{t("addKeywordHint")}</span></div>}
    </section>
    <section className="keywords-notice" aria-label={t("keywordNoticeLabel")}><i className="ms ms-lightbulb" aria-hidden="true" /><p>{t("keywordNotice")}</p></section>
  </div>;
}
