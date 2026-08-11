import { permanentRedirect } from "next/navigation";

export default async function EditBargainSaleItemPage({ params }: { params: Promise<{ listingId: string; itemId: string }> }) {
  const { listingId, itemId } = await params;
  permanentRedirect(`/market/${listingId}/items/${itemId}/edit`);
}
