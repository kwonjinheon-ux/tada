"use client";

import { NZ_MAIN_LOCATIONS, getSubLocations, type MainLocation } from "@/data/nzLocations";
import { SelectMenu } from "@/components/ui/SelectMenu";

type DraftLocation = { mainLocation: MainLocation | ""; subLocation: string; locality: string | null; rawSuburb: string | null; region: string | null; latitude: number | null; longitude: number | null };

export function ListingLocationSelector({ value, onChange }: { value: DraftLocation; onChange: (location: DraftLocation) => void }) {
  const subLocations = value.mainLocation ? getSubLocations(value.mainLocation) : [];
  const visibleSubLocations = value.subLocation && !subLocations.includes(value.subLocation) ? [...subLocations, value.subLocation] : subLocations;
  const selectMainLocation = (mainLocation: MainLocation | "") => onChange({ mainLocation, subLocation: "", locality: null, rawSuburb: null, region: null, latitude: null, longitude: null });
  const selectSubLocation = (subLocation: string) => onChange({ ...value, subLocation, locality: null, rawSuburb: null, region: null, latitude: null, longitude: null });

  return <fieldset className="listing-location-selector">
    <div className="post-form-grid listing-location-fields">
      <SelectMenu id="listing-main-location" name="main_location" label="Main Location" placeholder="Select main location" options={NZ_MAIN_LOCATIONS.map((location) => ({ label: location, value: location }))} value={value.mainLocation} onChange={(nextLocation) => selectMainLocation(nextLocation as MainLocation | "")} />
      <SelectMenu id="listing-sub-location" name="sub_location" label="Sub Location" placeholder="Select sub location" options={visibleSubLocations.map((location) => ({ label: location, value: location }))} value={value.subLocation} disabled={!value.mainLocation} onChange={selectSubLocation} />
    </div>
  </fieldset>;
}
