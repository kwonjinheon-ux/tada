"use client";
import Script from "next/script";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { AdPlacement, PublicAd } from "@/lib/advertising/types";

function sessionId() { const key = "tada-ad-session"; const current = sessionStorage.getItem(key); if (current) return current; const next = crypto.randomUUID(); sessionStorage.setItem(key, next); return next; }
export function AdSlot({ placement }: { placement: AdPlacement }) {
  const [ad, setAd] = useState<PublicAd | null>(null); const ref = useRef<HTMLDivElement>(null);
  const device = typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches ? "mobile" : "desktop";
  useEffect(() => { void fetch(`/api/ads/slot?placement=${placement}&device=${device}`).then((response) => response.ok ? response.json() : null).then((payload) => setAd(payload?.data?.ad ?? null)); }, [device, placement]);
  useEffect(() => { if (!ad || !ref.current) return; let timer: number | null = null; const observer = new IntersectionObserver(([entry]) => { if (!entry?.isIntersecting) { if (timer) window.clearTimeout(timer); return; } timer = window.setTimeout(() => void fetch("/api/ads/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ adId: ad.id, eventType: "impression", placement, deviceType: device, pagePath: location.pathname, sessionId: sessionId() }) }), 1000); }, { threshold: .5 }); observer.observe(ref.current); return () => { observer.disconnect(); if (timer) window.clearTimeout(timer); }; }, [ad, device, placement]);
  if (!ad || (placement === "market_sidebar" && device === "mobile")) return null;
  if (ad.provider === "adsense") return <div ref={ref} className="ad-slot ad-slot-adsense"><span>Advertisement</span><Script id="tada-adsense" async strategy="afterInteractive" src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ad.adsenseClientId}`} crossOrigin="anonymous" /><ins className="adsbygoogle" style={{ display: "block" }} data-ad-client={ad.adsenseClientId ?? undefined} data-ad-slot={ad.adsenseSlotId ?? undefined} data-ad-format={ad.adsenseFormat ?? "auto"} data-full-width-responsive="true" /></div>;
  const image = device === "mobile" ? ad.mobileImageUrl ?? (ad.allowResponsiveFallback ? ad.desktopImageUrl : null) : ad.desktopImageUrl; if (!image || !ad.destinationUrl) return null;
  return <div ref={ref} className="ad-slot ad-slot-sponsor"><a href={ad.destinationUrl} target={ad.openInNewTab ? "_blank" : undefined} rel="sponsored noopener noreferrer" onClick={() => void fetch("/api/ads/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ adId: ad.id, eventType: "click", placement, deviceType: device, pagePath: location.pathname, sessionId: sessionId() }) })}><Image src={image} alt={ad.altText ?? ad.name} width={970} height={100} sizes="(max-width: 767px) 100vw, min(100vw, 970px)" /></a></div>;
}
