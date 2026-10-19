"use client";
import Script from "next/script";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { AdPlacement, PublicAd } from "@/lib/advertising/types";

function sessionId() { const key = "tada-ad-session"; const current = sessionStorage.getItem(key); if (current) return current; const next = crypto.randomUUID(); sessionStorage.setItem(key, next); return next; }

/** Impressions and clicks are telemetry: they must never reach the user as an
 *  error. sendBeacon survives the navigation a click starts, which plain fetch
 *  does not — that unload race is what surfaced as "Failed to fetch". */
function reportAdEvent(body: Record<string, unknown>) {
  const payload = JSON.stringify(body);
  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function"
      && navigator.sendBeacon("/api/ads/events", new Blob([payload], { type: "application/json" }))) return;
    void fetch("/api/ads/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true }).catch(() => {});
  } catch { /* an ad beacon is never worth breaking the page for */ }
}

const AD_REQUEST_TTL_MS = 60_000;
const adRequests = new Map<string, { request: Promise<PublicAd | null>; startedAt: number }>();

/** One request per placement and device, however many slots ask for it.
 *  A feed page mounts the same slot every dozen cards, and each copy used to
 *  ask the server the same question on its own — a market page sent seven
 *  requests for two answers. Kept briefly so a later page still gets a fresh
 *  selection rather than the one chosen on arrival. */
function requestAd(placement: AdPlacement, device: "desktop" | "mobile") {
  const key = `${placement}|${device}`;
  const cached = adRequests.get(key);
  if (cached && Date.now() - cached.startedAt < AD_REQUEST_TTL_MS) return cached.request;

  const request = fetch(`/api/ads/slot?placement=${placement}&device=${device}`)
    .then((response) => (response.ok ? response.json() : null))
    .then((payload) => (payload?.data?.ad ?? null) as PublicAd | null)
    // Any failure just means no ad, which is the same outcome as an empty slot.
    .catch(() => null);
  adRequests.set(key, { request, startedAt: Date.now() });
  return request;
}

export function AdSlot({ placement }: { placement: AdPlacement }) {
  const [ad, setAd] = useState<PublicAd | null>(null); const ref = useRef<HTMLDivElement>(null);
  const device = typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches ? "mobile" : "desktop";
  // The request is shared, so it cannot be aborted on unmount — a slot that has
  // gone simply stops listening for the answer.
  useEffect(() => {
    let isMounted = true;
    void requestAd(placement, device).then((next) => { if (isMounted) setAd(next); });
    return () => { isMounted = false; };
  }, [device, placement]);
  useEffect(() => { if (!ad || !ref.current) return; let timer: number | null = null; const observer = new IntersectionObserver(([entry]) => { if (!entry?.isIntersecting) { if (timer) window.clearTimeout(timer); return; } timer = window.setTimeout(() => reportAdEvent({ adId: ad.id, eventType: "impression", placement, deviceType: device, pagePath: location.pathname, sessionId: sessionId() }), 1000); }, { threshold: .5 }); observer.observe(ref.current); return () => { observer.disconnect(); if (timer) window.clearTimeout(timer); }; }, [ad, device, placement]);
  if (!ad || (placement === "market_sidebar" && device === "mobile")) return null;
  if (ad.provider === "adsense") return <div ref={ref} className="ad-slot ad-slot-adsense"><span>Advertisement</span><Script id="tada-adsense" async strategy="afterInteractive" src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ad.adsenseClientId}`} crossOrigin="anonymous" /><ins className="adsbygoogle" style={{ display: "block" }} data-ad-client={ad.adsenseClientId ?? undefined} data-ad-slot={ad.adsenseSlotId ?? undefined} data-ad-format={ad.adsenseFormat ?? "auto"} data-full-width-responsive="true" /></div>;
  const image = device === "mobile" ? ad.mobileImageUrl ?? (ad.allowResponsiveFallback ? ad.desktopImageUrl : null) : ad.desktopImageUrl; if (!image || !ad.destinationUrl) return null;
  return <div ref={ref} className="ad-slot ad-slot-sponsor"><a href={ad.destinationUrl} target={ad.openInNewTab ? "_blank" : undefined} rel="sponsored noopener noreferrer" onClick={() => reportAdEvent({ adId: ad.id, eventType: "click", placement, deviceType: device, pagePath: location.pathname, sessionId: sessionId() })}><Image src={image} alt={ad.altText ?? ad.name} width={970} height={100} sizes="(max-width: 767px) 100vw, min(100vw, 970px)" /></a></div>;
}
