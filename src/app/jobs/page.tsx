import { PageContainer } from "@/components/layout/PageContainer";

export const metadata = { title: "Jobs" };

export default function JobsPage() {
  return (
    <main className="jobs-page">
      <PageContainer>
        <p className="jobs-kicker">Next domain</p>
        <h1>Jobs</h1>
        <p className="jobs-intro">Jobs has its own route from day one. It will reuse shared UI and authentication, while keeping job-specific models and ViewModels isolated from Marketplace.</p>
      </PageContainer>
    </main>
  );
}
