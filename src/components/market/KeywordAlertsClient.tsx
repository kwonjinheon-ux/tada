"use client";

import { FormEvent, useState } from "react";

export type KeywordAlert = { id: string; keyword: string; categorySlug: string | null };
export type KeywordCategory = { slug: string; label: string };

function categoryTone(categorySlug: string | null) {
  if (!categorySlug) return "keyword-chip-general";
  return `keyword-chip-${categorySlug}`;
}

export function KeywordAlertsClient({ initialAlerts, categories }: { initialAlerts: KeywordAlert[]; categories: KeywordCategory[] }) {
  const [alerts, setAlerts] = useState(initialAlerts);
  const [keyword, setKeyword] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const addKeyword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/market/keywords", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ keyword, categorySlug: categorySlug || null }) });
      const payload = await response.json().catch(() => null) as { alert?: KeywordAlert; error?: string } | null;
      if (!response.ok || !payload?.alert) {
        setError(payload?.error ?? "Unable to add this keyword right now.");
        return;
      }
      setAlerts((current) => [payload.alert!, ...current]);
      setKeyword("");
      setCategorySlug("");
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
    <header className="keywords-heading"><div className="keywords-heading-icon"><i className="fa-solid fa-bell" aria-hidden="true" /></div><div><h1>Keyword alerts</h1><p>Get notified when new marketplace listings match what you are looking for.</p></div></header>
    <form className="keywords-add-panel" onSubmit={addKeyword}>
      <div className="keywords-input-wrap"><i className="fa-solid fa-magnifying-glass" aria-hidden="true" /><input value={keyword} onChange={(event) => setKeyword(event.target.value)} type="text" placeholder="e.g. Laptop, Sofa, Bicycle" aria-label="Keyword" maxLength={80} /></div>
      <select value={categorySlug} onChange={(event) => setCategorySlug(event.target.value)} aria-label="Keyword category"><option value="">No category</option>{categories.map((category) => <option value={category.slug} key={category.slug}>{category.label}</option>)}</select>
      <button type="submit" disabled={!keyword.trim() || isSaving}><i className="fa-solid fa-plus" aria-hidden="true" /> {isSaving ? "Adding..." : "Add keyword"}</button>
    </form>
    {error ? <p className="keywords-error" role="alert">{error}</p> : null}
    <section className="keywords-saved" aria-labelledby="saved-keywords-title"><div className="keywords-saved-heading"><div><span>Saved searches</span><h2 id="saved-keywords-title">Your keywords <small>{alerts.length}/20</small></h2></div><p>Alerts are sent as soon as a matching listing is posted.</p></div>
      {alerts.length ? <div className="keywords-chip-list">{alerts.map((alert) => <div className={`keyword-chip ${categoryTone(alert.categorySlug)}`} key={alert.id}><span>{alert.keyword}</span><button type="button" disabled={removingId === alert.id} onClick={() => void removeKeyword(alert.id)} aria-label={`Remove ${alert.keyword}`}><i className="fa-solid fa-xmark" aria-hidden="true" /></button></div>)}</div> : <div className="keywords-empty"><i className="fa-solid fa-bell-slash" aria-hidden="true" /><strong>No keyword alerts yet</strong><span>Add a keyword to receive new listing alerts.</span></div>}
    </section>
    <section className="keywords-notice" aria-label="Keyword alert information"><i className="fa-solid fa-lightbulb" aria-hidden="true" /><p>Add up to 20 keywords to make your marketplace search more personal.</p></section>
  </div>;
}
