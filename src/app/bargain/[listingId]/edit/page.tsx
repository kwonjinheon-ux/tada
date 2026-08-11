import { permanentRedirect } from "next/navigation";

export default async function EditBargainListingPage({ params }: { params: Promise<{ listingId: string }> }) {
  const { listingId } = await params;
  permanentRedirect(`/market/${listingId}/edit`);
}
