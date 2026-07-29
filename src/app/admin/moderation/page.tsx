import { redirect } from "next/navigation";
import { ModerationQueue } from "@/components/admin/ModerationQueue";
import { isMarketModerator } from "@/lib/market/safety";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ModerationPage() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !await isMarketModerator(supabase)) redirect("/");
  return <main className="marketplace-page moderation-page"><ModerationQueue /></main>;
}
