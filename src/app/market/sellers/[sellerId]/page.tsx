import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { SellerReviews, type SellerReview } from "@/components/market/SellerReviews";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSignedStorageImage } from "@/lib/supabase/storage-image";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SellerRow = {
  id: string;
  display_name: string | null;
  avatar_path: string | null;
  rating_average?: number | string;
  rating_count?: number;
};
type ReviewRow = { id: string; score: number | string; comment: string | null; created_at: string; rater_id: string };
type ReviewerRow = { id: string; display_name: string; avatar_path: string | null };

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
  const { data: reviewsData } = await supabase
    .from("market_seller_ratings")
    .select("id,score,comment,created_at,rater_id")
    .eq("seller_id", seller.id)
    .order("created_at", { ascending: false })
    .limit(20);
  const rawReviews = (reviewsData ?? []) as ReviewRow[];
  const reviewerIds = [...new Set(rawReviews.map((review) => review.rater_id))];
  const { data: reviewerData } = reviewerIds.length
    ? await supabase.from("market_comment_profiles").select("id,display_name,avatar_path").in("id", reviewerIds)
    : { data: [] };
  const reviewers = new Map(((reviewerData ?? []) as ReviewerRow[]).map((reviewer) => [reviewer.id, reviewer]));
  const reviewerAvatarUrls = new Map(await Promise.all(
    [...reviewers.values()].filter((reviewer) => reviewer.avatar_path).map(async (reviewer) => [reviewer.id, await getSignedStorageImage("profile-avatars", reviewer.avatar_path!, "avatar")] as const),
  ));
  const reviews: SellerReview[] = rawReviews.map((review) => {
    const reviewer = reviewers.get(review.rater_id);
    return { id: review.id, score: Number(review.score), comment: review.comment, createdAt: review.created_at, reviewer: { name: reviewer?.display_name || "Tada buyer", avatarUrl: reviewerAvatarUrls.get(review.rater_id) ?? null } };
  });
  const signedAvatar = seller.avatar_path
    ? await getSignedStorageImage("profile-avatars", seller.avatar_path, "avatar")
    : null;
  const ratingCount = seller.rating_count ?? 0;
  const ratingAverage = Number(seller.rating_average ?? 0);
  const displayName = seller.display_name || "Tada seller";

  return (
    <main className="listing-detail-page seller-public-profile">
      <Link className="listing-detail-back" href="/market"><i className="fa-solid fa-arrow-left" aria-hidden="true" />Back to listings</Link>
      <section className="seller-public-profile-card" aria-labelledby="seller-profile-name">
        <Avatar src={signedAvatar} name={displayName} alt={`${displayName} profile`} />
        <div>
          <p>Seller profile</p>
          <h1 id="seller-profile-name">{displayName}</h1>
          <strong><i className="fa-solid fa-star" aria-hidden="true" /> {ratingCount ? `${ratingAverage.toFixed(1)} rating (${ratingCount})` : "No ratings yet"}</strong>
          <small>{listingCount ?? 0} active listings</small>
        </div>
      </section>
      <SellerReviews reviews={reviews} />
    </main>
  );
}
