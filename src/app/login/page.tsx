import { LoginForm } from "@/components/auth/AuthForms";

export const metadata = { title: "Login" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string; registered?: string }>;
}) {
  const { redirectTo, registered } = await searchParams;
  return <LoginForm redirectTo={redirectTo} registered={registered === "1"} />;
}
