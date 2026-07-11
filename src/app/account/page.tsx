import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { getServerUser } from "@/lib/auth-server";

export const metadata = { title: "Account" };

export default async function AccountPage() {
  const user = await getServerUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="page-shell account-page">
      <section className="account-card">
        <p className="account-eyebrow">Protected page</p>
        <h1>Account</h1>
        <p>You are signed in as {user.email}.</p>
        <LogoutButton />
      </section>
    </main>
  );
}
