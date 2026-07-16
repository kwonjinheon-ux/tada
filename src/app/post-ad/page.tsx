import { redirect } from "next/navigation";

export default function LegacyPostAdRoute() {
  redirect("/market/create");
}
