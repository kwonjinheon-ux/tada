import { Suspense } from "react";
import { CommunityPageClient } from "@/components/community/CommunityPageClient";

export const metadata = { title: "Community" };

export default function CommunityPage() {
  return <Suspense fallback={null}><CommunityPageClient /></Suspense>;
}
