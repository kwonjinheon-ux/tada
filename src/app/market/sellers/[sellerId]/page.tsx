import { notFound } from "next/navigation";
import { SellerProfileCard } from "@/components/market/SellerProfileCard";
import { SellerReviews } from "@/components/market/SellerReviews";
import { SELLER_REVIEWS_PER_PAGE, sellerReviewSorts, type SellerReview, type SellerReviewSort } from "@/lib/market/seller-reviews";
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

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function readSort(value: string | string[] | undefined): SellerReviewSort {
  const sort = readParam(value);
  return sellerReviewSorts.includes(sort as SellerReviewSort) ? sort as SellerReviewSort : "newest";
}

export default async function SellerProfilePage({ params, searchParams }: {
  params: Promise<{ sellerId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ sellerId }, query] = await Promise.all([params, searchParams]);
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

  const sort = readSort(query.sort);
  const requestedPage = Number(readParam(query.page));

  const [{ count: listingCount }, { count: reviewTotal }] = await Promise.all([
    supabase.from("market_listings").select("id", { count: "exact", head: true }).eq("owner_id", seller.id).eq("status", "published"),
    supabase.from("market_seller_ratings").select("id", { count: "exact", head: true }).eq("seller_id", seller.id),
  ]);

  // Resolving the total first keeps a hand-edited ?page= from landing on an
  // empty list once the page count shrinks.
  const total = reviewTotal ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / SELLER_REVIEWS_PER_PAGE));
  const page = Math.min(Math.max(Number.isInteger(requestedPage) ? requestedPage : 1, 1), pageCount);
  const from = (page - 1) * SELLER_REVIEWS_PER_PAGE;

  const baseQuery = supabase
    .from("market_seller_ratings")
    .select("id,score,comment,created_at,rater_id")
    .eq("seller_id", seller.id);
  const sortedQuery = sort === "newest"
    ? baseQuery.order("created_at", { ascending: false })
    : baseQuery.order("score", { ascending: sort === "lowest" }).order("created_at", { ascending: false });
  const { data: reviewsData } = await sortedQuery.range(from, from + SELLER_REVIEWS_PER_PAGE - 1);

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

  return (
    <main className="listing-detail-page seller-public-profile">
      <SellerProfileCard seller={{
        name: seller.display_name || "Tada seller",
        avatarUrl: signedAvatar,
        ratingAverage: Number(seller.rating_average ?? 0),
        ratingCount: seller.rating_count ?? 0,
        listingCount: listingCount ?? 0,
      }} />
      <SellerReviews sellerId={seller.id} reviews={reviews} total={total} page={page} pageCount={pageCount} sort={sort} />
    </main>
  );
}
