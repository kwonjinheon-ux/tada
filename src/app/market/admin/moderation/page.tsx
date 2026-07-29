import { redirect } from "next/navigation";

export default function LegacyMarketModerationPage() {
  redirect("/admin/moderation");
}
