import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { listings } from "@/data/listings";
import { getServerUser } from "@/lib/auth-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const insights = [
  ["Total Views", "2.4k", "fa-solid fa-arrow-trend-up", "12%", "is-green"],
  ["Total Saves", "482", "fa-solid fa-arrow-trend-up", "8%", "is-amber"],
  ["Sales", "4", "fa-solid fa-arrow-trend-up", "5%", "is-blue"],
] as const;

const activity = [
  ["fa-solid fa-tag", "Item Sold! You just sold your latest listing.", "2 hours ago", "is-green"],
  ["fa-regular fa-tag", "New offer received on one of your items.", "Yesterday, 14:20", "is-slate"],
  ["fa-regular fa-star", "Received a 5-star review from Sarah.", "May 12, 2024", "is-amber"],
  ["fa-solid fa-clock-rotate-left", "Listing is ready to renew.", "May 10, 2024", "is-blue"],
] as const;

export async function SellerDashboard({ context = "market" }: { context?: "market" | "jobs" }) {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const supabase = await createServerSupabaseClient();
  const { data: profile } = supabase
    ? await supabase.from("profiles").select("display_name, avatar_path, region_city, region_suburb").eq("id", user.id).maybeSingle()
    : { data: null };
  const isJobsDashboard = context === "jobs";
  const displayName = profile?.display_name || (typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : user.email?.split("@")[0]) || "Tada member";
  const initial = displayName.trim().charAt(0).toUpperCase() || "T";
  const avatarPath = profile?.avatar_path || (typeof user.user_metadata?.avatar_path === "string" ? user.user_metadata.avatar_path : null);
  const { data: signedAvatar } = supabase && avatarPath ? await supabase.storage.from("profile-avatars").createSignedUrl(avatarPath, 3600) : { data: null };
  const locationLabel = [profile?.region_suburb, profile?.region_city].filter(Boolean).join(", ");
  const memberSince = new Intl.DateTimeFormat("en-NZ", { month: "long", year: "numeric" }).format(new Date(user.created_at));
  const membershipLabel = typeof user.user_metadata?.membership_level === "string" ? user.user_metadata.membership_level : "Member";
  const activeListings = listings.slice(0, 3);
  const [listingCount, wishlistCount, keywordCount, unreadMessageCount, completedSalesCount, completedPurchasesCount] = supabase
    ? await Promise.all([
      supabase.from("market_listings").select("id", { count: "exact", head: true }).eq("owner_id", user.id).in("status", ["published", "pending"]),
      supabase.from("market_wishlist").select("listing_id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("market_keyword_alerts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("market_messages").select("id", { count: "exact", head: true }).eq("recipient_id", user.id).is("read_at", null),
      supabase.from("market_trade_offers").select("id", { count: "exact", head: true }).eq("seller_id", user.id).eq("status", "completed"),
      supabase.from("market_trade_offers").select("id", { count: "exact", head: true }).eq("buyer_id", user.id).eq("status", "completed"),
    ])
    : [{ count: 0 }, { count: 0 }, { count: 0 }, { count: 0 }, { count: 0 }, { count: 0 }];
  const activeListingCount = listingCount.count ?? 0;
  const savedWishlistCount = wishlistCount.count ?? 0;
  const savedKeywordCount = keywordCount.count ?? 0;
  const unreadMessages = unreadMessageCount.count ?? 0;
  const trustPower = Math.min(100, (completedSalesCount.count ?? 0) + (completedPurchasesCount.count ?? 0));
  const quickStats = [
    ["fa-regular fa-rectangle-list", "Listings", `${activeListingCount} Active`, "/market/dashboard/listings"],
    ["fa-solid fa-heart", "Wishlist", `${savedWishlistCount} ${savedWishlistCount === 1 ? "Item" : "Items"}`, "/market/wishlist"],
    ["fa-solid fa-list", "Keywords", `${savedKeywordCount} Tracked`, "/market/dashboard/keywords"],
    ["fa-regular fa-message", "Messages", `${unreadMessages} New`, "/market/dashboard/messages"],
  ] as const;

  return (
    <main className="marketplace-page dashboard-page dashboard-layout seller-dashboard-page">
      <DashboardSidebar context={context} active="Dashboard" />
      <div className="dashboard-content seller-dashboard-content">
        <section className="seller-dashboard-top">
          <article className="seller-summary-card">
            <div className="seller-summary-avatar">{signedAvatar?.signedUrl ? <img src={signedAvatar.signedUrl} alt="Your profile" /> : initial}<span><i className="fa-solid fa-check" /></span></div>
            <div className="seller-summary-copy"><div className="seller-summary-name"><h1>{displayName}</h1><em>{membershipLabel}</em></div><p>{user.email}</p>{locationLabel ? <small><i className="fa-solid fa-location-dot" /> {locationLabel}</small> : null}<small><i className="fa-regular fa-calendar" /> Joined {memberSince}</small></div>
          </article>
          <article className="seller-trust-card"><div><i className="fa-solid fa-bolt" /><span>Trust Power</span><strong>{trustPower}%</strong></div><div className="seller-trust-meter"><span style={{ width: `${trustPower}%` }} /></div><p>Earn 1% for every completed trade</p></article>
        </section>

        <section className="seller-quick-stats" aria-label="Account overview">
          {quickStats.map(([icon, label, value, href], index) => <Link href={href} key={label} className={index === 3 && unreadMessages ? "has-alert" : ""}><i className={icon} /><div><strong>{label}</strong><span>{value}</span></div></Link>)}
        </section>

        <section className="seller-dashboard-insights">
          <header><h2>Performance Insights</h2></header>
          <div>{insights.map(([label, value, icon, change, color]) => <article className={color} key={label}><span>{label}</span><strong>{value}</strong><small><i className={icon} /> {change}</small></article>)}</div>
        </section>

        <div className="seller-dashboard-columns">
          <section className="seller-active-listings"><header><h2>{isJobsDashboard ? "Active Job Posts" : "Active Listings"}</h2><Link href="/market">View all</Link></header><div>
            {activeListings.map((listing, index) => <article key={listing.id}><img src={listing.image} alt={listing.imageAlt} /><div><h3>{listing.title}</h3><strong>{listing.price}</strong><p><span><i className="fa-regular fa-eye" /> {index === 0 ? "124" : index === 1 ? "89" : "342"}</span><span><i className="fa-regular fa-heart" /> {index === 0 ? "18" : index === 1 ? "12" : "45"}</span></p><div className="seller-listing-actions"><button type="button">Edit</button><button type="button">Sold</button></div></div><button type="button" aria-label={`More options for ${listing.title}`}><i className="fa-solid fa-ellipsis-vertical" /></button></article>)}
            <button className="seller-new-listing" type="button"><i className="fa-solid fa-plus" /><span>{isJobsDashboard ? "Post New Job" : "Post New Listing"}</span><small>Show the world what you have</small></button>
          </div></section>
          <aside className="seller-activity"><header><h2>Activity</h2><button type="button" aria-label="More activity options"><i className="fa-solid fa-ellipsis" /></button></header><div className="seller-activity-list">{activity.map(([icon, text, date, color]) => <article key={text}><i className={`${icon} ${color}`} /><div><strong>{text}</strong><span>{date}</span></div></article>)}</div><button className="seller-show-activity" type="button">Show All Activity</button><article className="seller-boost-card"><strong>Boost Your Sales</strong><p>Professional photos help listings get noticed.</p><button type="button">Try Tada Lens</button></article></aside>
        </div>
      </div>
    </main>
  );
}
