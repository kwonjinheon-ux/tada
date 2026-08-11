"use client";

import { SelectMenu } from "@/components/ui/SelectMenu";
import { NZ_MAIN_LOCATIONS, getSubLocations, type MainLocation } from "@/data/nzLocations";

type LocationFilterSectionProps = {
  title: string;
  mainLocation: MainLocation | "";
  subLocation: string;
  onLocationChange: (mainLocation: MainLocation | "", subLocation?: string) => void;
  idPrefix: string;
  mainLocationLabel: string;
  subLocationLabel: string;
  mainLocationPlaceholder: string;
  subLocationPlaceholder: string;
};

// Market and Community deliberately share this exact filter surface so their
// desktop sidebars and mobile drawers stay visually and behaviourally aligned.
export function LocationFilterSection({
  title,
  mainLocation,
  subLocation,
  onLocationChange,
  idPrefix,
  mainLocationLabel,
  subLocationLabel,
  mainLocationPlaceholder,
  subLocationPlaceholder,
}: LocationFilterSectionProps) {
  return (
    <section className="filter-block location-block market-filter-location-section">
      <h2>{title}</h2>
      <SelectMenu
        id={`${idPrefix}-main-location`}
        name="mainLocation"
        label={mainLocationLabel}
        icon="fa-location-dot"
        placeholder={mainLocationPlaceholder}
        options={NZ_MAIN_LOCATIONS.map((location) => ({ label: location, value: location }))}
        value={mainLocation}
        onChange={(nextLocation) => onLocationChange(nextLocation as MainLocation | "")}
        className="market-location-select"
        hideLabel
      />
      <SelectMenu
        id={`${idPrefix}-sub-location`}
        name="subLocation"
        label={subLocationLabel}
        icon="fa-map-pin"
        placeholder={subLocationPlaceholder}
        options={mainLocation ? getSubLocations(mainLocation).map((location) => ({ label: location, value: location })) : []}
        value={subLocation}
        disabled={!mainLocation}
        onChange={(nextSubLocation) => onLocationChange(mainLocation, nextSubLocation)}
        className="market-location-select"
        hideLabel
      />
    </section>
  );
}
