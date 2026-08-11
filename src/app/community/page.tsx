import { ComingSoon } from "@/components/ComingSoon";

export const metadata = { title: "Community" };

export default function CommunityPage() {
  return (
    <main className="jobs-page">
      <ComingSoon kicker="Coming soon" title="Community" description="A space to connect with people nearby — local groups, events, and neighbourhood conversations. We're still building this." />
    </main>
  );
}
