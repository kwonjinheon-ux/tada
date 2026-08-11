import { ComingSoon } from "@/components/ComingSoon";

export const metadata = { title: "Create a post | Tada" };

export default function CommunityCreateRoute() {
  return (
    <main className="jobs-page">
      <ComingSoon kicker="Coming soon" title="Create a community post" description="Posting to Community isn't open yet — we're still building it. In the meantime, browse what's there." />
    </main>
  );
}
