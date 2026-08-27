"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { serviceWishlistResponseSchema } from "@/contracts/api";
import { readApiResponse } from "@/lib/api/client";
import { SaveHeartIcon, saveFeedbackClasses, useSaveHeartFeedback } from "@/components/SaveHeartBurst";
import { servicesText } from "@/data/services";
import { useLanguage } from "@/components/LanguageProvider";

export function ServiceSaveButton({ serviceId, provider, initialIsSaved = false }: { serviceId: string; provider: string; initialIsSaved?: boolean }) {
  const { locale } = useLanguage();
  const router = useRouter();
  const text = servicesText(locale);
  const [isSaved, setIsSaved] = useState(initialIsSaved);
  const [isSaving, setIsSaving] = useState(false);
  const { heartParticles, isPopping, play: playSaveFeedback, stopPopping } = useSaveHeartFeedback();

  const toggleSaved = async () => {
    if (isSaving) return;
    const nextSaved = !isSaved;
    setIsSaved(nextSaved);
    setIsSaving(true);
    playSaveFeedback();
    try {
      const response = await fetch("/api/services/wishlist", {
        method: nextSaved ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId }),
      });
      if (response.status === 401) {
        router.push("/login?redirectTo=" + encodeURIComponent("/services"));
        return;
      }
      const result = await readApiResponse(response, serviceWishlistResponseSchema);
      if (result.error || result.data.saved !== nextSaved) setIsSaved(!nextSaved);
    } catch {
      setIsSaved(!nextSaved);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <button
      className={["services-listing-save", saveFeedbackClasses.root, isSaved ? saveFeedbackClasses.saved : "", isPopping ? saveFeedbackClasses.popping : ""].filter(Boolean).join(" ")}
      type="button"
      aria-label={isSaved ? text.removeSavedService(provider) : text.saveService(provider)}
      aria-pressed={isSaved}
      disabled={isSaving}
      onClick={(event) => { event.stopPropagation(); void toggleSaved(); }}
      onKeyDown={(event) => event.stopPropagation()}
      onAnimationEnd={(event) => { if (event.currentTarget === event.target) stopPopping(); }}
    >
      <SaveHeartIcon isSaved={isSaved} particles={heartParticles} />
    </button>
  );
}
