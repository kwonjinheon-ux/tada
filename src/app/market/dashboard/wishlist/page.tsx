import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { getServerUser } from "@/lib/auth-server";

export const metadata = { title: "Wishlist" };

const wishlistItems = [
  { title: "Lumix S5II Full-Frame Mirrorless", category: "Electronics", seller: "TechHub Store", price: "$1,999", status: "Active", image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=720&q=85" },
  { title: "Tesla Model S Plaid 2023", category: "Cars", seller: "Elite Motors", price: "$82,500", status: "Price drop", previousPrice: "$85,000", image: "https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=720&q=85" },
  { title: "Skyline Loft - 3BR Penthouse", category: "Real estate", seller: "Prime Living", price: "$1.2M", status: "Active", image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=720&q=85" },
  { title: "Moog Model D Reissue", category: "Musical instruments", seller: "Vintage Finds", price: "$3,450", status: "Sold out", image: "https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?auto=format&fit=crop&w=720&q=85" },
];

const recentlyViewed = [
  { title: "Herman Miller Embody", price: "$1,595", image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=520&q=85" },
  { title: "Sony WH-1000XM5", price: "$348", image: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=520&q=85" },
  { title: "Apple Watch Ultra 2", price: "$799", image: "https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?auto=format&fit=crop&w=520&q=85" },
  { title: "Architectural Art Books", price: "$120", image: "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=520&q=85" },
];

export default async function WishlistPage() {
  const user = await getServerUser();
  if (!user) redirect("/login?redirectTo=%2Fmarket%2Fdashboard%2Fwishlist");

  return (
    <main className="marketplace-page dashboard-page wishlist-page">
      <DashboardSidebar context="market" active="Wishlist" />
      <div className="dashboard-content profile-settings-content wishlist-content">
        <header className="wishlist-heading">
          <div><span>Manage your 12 saved items</span></div>
          <div className="wishlist-tabs" aria-label="Wishlist categories">
            <button className="is-active" type="button">All items</button><button type="button">Goods</button><button type="button">Cars</button><button type="button">Real estate</button><button type="button">Articles</button>
          </div>
        </header>

        <section className="wishlist-list" aria-label="Saved items">
          {wishlistItems.map((item) => {
            const isSold = item.status === "Sold out";
            return <article className={`wishlist-item ${isSold ? "is-sold" : ""}`} key={item.title}>
              <div className="wishlist-item-image"><img src={item.image} alt="" />{item.status === "Price drop" ? <span className="wishlist-status is-price-drop">Price drop</span> : <span className={`wishlist-status ${isSold ? "is-sold" : ""}`}>{item.status}</span>}</div>
              <div className="wishlist-item-main"><p>{item.category} <span>/</span> {item.seller}</p><h2>{item.title}</h2><div className="wishlist-item-actions">{isSold ? <><button type="button" disabled>Sold out</button><button className="wishlist-secondary-action" type="button">Archive</button></> : <><Link href="/market">View listing</Link><Link className="wishlist-secondary-action" href="/market/dashboard/messages">Send message</Link></>}</div></div>
              <div className="wishlist-item-side"><strong>{item.price}</strong>{item.previousPrice ? <del>{item.previousPrice}</del> : null}<button className="wishlist-heart" type="button" aria-label={`Saved ${item.title}`}><i className={`fa-${isSold ? "regular" : "solid"} fa-heart`} aria-hidden="true" /></button></div>
            </article>;
          })}
        </section>

        <section className="wishlist-discovery" aria-labelledby="wishlist-discovery-title">
          <div className="wishlist-discovery-icon"><i className="fa-solid fa-magnifying-glass" aria-hidden="true" /></div><h2 id="wishlist-discovery-title">Looking for more?</h2><p>Your wishlist is looking a bit short. Explore thousands of listings and save your favorites to get price drop alerts.</p><div><Link href="/market">Explore marketplace <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" /></Link><button type="button">Set up alerts</button></div>
        </section>

        <section className="wishlist-recently-viewed" aria-labelledby="recently-viewed-title">
          <h2 id="recently-viewed-title">Recently viewed</h2><div>{recentlyViewed.map((item) => <article key={item.title}><div><img src={item.image} alt="" /><button type="button" aria-label={`Save ${item.title}`}><i className="fa-regular fa-heart" aria-hidden="true" /></button></div><h3>{item.title}</h3><span>{item.price}</span></article>)}</div>
        </section>
      </div>
    </main>
  );
}
