import { PostAdPageClient } from "@/components/post-ad/PostAdPageClient";

export const metadata = { title: "Create bargain listing | Tada" };

export default function BargainCreatePage() {
  return <PostAdPageClient listingSpace="bargain" />;
}
