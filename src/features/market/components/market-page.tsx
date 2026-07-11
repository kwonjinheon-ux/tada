import Link from "next/link";

const categories = ["Electronics", "Home & Furniture", "Clothing", "Entertainment", "Books", "Garden"];

export function MarketPage() {
  return <main className="page-shell" style={{ paddingBlock: 32 }}>
    <section style={{ border: "1px solid var(--color-line)", borderRadius: "var(--radius-card)", padding: 24, background: "var(--color-surface)" }}>
      <p style={{ color: "var(--color-primary-dark)", fontWeight: 700, margin: 0 }}>Marketplace</p><h1 style={{ margin: "8px 0" }}>Fresh finds</h1><p style={{ color: "var(--color-muted)", marginBottom: 0 }}>Browse listings today. Full filtering, saving and real-time updates are the next feature milestones.</p>
    </section>
    <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginTop: 24 }}>
      {categories.map((category) => <Link key={category} href={`/market?category=${encodeURIComponent(category)}`} style={{ border: "1px solid var(--color-line)", borderRadius: "var(--radius-ui)", background: "var(--color-surface)", padding: 20, fontWeight: 700 }}>{category}</Link>)}
    </section>
  </main>;
}
