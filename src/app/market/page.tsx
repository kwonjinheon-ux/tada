import { MarketPageClient } from "@/components/market/MarketPageClient";
import type { Listing } from "@/data/listings";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = { title: "Market" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

type ContentPostPhotoRow = {
  post_id: string;
  storage_path: string | null;
  original_name: string | null;
  is_primary: boolean;
  display_order: number;
};

type ContentPostRow = {
  id: string;
  title: string;
  region_city: string | null;
  region_suburb: string | null;
  created_at: string;
  payload: {
    price?: string | null;
  } | null;
};

function formatPrice(value: string | null | undefined) {
  if (!value) return "$0";
  const parsed = Number(value.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(parsed) || parsed <= 0) return "$0";
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD",
    maximumFractionDigits: parsed % 1 === 0 ? 0 : 2,
  }).format(parsed);
}

function formatLocation(city: string | null, suburb: string | null) {
  const parts = [suburb, city].filter(Boolean);
  return parts.length ? parts.join(", ") : "New Zealand";
}

async function getPostedListings(): Promise<Listing[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("content_posts")
    .select("id,title,region_city,region_suburb,created_at,payload")
    .eq("status", "published")
    .eq("post_type", "listing")
    .in("service_key", ["general", "market"])
    .order("created_at", { ascending: false })
    .limit(48);

  if (error || !data) return [];
  const posts = data as ContentPostRow[];
  const postIds = posts.map((post) => post.id);
  let photosByPostId = new Map<string, ContentPostPhotoRow[]>();

  if (postIds.length) {
    const { data: photoRows } = await supabase
      .from("content_post_photos")
      .select("post_id,storage_path,original_name,is_primary,display_order")
      .in("post_id", postIds)
      .order("display_order", { ascending: true });

    photosByPostId = (photoRows as ContentPostPhotoRow[] | null ?? []).reduce((map, photo) => {
      const currentPhotos = map.get(photo.post_id) ?? [];
      currentPhotos.push(photo);
      map.set(photo.post_id, currentPhotos);
      return map;
    }, new Map<string, ContentPostPhotoRow[]>());
  }

  const listings = await Promise.all(
    posts.map(async (post) => {
      const photo = [...(photosByPostId.get(post.id) ?? [])].sort((a, b) => {
        if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
        return a.display_order - b.display_order;
      })[0];

      let image = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=700&q=80";
      if (photo?.storage_path) {
        const { data: signed } = await supabase.storage.from("listing-images").createSignedUrl(photo.storage_path, 3600);
        image = signed?.signedUrl ?? image;
      }

      return {
        id: post.id,
        title: post.title,
        price: formatPrice(post.payload?.price),
        location: formatLocation(post.region_city, post.region_suburb),
        image,
        imageAlt: photo?.original_name ?? post.title,
        badge: "Newly Listed",
        status: "available",
      } satisfies Listing;
    }),
  );

  return listings;
}

export default async function MarketRoute() {
  const postedListings = await getPostedListings();
  return <MarketPageClient postedListings={postedListings} />;
}
