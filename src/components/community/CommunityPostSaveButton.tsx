"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { communityWishlistResponseSchema } from "@/contracts/api";
import { readApiResponse } from "@/lib/api/client";

export function CommunityPostSaveButton({ postId, initialIsSaved = false, className = "" }: { postId: string; initialIsSaved?: boolean; className?: string }) {
  const router = useRouter();
  const [isSaved, setIsSaved] = useState(initialIsSaved);
  const [isSaving, setIsSaving] = useState(false);

  const toggleSaved = async () => {
    if (isSaving) return;
    const nextSaved = !isSaved;
    setIsSaved(nextSaved);
    setIsSaving(true);
    try {
      const response = await fetch("/api/community/wishlist", {
        method: nextSaved ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });
      if (response.status === 401) {
        router.push(`/login?redirectTo=${encodeURIComponent(`/community/${postId}`)}`);
        return;
      }
      const result = await readApiResponse(response, communityWishlistResponseSchema);
      if (result.error || result.data.saved !== nextSaved) setIsSaved(!nextSaved);
    } catch {
      setIsSaved(!nextSaved);
    } finally {
      setIsSaving(false);
    }
  };

  return <button className={`community-post-save ${isSaved ? "is-saved" : ""} ${className}`.trim()} type="button" aria-label={isSaved ? "Remove from saved posts" : "Save post"} aria-pressed={isSaved} disabled={isSaving} onClick={() => void toggleSaved()}>
    <i className={`${isSaved ? "fa-solid" : "fa-regular"} fa-heart`} aria-hidden="true" />
  </button>;
}
