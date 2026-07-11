"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/lib/auth";

export function LogoutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logout = async () => {
    setIsLoading(true);
    setError(null);
    const result = await signOut();
    setIsLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    router.push("/login");
    router.refresh();
  };

  return (
    <div className="account-actions">
      <button className="nav-post" type="button" onClick={logout} disabled={isLoading}>
        {isLoading ? "Signing out..." : "Logout"}
      </button>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </div>
  );
}

