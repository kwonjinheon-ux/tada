import { Suspense } from "react";
import { CommunityPageClient } from "@/components/community/CommunityPageClient";
import { CommunityPostListSkeleton } from "@/components/community/CommunityPostListSkeleton";

export const metadata = { title: "Community" };

export default function CommunityPage() {
  return <Suspense fallback={<CommunityPostListSkeleton />}><CommunityPageClient /></Suspense>;
}
