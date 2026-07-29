import { redirect } from "next/navigation";
import { ModerationQueue } from "@/components/market/ModerationQueue";
import { isMarketModerator } from "@/lib/market/safety";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ModerationPage() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/market");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !await isMarketModerator(supabase)) redirect("/market");
  return <main className="marketplace-page moderation-page"><ModerationQueue /></main>;
}
