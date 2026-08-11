import Link from "next/link";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata = { title: "Group Buy | Tada" };

const shopTypeLinks = [
  { label: "All", href: "/market" },
  { label: "Second Hands", href: "/market/secondhands" },
  { label: "Garage Sale", href: "/market/garage-sales" },
  { label: "Moving Sale", href: "/market/moving-sales" },
  { label: "2 Dollar Shop", href: "/market/2dollarshop" },
];

export default function GroupBuyRoute() {
  return (
    <main className="groupbuy-page">
      <ComingSoon kicker="Coming soon" title="Group Buy" description="Pool orders with your neighbours for a better price. We're still building this — in the meantime, browse a shop type below." />
      <nav className="groupbuy-shop-type-links" aria-label="Browse other shop types">
        {shopTypeLinks.map(({ label, href }) => <Link key={href} href={href}>{label}</Link>)}
      </nav>
    </main>
  );
}
