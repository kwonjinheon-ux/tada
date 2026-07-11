import { LoginForm } from "@/components/auth/AuthForms";

export const metadata = { title: "Login" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { redirectTo } = await searchParams;
  return <LoginForm redirectTo={redirectTo} />;
}
