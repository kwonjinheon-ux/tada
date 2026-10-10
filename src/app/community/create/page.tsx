import { CommunityCreateClient } from "@/components/community/CommunityCreateClient";
import { communityPostCategorySchema } from "@/contracts/api";

export const metadata = { title: "Create a post | Tada" };

export default async function CommunityCreateRoute({ searchParams }: { searchParams: Promise<{ category?: string | string[] }> }) {
  const params = await searchParams;
  const requestedCategory = communityPostCategorySchema.safeParse(params.category);
  return <CommunityCreateClient initialCategory={requestedCategory.success ? requestedCategory.data : ""} />;
}
