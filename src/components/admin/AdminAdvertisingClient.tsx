"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { AdPlacementPreview } from "@/components/advertising/AdPlacementPreview";
import { AD_PLACEMENTS, AD_PLACEMENT_GUIDANCE, type AdPlacement, type AdProvider } from "@/lib/advertising/types";

export type AdminAd = {
  id: string;
  name: string;
  provider: AdProvider;
  placement: AdPlacement;
  isActive: boolean;
  priority: number;
  startsAt: string | null;
  endsAt: string | null;
};

const placementLabels: Record<AdPlacement, string> = {
  market_top: "Marketplace top",
  market_feed: "Marketplace feed",
  market_sidebar: "Marketplace sidebar",
  search_feed: "Search results feed",
  product_detail_middle: "Listing detail middle",
  product_detail_bottom: "Listing detail bottom",
};

const sponsorDurations = [
  ["3 days", 3], ["5 days", 5], ["7 days", 7], ["10 days", 10], ["15 days", 15], ["30 days", 30],
  ["3 months", 90], ["6 months", 180], ["9 months", 270], ["12 months", 365],
] as const;

const emptyForm = (placement: AdPlacement) => ({
  provider: "sponsor" as AdProvider,
  name: "",
  sponsorName: "",
  placement,
  desktopImageUrl: "",
  mobileImageUrl: "",
  destinationUrl: "",
  altText: "",
  adsenseClientId: "",
  adsenseSlotId: "",
  showOnMobile: false,
  allowResponsiveFallback: true,
});

export function AdminAdvertisingClient({ initialAds }: { initialAds: AdminAd[] }) {
  const router = useRouter();
  const [selectedPlacement, setSelectedPlacement] = useState<AdPlacement | null>(null);
  const [form, setForm] = useState(emptyForm("market_top"));
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [desktopAssetFile, setDesktopAssetFile] = useState<File | null>(null);
  const [mobileAssetFile, setMobileAssetFile] = useState<File | null>(null);
  const [durationDays, setDurationDays] = useState(7);

  const openCreate = (placement: AdPlacement) => {
    setForm(emptyForm(placement));
    setDesktopAssetFile(null);
    setMobileAssetFile(null);
    setDurationDays(7);
    setError(null);
    setSelectedPlacement(placement);
  };

  const closeCreate = () => {
    if (!isSaving) setSelectedPlacement(null);
  };

  const saveAd = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    const uploadAsset = async (file: File, variant: "desktop" | "mobile") => {
      const upload = new FormData();
      upload.append("file", file);
      upload.append("variant", variant);
      const response = await fetch("/api/admin/advertising/assets", { method: "POST", body: upload });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.data?.url) throw new Error(result?.error?.message ?? "Unable to upload the advertising image.");
      return result.data.url as string;
    };

    try {
      const desktopImageUrl = form.provider === "sponsor" && desktopAssetFile ? await uploadAsset(desktopAssetFile, "desktop") : form.desktopImageUrl;
      const mobileImageUrl = form.provider === "sponsor" && mobileAssetFile ? await uploadAsset(mobileAssetFile, "mobile") : form.mobileImageUrl;
      const startsAt = form.provider === "sponsor" ? new Date() : null;
      const endsAt = startsAt ? new Date(startsAt.getTime() + durationDays * 86_400_000) : null;
      const payload = {
      provider: form.provider,
      name: form.name,
      sponsorName: form.provider === "sponsor" ? form.sponsorName : null,
      campaignName: null,
      placement: form.placement,
      priority: 0,
      frequencyLevel: 1,
      adsenseClientId: form.provider === "adsense" ? form.adsenseClientId : null,
      adsenseSlotId: form.provider === "adsense" ? form.adsenseSlotId : null,
      adsenseFormat: "auto",
      desktopImageUrl: form.provider === "sponsor" ? desktopImageUrl : null,
      mobileImageUrl: form.provider === "sponsor" && form.showOnMobile ? mobileImageUrl || null : null,
      destinationUrl: form.provider === "sponsor" ? form.destinationUrl : null,
      altText: form.provider === "sponsor" ? form.altText : null,
      showOnDesktop: true,
      showOnMobile: form.provider === "sponsor" ? form.showOnMobile : true,
      allowResponsiveFallback: form.provider === "sponsor" ? form.allowResponsiveFallback : false,
      openInNewTab: true,
      dailyImpressionCap: null,
      totalImpressionCap: null,
      startsAt: startsAt?.toISOString() ?? null,
      endsAt: endsAt?.toISOString() ?? null,
      isActive: true,
      adminNotes: null,
      };
      const response = await fetch("/api/admin/advertising", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error?.message ?? "Unable to create this ad. Check the required fields and try again.");
      setSelectedPlacement(null);
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to create this ad. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteAd = async (id: string) => {
    setIsDeleting(id);
    const response = await fetch(`/api/admin/advertising/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setError("Unable to remove this ad. Please try again.");
      setIsDeleting(null);
      return;
    }
    setIsDeleting(null);
    router.refresh();
  };

  return <>
    <section className="admin-advertising-overview" aria-label="Advertising placement setup">
      <div className="admin-advertising-intro"><div><span className="admin-advertising-eyebrow">Start here</span><h2>Choose where an ad should appear</h2><p>Each placement has its own recommended asset size. Add a sponsor creative or connect an approved AdSense slot.</p></div><Button className="admin-advertising-create" onClick={() => openCreate("market_top")}><i className="fa-solid fa-plus" aria-hidden="true" /> Create ad</Button></div>
      <div className="admin-advertising-placement-grid">{AD_PLACEMENTS.map((placement) => {
        const ads = initialAds.filter((ad) => ad.placement === placement);
        const guidance = AD_PLACEMENT_GUIDANCE[placement];
        const isSelected = selectedPlacement === placement;
        return <div className="admin-advertising-placement-group" key={placement}><article className={`admin-advertising-placement${isSelected ? " is-selected" : ""}`}><div className="admin-advertising-placement-heading"><i className="fa-solid fa-rectangle-ad" aria-hidden="true" /><div><h3>{placementLabels[placement]}</h3><span>{ads.filter((ad) => ad.isActive).length} active · {ads.length} total</span></div></div><AdPlacementPreview placement={placement} /><dl><div><dt>Desktop</dt><dd>{guidance.desktop}</dd></div><div><dt>Mobile</dt><dd>{guidance.mobile}</dd></div></dl><Button variant="secondary" className="admin-advertising-placement-action" onClick={() => openCreate(placement)} aria-expanded={isSelected} aria-controls={`advertising-create-form-${placement}`}>{isSelected ? "Creating here" : "Add to placement"}</Button></article><div id={`advertising-create-form-${placement}`} className="admin-advertising-inline-form-mount" /></div>;
      })}</div>
    </section>

    <section className="admin-advertising-campaigns" aria-labelledby="advertising-campaigns-title"><div className="admin-advertising-section-heading"><div><span className="admin-advertising-eyebrow">Campaigns</span><h2 id="advertising-campaigns-title">Your advertising</h2></div><span>{initialAds.length} total</span></div>{initialAds.length ? <div className="admin-advertising-campaign-list">{initialAds.map((ad) => <article key={ad.id}><div className={`admin-advertising-provider ${ad.provider}`}><i className={`fa-solid ${ad.provider === "adsense" ? "fa-chart-line" : "fa-handshake"}`} aria-hidden="true" /></div><div><strong>{ad.name}</strong><span>{placementLabels[ad.placement]} · Priority {ad.priority}</span></div><span className={`admin-advertising-status ${ad.isActive ? "is-active" : ""}`}>{ad.isActive ? "Active" : "Disabled"}</span><button className="admin-advertising-remove" type="button" disabled={isDeleting === ad.id} onClick={() => void deleteAd(ad.id)} aria-label={`Remove ${ad.name}`}>{isDeleting === ad.id ? "Removing…" : <><i className="fa-solid fa-trash" aria-hidden="true" /> Remove</>}</button></article>)}</div> : <div className="admin-advertising-empty"><i className="fa-solid fa-rectangle-ad" aria-hidden="true" /><h2>No ads yet</h2><p>Create your first ad from a placement above. It will only start showing after its required details are complete.</p><Button onClick={() => openCreate("market_top")}><i className="fa-solid fa-plus" aria-hidden="true" /> Create your first ad</Button></div>}</section>

    {selectedPlacement && typeof document !== "undefined" ? createPortal(
        <section className="admin-advertising-dialog admin-advertising-inline-form" aria-label="Create advertising campaign">
        <form onSubmit={saveAd}>
          <header><div><span className="admin-advertising-eyebrow">New campaign</span><h2>Create an ad</h2><p>{placementLabels[form.placement]}</p></div><button type="button" className="admin-advertising-close" aria-label="Close create ad dialog" onClick={closeCreate} disabled={isSaving}><i className="fa-solid fa-xmark" /></button></header>
          <div className="admin-advertising-provider-choice"><button type="button" className={form.provider === "sponsor" ? "is-selected" : ""} onClick={() => setForm((current) => ({ ...current, provider: "sponsor" }))}><i className="fa-solid fa-handshake" aria-hidden="true" /> Sponsor creative <small>Image and destination</small></button><button type="button" className={form.provider === "adsense" ? "is-selected" : ""} onClick={() => setForm((current) => ({ ...current, provider: "adsense" }))}><i className="fa-solid fa-chart-line" aria-hidden="true" /> Google AdSense <small>Client and slot IDs</small></button></div>
          <label className="admin-advertising-field"><span>Internal name</span><input required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="e.g. August homepage sponsor" /></label>
          <label className="admin-advertising-field"><span>Placement</span><select value={form.placement} onChange={(event) => setForm((current) => ({ ...current, placement: event.target.value as AdPlacement }))}>{AD_PLACEMENTS.map((placement) => <option value={placement} key={placement}>{placementLabels[placement]}</option>)}</select></label>
          {form.provider === "sponsor" ? <div className="admin-advertising-form-grid">
            <label className="admin-advertising-field"><span>Sponsor name</span><input required value={form.sponsorName} onChange={(event) => setForm((current) => ({ ...current, sponsorName: event.target.value }))} placeholder="Business or organisation" /></label>
            <label className="admin-advertising-field"><span>Destination URL</span><input required type="url" value={form.destinationUrl} onChange={(event) => setForm((current) => ({ ...current, destinationUrl: event.target.value }))} placeholder="https://example.com" /></label>
            <label className="admin-advertising-field is-wide"><span>Desktop image URL</span><input type="url" required={!desktopAssetFile} value={form.desktopImageUrl} onChange={(event) => setForm((current) => ({ ...current, desktopImageUrl: event.target.value }))} placeholder="https://…/desktop-banner.jpg" /><small className="admin-advertising-field-hint">Use an HTTPS image URL, or attach an image below.</small></label>
            <label className="admin-advertising-field is-wide"><span>Desktop image file</span><input className="admin-advertising-file-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setDesktopAssetFile(event.target.files?.[0] ?? null)} /><small className="admin-advertising-field-hint">JPEG, PNG or WebP up to 5 MB{desktopAssetFile ? ` · ${desktopAssetFile.name}` : ""}</small></label>
            <label className="admin-advertising-field"><span>Advertising duration</span><select value={durationDays} onChange={(event) => setDurationDays(Number(event.target.value))}>{sponsorDurations.map(([label, days]) => <option key={days} value={days}>{label}</option>)}</select><small className="admin-advertising-field-hint">The sponsor ad will end automatically after this period.</small></label>
            <label className="admin-advertising-field is-wide"><span>Accessible image description</span><input required value={form.altText} onChange={(event) => setForm((current) => ({ ...current, altText: event.target.value }))} placeholder="Describe the ad image" /></label>
            <label className="admin-advertising-check"><input type="checkbox" checked={form.showOnMobile} onChange={(event) => setForm((current) => ({ ...current, showOnMobile: event.target.checked }))} /> Show on mobile</label>
            {form.showOnMobile ? <><label className="admin-advertising-field is-wide"><span>Mobile image URL</span><input type="url" required={!mobileAssetFile && !form.allowResponsiveFallback} value={form.mobileImageUrl} onChange={(event) => setForm((current) => ({ ...current, mobileImageUrl: event.target.value }))} placeholder="https://…/mobile-banner.jpg" /></label><label className="admin-advertising-field is-wide"><span>Mobile image file</span><input className="admin-advertising-file-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setMobileAssetFile(event.target.files?.[0] ?? null)} /><small className="admin-advertising-field-hint">Optional when the desktop image is used as the mobile fallback{mobileAssetFile ? ` · ${mobileAssetFile.name}` : ""}</small></label><label className="admin-advertising-check"><input type="checkbox" checked={form.allowResponsiveFallback} onChange={(event) => setForm((current) => ({ ...current, allowResponsiveFallback: event.target.checked }))} /> Use desktop image if no mobile image is supplied</label></> : null}
          </div> : <div className="admin-advertising-form-grid"><label className="admin-advertising-field"><span>AdSense client ID</span><input required value={form.adsenseClientId} onChange={(event) => setForm((current) => ({ ...current, adsenseClientId: event.target.value }))} placeholder="ca-pub-…" /></label><label className="admin-advertising-field"><span>AdSense slot ID</span><input required value={form.adsenseSlotId} onChange={(event) => setForm((current) => ({ ...current, adsenseSlotId: event.target.value }))} placeholder="1234567890" /></label></div>}
          {error ? <p className="admin-advertising-error" role="alert">{error}</p> : null}
          <footer><Button variant="secondary" type="button" onClick={closeCreate} disabled={isSaving}>Cancel</Button><Button type="submit" disabled={isSaving}>{isSaving ? "Creating…" : "Create active ad"}</Button></footer>
        </form>
      </section>, document.getElementById(`advertising-create-form-${selectedPlacement}`)!) : null}
  </>;
}
