import { notFound, redirect } from "next/navigation";
import { EditListingClient } from "@/components/market/EditListingClient";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function EditListingPage({ params }: { params: Promise<{ listingId: string }> }) {
  const supabase = await createServerSupabaseClient();
  const { listingId } = await params;
  if (!supabase) notFound();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirectTo=${encodeURIComponent(`/market/${listingId}/edit`)}`);
  const { data: listing } = await supabase
    .from("market_listings")
    .select("id,title,description,price_cents,item_condition,trade_method")
    .eq("id", listingId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!listing) notFound();
  return <EditListingClient listing={{ id: listing.id, title: listing.title, description: listing.description, priceCents: listing.price_cents, itemCondition: listing.item_condition, tradeMethod: listing.trade_method }} />;
}
