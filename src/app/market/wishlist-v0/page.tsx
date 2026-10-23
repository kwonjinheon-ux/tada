import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth-server";
import MarketWishlistPage from "../wishlist/page";

export const metadata = { title: "Wishlist V0 | Tada" };

export default async function WishlistV0Page() {
  if (!await getServerUser()) redirect("/login?redirectTo=%2Fmarket%2Fwishlist-v0");
  return <MarketWishlistPage searchParams={Promise.resolve({})} />;
}
