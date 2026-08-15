"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SaveHeartBurst, createHeartParticles, saveFeedbackClasses, type HeartParticle } from "@/components/SaveHeartBurst";
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
  const [isPopping, setIsPopping] = useState(false);
  const [heartParticles, setHeartParticles] = useState<HeartParticle[]>([]);
  const burstTimer = useRef<number | null>(null);
  const popTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (burstTimer.current) window.clearTimeout(burstTimer.current);
    if (popTimer.current) window.clearTimeout(popTimer.current);
  }, []);

  const toggleSaved = async () => {
    if (isSaving) return;
    const nextSaved = !isSaved;
    setIsSaved(nextSaved);
    setIsPopping(false);
    setHeartParticles(createHeartParticles());
    window.requestAnimationFrame(() => setIsPopping(true));
    if (burstTimer.current) window.clearTimeout(burstTimer.current);
    if (popTimer.current) window.clearTimeout(popTimer.current);
    popTimer.current = window.setTimeout(() => setIsPopping(false), 440);
    burstTimer.current = window.setTimeout(() => setHeartParticles([]), 1_050);
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

  return <button className={`community-post-save ${saveFeedbackClasses.root} ${isSaved ? saveFeedbackClasses.saved : ""} ${isPopping ? saveFeedbackClasses.popping : ""} ${className}`.trim()} type="button" aria-label={isSaved ? "Remove from saved posts" : "Save post"} aria-pressed={isSaved} disabled={isSaving} onClick={() => void toggleSaved()} onAnimationEnd={(event) => { if (event.currentTarget === event.target) setIsPopping(false); }}>
    <i className={`${isSaved ? "fa-solid" : "fa-regular"} fa-heart`} aria-hidden="true" />
    <SaveHeartBurst particles={heartParticles} />
  </button>;
}
