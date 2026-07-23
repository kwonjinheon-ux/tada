import { redirect } from "next/navigation";

export const metadata = { title: "My Dashboard" };

export default async function AccountPage() {
  redirect("/market/dashboard");
}
