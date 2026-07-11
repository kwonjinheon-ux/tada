export const metadata = { title: "Jobs" };

export default function JobsPage() {
  return <main className="page-shell" style={{ paddingBlock: 64 }}><p style={{ color: "var(--color-primary-dark)", fontWeight: 700 }}>Next domain</p><h1>Jobs</h1><p style={{ color: "var(--color-muted)", maxWidth: 600 }}>Jobs has its own route from day one. It will reuse shared UI and authentication, while keeping job-specific models and ViewModels isolated from Marketplace.</p></main>;
}
