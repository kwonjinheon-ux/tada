import { permanentRedirect } from "next/navigation";

export default async function BargainSaleDetailPage({ params }: { params: Promise<{ listingId: string }> }) {
  const { listingId } = await params;
  permanentRedirect(`/market/${listingId}`);
}
