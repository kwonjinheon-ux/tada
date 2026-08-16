"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SaveHeartIcon, saveFeedbackClasses, useSaveHeartFeedback } from "@/components/SaveHeartBurst";
import { communityWishlistResponseSchema } from "@/contracts/api";
import { readApiResponse } from "@/lib/api/client";

type CommunityPostSaveButtonProps = {
  postId: string;
  initialIsSaved?: boolean;
  className?: string;
  redirectTo?: string;
};

export function CommunityPostSaveButton({ postId, initialIsSaved = false, className = "", redirectTo }: CommunityPostSaveButtonProps) {
  const router = useRouter();
  const [isSaved, setIsSaved] = useState(initialIsSaved);
  const [isSaving, setIsSaving] = useState(false);
  const { heartParticles, isPopping, play: playSaveFeedback, stopPopping } = useSaveHeartFeedback();

  const toggleSaved = async () => {
    if (isSaving) return;
    const nextSaved = !isSaved;
    setIsSaved(nextSaved);
    playSaveFeedback();
    setIsSaving(true);
    try {
      const response = await fetch("/api/community/wishlist", {
        method: nextSaved ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });
      if (response.status === 401) {
        router.push(`/login?redirectTo=${encodeURIComponent(redirectTo ?? `/community/${postId}`)}`);
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

  return <button className={`community-post-save ${saveFeedbackClasses.root} ${isSaved ? saveFeedbackClasses.saved : ""} ${isPopping ? saveFeedbackClasses.popping : ""} ${className}`.trim()} type="button" aria-label={isSaved ? "Remove from saved posts" : "Save post"} aria-pressed={isSaved} disabled={isSaving} onClick={() => void toggleSaved()} onAnimationEnd={(event) => { if (event.currentTarget === event.target) stopPopping(); }}>
    <SaveHeartIcon isSaved={isSaved} particles={heartParticles} />
  </button>;
}
