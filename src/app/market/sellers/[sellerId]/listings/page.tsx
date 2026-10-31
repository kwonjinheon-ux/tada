import { notFound } from "next/navigation";
import { SellerListings } from "@/components/market/SellerListings";
import { loadSellerListings } from "@/lib/market/listing-cards";
import { getServerUser } from "@/lib/auth-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSignedStorageImage } from "@/lib/supabase/storage-image";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SellerRow = { id: string; display_name: string | null; avatar_path: string | null };

/** What one member has on sale right now — where "View other listings" in the
 *  seller menu lands. */
export default async function SellerListingsPage({ params }: { params: Promise<{ sellerId: string }> }) {
  const { sellerId } = await params;
  const supabase = await createServerSupabaseClient();
  if (!supabase) notFound();

  const { data: sellerData } = await supabase.from("market_seller_profiles").select("id,display_name,avatar_path").eq("id", sellerId).maybeSingle();
  const { data: profileData } = sellerData ? { data: null } : await supabase.from("public_member_profiles").select("id,display_name,avatar_path").eq("id", sellerId).maybeSingle();
  const seller = (sellerData ?? profileData) as SellerRow | null;
  if (!seller) notFound();

  const [viewer, avatarUrl, listings] = await Promise.all([
    getServerUser(),
    seller.avatar_path ? getSignedStorageImage("profile-avatars", seller.avatar_path, "avatar") : Promise.resolve(null),
    loadSellerListings(supabase, seller.id),
  ]);
  const { data: savedRows } = viewer && listings.length
    ? await supabase.from("market_wishlist").select("listing_id").eq("user_id", viewer.id).in("listing_id", listings.map(({ id }) => id))
    : { data: [] };

  return <SellerListings
    seller={{ id: seller.id, name: seller.display_name || "Tada seller", avatarUrl }}
    listings={listings}
    savedListingIds={(savedRows ?? []).map(({ listing_id }) => listing_id)}
    isOwner={viewer?.id === seller.id}
  />;
}
