import Link from "next/link";
import { redirect } from "next/navigation";
import { ActiveJourneyCarousel, type ActiveJourneyItem } from "@/components/dashboard/ActiveJourneyCarousel";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { TranslatedText } from "@/components/LanguageProvider";
import { formatMarketPrice } from "@/lib/market/format-price";
import { getServerUser } from "@/lib/auth-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSignedStorageImages } from "@/lib/supabase/storage-image";

type DashboardListing = { id: string; title: string; price_cents: number; view_count: number; status: "published" | "pending" | "sold" | "archived" };
type DashboardPhoto = { listing_id: string; storage_path: string; display_order: number };
type DashboardMetrics = { total_views: number | string; total_saves: number | string; total_sales: number | string };
type ActivityRow = { id: string; type: "message" | "offer" | "trade" | "keyword" | "wishlist"; title: string; body: string; href: string; created_at: string };

const activityIconByType = { message: ["fa-regular fa-message", "is-slate"], offer: ["fa-regular fa-handshake", "is-amber"], trade: ["fa-solid fa-circle-check", "is-green"], keyword: ["fa-regular fa-bell", "is-blue"], wishlist: ["fa-regular fa-heart", "is-amber"] } as const;

function formatCount(value: number) {
  return new Intl.NumberFormat("en-NZ", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function relativeTime(value: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Intl.DateTimeFormat("en-NZ", { day: "numeric", month: "short" }).format(new Date(value));
}

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
  const [listingCount, wishlistCount, keywordCount, unreadMessageCount, completedSalesCount, completedPurchasesCount, metricsResult, listingRowsResult, activityRowsResult] = supabase
    ? await Promise.all([
      supabase.from("market_listings").select("id", { count: "exact", head: true }).eq("owner_id", user.id).in("status", ["published", "pending"]),
      supabase.from("market_wishlist").select("listing_id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("market_keyword_alerts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("market_messages").select("id", { count: "exact", head: true }).eq("recipient_id", user.id).is("read_at", null),
      supabase.from("market_trade_offers").select("id", { count: "exact", head: true }).eq("seller_id", user.id).eq("status", "completed"),
      supabase.from("market_trade_offers").select("id", { count: "exact", head: true }).eq("buyer_id", user.id).eq("status", "completed"),
      supabase.rpc("get_market_seller_dashboard_metrics"),
      supabase.from("market_listings").select("id,title,price_cents,view_count,status").eq("owner_id", user.id).in("status", ["published", "pending"]).order("created_at", { ascending: false }).limit(3),
      supabase.from("market_notifications").select("id,type,title,body,href,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(4),
    ])
    : [{ count: 0 }, { count: 0 }, { count: 0 }, { count: 0 }, { count: 0 }, { count: 0 }, { data: [] }, { data: [] }, { data: [] }];
  const activeListings = (listingRowsResult.data ?? []) as DashboardListing[];
  const { data: photoRows } = supabase && activeListings.length
    ? await supabase.from("market_listing_photos").select("listing_id,storage_path,display_order").in("listing_id", activeListings.map((listing) => listing.id)).order("display_order", { ascending: true })
    : { data: [] };
  const primaryPhotoByListing = new Map<string, string>();
  for (const photo of (photoRows ?? []) as DashboardPhoto[]) if (!primaryPhotoByListing.has(photo.listing_id)) primaryPhotoByListing.set(photo.listing_id, photo.storage_path);
  const listingImages = await getSignedStorageImages("market-listing-images", [...new Set(primaryPhotoByListing.values())], "thumbnail");
  const metricRow = ((metricsResult.data ?? []) as DashboardMetrics[])[0];
  const totalViews = Number(metricRow?.total_views ?? activeListings.reduce((total, listing) => total + Number(listing.view_count ?? 0), 0));
  const totalSaves = Number(metricRow?.total_saves ?? 0);
  const totalSales = Number(metricRow?.total_sales ?? completedSalesCount.count ?? 0);
  const insights = [["totalViews", formatCount(totalViews), "fa-solid fa-chart-line", "is-green"], ["totalSaves", formatCount(totalSaves), "fa-solid fa-heart", "is-amber"], ["sales", formatCount(totalSales), "fa-solid fa-bag-shopping", "is-blue"]] as const;
  const activity = (activityRowsResult.data ?? []) as ActivityRow[];
  const activeListingCount = listingCount.count ?? 0;
  const savedWishlistCount = wishlistCount.count ?? 0;
  const savedKeywordCount = keywordCount.count ?? 0;
  const unreadMessages = unreadMessageCount.count ?? 0;
  const trustPower = Math.min(100, (completedSalesCount.count ?? 0) + (completedPurchasesCount.count ?? 0));
  const trustTone = trustPower <= 10 ? "is-red" : trustPower <= 20 ? "is-yellow" : trustPower <= 50 ? "is-blue" : "is-green";
  // Design pass only: placeholder cards until Active Journey is wired to real trade-offer
  // and conversation data. Shape matches ActiveJourneyItem so swapping in live rows later
  // is a data-fetch change, not a markup change.
  const activeJourneyItems: ActiveJourneyItem[] = [
    { id: "sample-buying", role: "buying", title: "Sony WH-1000XM5", imageUrl: null, stage: "accepted", statusLabel: "Offer accepted", meetingLabel: "Meet tomorrow · 4:00 PM", conversationHref: "/market/dashboard/messages" },
    { id: "sample-selling", role: "selling", title: "Dining Table", imageUrl: null, newOfferCount: 2, bestOfferLabel: "$180", totalViews: 146, reviewHref: "/market/dashboard/messages" },
  ];
  const quickStats = [
    ["fa-regular fa-rectangle-list", "listings", activeListingCount, "active", "/market/dashboard/listings"],
    ["fa-solid fa-heart", "wishlist", savedWishlistCount, "items", "/market/wishlist"],
    ["fa-solid fa-list", "keywords", savedKeywordCount, "tracked", "/market/dashboard/keywords"],
    ["fa-regular fa-message", "messages", unreadMessages, "new", "/market/dashboard/messages"],
  ] as const;

  return (
    <main className="marketplace-page dashboard-page dashboard-layout seller-dashboard-page">
      <DashboardSidebar context={context} active="Dashboard" />
      <div className="dashboard-content seller-dashboard-content">
        <section className="seller-dashboard-top">
          <article className="seller-summary-card">
            <div className="seller-summary-avatar">{signedAvatar?.signedUrl ? <img src={signedAvatar.signedUrl} alt="Your profile" /> : initial}<span><i className="fa-solid fa-check" /></span></div>
            <div className="seller-summary-copy"><div className="seller-summary-name"><h1>{displayName}</h1><em>{membershipLabel}</em></div><p>{user.email}</p>{locationLabel ? <small><i className="fa-solid fa-location-dot" /> {locationLabel}</small> : null}<small><i className="fa-regular fa-calendar" /> Joined {memberSince}</small></div>
            <Link className="seller-summary-settings" href="/market/dashboard/profile" aria-label="Open profile settings"><i className="fa-solid fa-gear" /></Link>
          </article>
          <article className={`seller-trust-card ${trustTone}`}><div><i className="fa-solid fa-bolt" /><span><TranslatedText translationKey="trustPower" /></span><strong>{trustPower}%</strong></div><div className="seller-trust-meter"><span style={{ width: `${trustPower}%` }} /></div><p><TranslatedText translationKey="earnTrade" /></p></article>
        </section>

        <ActiveJourneyCarousel items={activeJourneyItems} />

        <section className="seller-quick-stats" aria-label="Account overview">
          {quickStats.map(([icon, label, value, unit, href], index) => <Link href={href} key={label} className={index === 3 && unreadMessages ? "has-alert" : ""}><i className={icon} /><div><strong><TranslatedText translationKey={label} /></strong><span>{value} <TranslatedText translationKey={unit} /></span></div></Link>)}
        </section>

        <section className="seller-dashboard-insights">
          <header><h2><TranslatedText translationKey="performanceInsights" /></h2></header>
          <div>{insights.map(([label, value, icon, color]) => <article className={color} key={label}><span><TranslatedText translationKey={label} /></span><strong>{value}</strong><small><i className={icon} /> <TranslatedText translationKey="allTime" /></small></article>)}</div>
        </section>

        <div className="seller-dashboard-columns">
          <section className="seller-active-listings"><header><h2><TranslatedText translationKey={isJobsDashboard ? "activeJobPosts" : "activeListings"} /></h2><Link href="/market/dashboard/listings"><TranslatedText translationKey="viewAll" /></Link></header><div>
            {activeListings.map((listing) => <article key={listing.id}><img src={listingImages.get(primaryPhotoByListing.get(listing.id) ?? "") ?? "/images/logo.png"} alt="" /><div><h3>{listing.title}</h3><strong>{formatMarketPrice(listing.price_cents)}</strong><p><span><i className="fa-regular fa-eye" /> {formatCount(Number(listing.view_count ?? 0))}</span><span><TranslatedText translationKey={listing.status === "pending" ? "inTrade" : "active"} /></span></p><div className="seller-listing-actions"><Link href={`/market/${listing.id}/edit`}><TranslatedText translationKey="edit" /></Link><Link href="/market/dashboard/messages"><TranslatedText translationKey={listing.status === "pending" ? "viewTrade" : "manage"} /></Link></div></div><Link href={`/market/${listing.id}/edit`} aria-label={`Manage ${listing.title}`}><i className="fa-solid fa-ellipsis-vertical" /></Link></article>)}
            <button className="seller-new-listing" type="button"><i className="fa-solid fa-plus" /><span><TranslatedText translationKey={isJobsDashboard ? "postNewJob" : "postNewListing"} /></span><small><TranslatedText translationKey="postListingHint" /></small></button>
          </div></section>
          <aside className="seller-activity"><header><h2><TranslatedText translationKey="activity" /></h2><Link href="/market/dashboard/notifications" aria-label="Manage activity"><i className="fa-solid fa-ellipsis" /></Link></header><div className="seller-activity-list">{activity.length ? activity.map((item) => { const [icon, color] = activityIconByType[item.type]; return <Link href={item.href} key={item.id}><i className={`${icon} ${color}`} /><div><strong>{item.title}</strong><span>{item.body || relativeTime(item.created_at)}</span></div></Link>; }) : <p className="seller-activity-empty"><TranslatedText translationKey="recentActivityEmpty" /></p>}</div><Link className="seller-show-activity" href="/market/dashboard/notifications"><TranslatedText translationKey="showAllActivity" /></Link><article className="seller-boost-card"><strong><TranslatedText translationKey="boostSales" /></strong><p><TranslatedText translationKey="boostSalesCopy" /></p><button type="button"><TranslatedText translationKey="tryTadaLens" /></button></article></aside>
        </div>
      </div>
    </main>
  );
}
