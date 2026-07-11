import Link from "next/link";
import { SiteHeader } from "@/components/layout/site-header";

export default function HomePage() {
  return <><SiteHeader /><main className="page-shell" style={{ paddingBlock: "96px" }}><p style={{ color: "var(--color-primary-dark)", fontWeight: 700 }}>Tada Marketplace</p><h1 style={{ fontSize: "clamp(40px, 7vw, 72px)", margin: "8px 0" }}>Find what is next.</h1><p style={{ color: "var(--color-muted)", maxWidth: 560 }}>The React foundation is ready for marketplace listings, with Jobs prepared as the next domain.</p><div style={{ display: "flex", gap: 12, marginTop: 28 }}><Link className="button button-primary" href="/market">Explore market</Link><Link className="button button-secondary" href="/post-ad">Post an item</Link></div></main></>;
}
