import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { getServerUser } from "@/lib/auth-server";

export const metadata = { title: "Keyword Alerts" };

const keywords = [
  "iPad",
  "Camping Chair",
  "Bicycle",
  "iPhone",
  "Sofa",
  "Monitor",
  "Nintendo Switch",
  "Desk",
  "Sneakers",
  "Coffee Machine",
  "Camera",
  "Tent",
];

export default async function KeywordAlertsPage() {
  const user = await getServerUser();
  if (!user) redirect("/login?redirectTo=%2Fmarket%2Fdashboard%2Fkeywords");

  return (
    <main className="marketplace-page dashboard-page keywords-page">
      <DashboardSidebar context="market" active="Keywords" />
      <div className="dashboard-content keywords-content">
        <header className="keywords-heading">
          <div className="keywords-heading-icon"><i className="fa-solid fa-bell" aria-hidden="true" /></div>
          <div><h1>Keyword alerts</h1><p>Get notified when new marketplace listings match what you are looking for.</p></div>
        </header>

        <section className="keywords-add-panel" aria-label="Add a keyword">
          <div className="keywords-input-wrap"><i className="fa-solid fa-magnifying-glass" aria-hidden="true" /><input type="text" placeholder="e.g. Laptop, Sofa, Bicycle" aria-label="Keyword" /></div>
          <button type="button"><i className="fa-solid fa-plus" aria-hidden="true" /> Add keyword</button>
        </section>

        <section className="keywords-saved" aria-labelledby="saved-keywords-title">
          <div className="keywords-saved-heading"><div><span>Saved searches</span><h2 id="saved-keywords-title">Your keywords <small>{keywords.length}/20</small></h2></div><p>Alerts are sent as soon as a matching listing is posted.</p></div>
          <div className="keywords-chip-list">
            {keywords.map((keyword, index) => <div className={`keyword-chip keyword-chip-${index % 6}`} key={keyword}><span>{keyword}</span><button type="button" aria-label={`Remove ${keyword}`}><i className="fa-solid fa-xmark" aria-hidden="true" /></button></div>)}
          </div>
        </section>

        <section className="keywords-notice" aria-label="Keyword alert information"><i className="fa-solid fa-lightbulb" aria-hidden="true" /><p>Add up to 20 keywords to make your marketplace search more personal.</p></section>
      </div>
    </main>
  );
}
