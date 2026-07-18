import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SellerRow = {
  id: string;
  display_name: string | null;
  avatar_path: string | null;
  rating_average?: number | string;
  rating_count?: number;
};

export default async function SellerProfilePage({ params }: { params: Promise<{ sellerId: string }> }) {
  const { sellerId } = await params;
  const supabase = await createServerSupabaseClient();
  if (!supabase) notFound();

  const { data: sellerData } = await supabase
    .from("market_seller_profiles")
    .select("id,display_name,avatar_path,rating_average,rating_count")
    .eq("id", sellerId)
    .maybeSingle();
  const { data: profileData } = sellerData
    ? { data: null }
    : await supabase.from("profiles").select("id,display_name,avatar_path").eq("id", sellerId).maybeSingle();
  const seller = (sellerData ?? profileData) as SellerRow | null;
  if (!seller) notFound();

  const { count: listingCount } = await supabase
    .from("market_listings")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", seller.id)
    .eq("status", "published");
  const { data: signedAvatar } = seller.avatar_path
    ? await supabase.storage.from("profile-avatars").createSignedUrl(seller.avatar_path, 3600)
    : { data: null };
  const ratingCount = seller.rating_count ?? 0;
  const ratingAverage = Number(seller.rating_average ?? 0);
  const displayName = seller.display_name || "Tada seller";

  return (
    <main className="listing-detail-page seller-public-profile">
      <Link className="listing-detail-back" href="/market"><i className="fa-solid fa-arrow-left" aria-hidden="true" />Back to listings</Link>
      <section className="seller-public-profile-card" aria-labelledby="seller-profile-name">
        {signedAvatar?.signedUrl ? <img src={signedAvatar.signedUrl} alt={`${displayName} profile`} /> : <span>{displayName.charAt(0).toUpperCase()}</span>}
        <div>
          <p>Seller profile</p>
          <h1 id="seller-profile-name">{displayName}</h1>
          <strong><i className="fa-solid fa-star" aria-hidden="true" /> {ratingCount ? `${ratingAverage.toFixed(1)} rating (${ratingCount})` : "No ratings yet"}</strong>
          <small>{listingCount ?? 0} active listings</small>
        </div>
      </section>
    </main>
  );
}
