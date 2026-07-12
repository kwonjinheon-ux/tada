import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { listings } from "@/data/listings";
import { getServerUser } from "@/lib/auth-server";

export const metadata = { title: "My Dashboard" };

const dashboardNav = [["fa-border-all", "Dashboard", true], ["fa-circle-user", "Profile Settings", false], ["fa-message", "Messages", false], ["fa-heart", "Wishlist", false], ["fa-key", "Keywords", false], ["fa-rectangle-list", "Manage Listings", false], ["fa-map", "Nearby Map", false]] as const;
const listingStats = [["fa-circle-exclamation", "Action Required", "0"], ["fa-tag", "In Progress & Pending", "2"], ["fa-ban", "Sold & Out of Stock", "0"], ["fa-envelope-open", "Drafts", "0"], ["fa-arrows-rotate", "Renewable Listings", "0"], ["fa-rotate", "Deletable & Repostable", "0"]] as const;

export async function SellerDashboard({ context = "market" }: { context?: "market" | "jobs" }) {
  const user = await getServerUser();
  if (!user) redirect("/login");
  const myListings = [listings[4], listings[2]];
  const isJobsDashboard = context === "jobs";

  return (
    <main className="marketplace-page dashboard-page">
      <aside className="market-filter-panel dashboard-sidebar" aria-label={`${context} dashboard navigation`}>
        <nav className="dashboard-nav">
          {dashboardNav.map(([icon, label, active]) => (
            <a className={active ? "is-active" : ""} href={`#${label.toLowerCase().replaceAll(" ", "-")}`} key={label}>
              <i className={`fa-solid ${icon}`} aria-hidden="true" /><span>{label}</span>{label === "Messages" && <b>24</b>}
            </a>
          ))}
        </nav>
        <Link className="dashboard-sell-button" href="/post-ad"><i className="fa-solid fa-circle-plus" aria-hidden="true" /> Sell</Link>
      </aside>

      <div className="dashboard-content">
        <div className="dashboard-welcome">
          <div><p>{context === "market" ? "Marketplace dashboard" : "Jobs dashboard"}</p><h1>Welcome back</h1><span>{user.email}</span></div>
          <LogoutButton />
        </div>

        <section className="dashboard-section" id="dashboard">
          <h2>Overview</h2>
          <div className="overview-grid">
            <article className="overview-card"><div><i className="fa-regular fa-comment" /> Messages to Reply</div><strong>0</strong></article>
            <article className="overview-card"><div><i className="fa-regular fa-star" /> Seller Rating</div><strong>0</strong></article>
          </div>
        </section>

        <section className="dashboard-section" id="manage-listings">
          <div className="dashboard-section-heading">
            <h2>{isJobsDashboard ? "My Job Posts" : "My Listings"}</h2>
            <div><button className="dashboard-button is-soft" type="button"><i className="fa-solid fa-rocket" /> {isJobsDashboard ? "Promote Job" : "Promote Listing"}</button><Link className="dashboard-button" href="/post-ad"><i className="fa-solid fa-pen-to-square" /> {isJobsDashboard ? "Create New Job" : "Create New Listing"}</Link></div>
          </div>
          <div className="listing-stat-grid">
            {listingStats.map(([icon, label, value]) => <article className="listing-stat-card" key={label}><div><i className={`fa-solid ${icon}`} /><span>{label}</span></div><strong>{value}</strong></article>)}
          </div>
          <div className="dashboard-listings">
            {myListings.map((listing, index) => (
              <article className="dashboard-listing" key={listing.id}>
                <img src={listing.image} alt={listing.imageAlt} />
                <div className="dashboard-listing-body">
                  <div><h3>{listing.title}</h3><strong>{listing.price}</strong><p>{index === 0 ? "Available" : "In Progress"} • Posted recently</p><p>Listed in {listing.location}</p></div>
                  <div className="dashboard-listing-actions"><button className="is-sold" type="button"><i className="fa-solid fa-check" /> Mark as Sold</button><button type="button"><i className="fa-solid fa-rocket" /> Promote Listing</button><button type="button"><i className="fa-solid fa-share-nodes" /> Share</button><button className="icon-only" type="button" aria-label="More options"><i className="fa-solid fa-ellipsis" /></button></div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

export default async function AccountPage() {
  redirect("/market/dashboard");
}
