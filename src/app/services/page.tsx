import { ComingSoon } from "@/components/ComingSoon";

export const metadata = { title: "Services | Tada" };

export default function ServicesPage() {
  return (
    <main className="jobs-page">
      <ComingSoon
        kicker="Coming soon"
        title="Services"
        description="Find trusted local help for the jobs that make everyday life easier. Services is on its way to Tada."
      />
    </main>
  );
}
