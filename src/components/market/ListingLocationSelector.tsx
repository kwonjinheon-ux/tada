"use client";

import { useState } from "react";
import { NZ_MAIN_LOCATIONS, getSubLocations, type LocationSelection, type MainLocation } from "@/data/nzLocations";
import { SelectMenu } from "@/components/ui/SelectMenu";

type DraftLocation = { mainLocation: MainLocation | ""; subLocation: string; locality: string | null; rawSuburb: string | null; region: string | null; latitude: number | null; longitude: number | null };

export function ListingLocationSelector({ value, onChange }: { value: DraftLocation; onChange: (location: DraftLocation) => void }) {
  const [gpsState, setGpsState] = useState<"idle" | "loading" | "error">("idle");
  const subLocations = value.mainLocation ? getSubLocations(value.mainLocation) : [];
  const visibleSubLocations = value.subLocation && !subLocations.includes(value.subLocation) ? [...subLocations, value.subLocation] : subLocations;

  const selectMainLocation = (mainLocation: MainLocation | "") => onChange({ mainLocation, subLocation: "", locality: null, rawSuburb: null, region: null, latitude: null, longitude: null });
  const selectSubLocation = (subLocation: string) => onChange({ ...value, subLocation, locality: null, rawSuburb: null, region: null, latitude: null, longitude: null });
  const useMyLocation = () => {
    if (!("geolocation" in navigator)) { setGpsState("error"); return; }
    setGpsState("loading");
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const response = await fetch(`/api/market/location/reverse?latitude=${encodeURIComponent(coords.latitude)}&longitude=${encodeURIComponent(coords.longitude)}`);
        const payload = await response.json() as { location?: LocationSelection };
        if (!response.ok || !payload.location) throw new Error("Location unavailable");
        onChange({ ...payload.location, locality: payload.location.locality ?? null, rawSuburb: payload.location.rawSuburb ?? null, region: payload.location.region ?? null, latitude: payload.location.latitude ?? null, longitude: payload.location.longitude ?? null });
        setGpsState("idle");
      } catch { setGpsState("error"); }
    }, () => setGpsState("error"), { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 });
  };
  const detectedLabel = value.latitude !== null && value.longitude !== null && value.mainLocation && value.subLocation ? [value.subLocation, value.mainLocation].join(", ") : null;

  return <fieldset className="listing-location-selector">
    <legend>Location</legend>
    <button className="listing-location-gps-button" type="button" onClick={useMyLocation} disabled={gpsState === "loading"}>
      <i className="fa-solid fa-location-crosshairs" aria-hidden="true" /> {gpsState === "loading" ? "Finding your location…" : "Use my location"}
    </button>
    {detectedLabel ? <p className="listing-location-detected"><i className="fa-solid fa-location-dot" aria-hidden="true" /> {detectedLabel}</p> : null}
    {gpsState === "error" ? <p className="listing-location-error" role="alert">We couldn’t set your location. Select it manually below.</p> : null}
    <div className="post-form-grid listing-location-fields">
      <SelectMenu id="listing-main-location" name="main_location" label="Main Location" placeholder="Select main location" options={NZ_MAIN_LOCATIONS.map((location) => ({ label: location, value: location }))} value={value.mainLocation} onChange={(nextLocation) => selectMainLocation(nextLocation as MainLocation | "")} />
      <SelectMenu id="listing-sub-location" name="sub_location" label="Sub Location" placeholder="Select sub location" options={visibleSubLocations.map((location) => ({ label: location, value: location }))} value={value.subLocation} disabled={!value.mainLocation} onChange={selectSubLocation} />
    </div>
  </fieldset>;
}
