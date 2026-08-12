"use client";

import { ListingComments } from "@/components/market/ListingComments";

/** Reuses the full threaded discussion UI for expanded community feed posts. */
export function CommunityPostComments({ postId }: { postId: string }) {
  return <ListingComments listingId={postId} space="community" />;
}
