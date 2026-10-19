"use client";

import { NZ_MAIN_LOCATIONS, getSubLocations, type MainLocation } from "@/data/nzLocations";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { useLanguage } from "@/components/LanguageProvider";

type DraftLocation = { mainLocation: MainLocation | ""; subLocation: string; locality: string | null; rawSuburb: string | null; region: string | null; latitude: number | null; longitude: number | null };

export function ListingLocationSelector({ value, onChange, labels }: { value: DraftLocation; onChange: (location: DraftLocation) => void; labels?: { main: string; mainPlaceholder: string; sub: string; subPlaceholder: string } }) {
  const { locale } = useLanguage();
  const say = (en: string, ko: string) => (locale === "ko" ? ko : en);
  const subLocations = value.mainLocation ? getSubLocations(value.mainLocation) : [];
  const visibleSubLocations = value.subLocation && !subLocations.includes(value.subLocation) ? [...subLocations, value.subLocation] : subLocations;
  const selectMainLocation = (mainLocation: MainLocation | "") => onChange({ mainLocation, subLocation: "", locality: null, rawSuburb: null, region: null, latitude: null, longitude: null });
  const selectSubLocation = (subLocation: string) => onChange({ ...value, subLocation, locality: null, rawSuburb: null, region: null, latitude: null, longitude: null });

  return <fieldset className="listing-location-selector">
    <div className="post-form-grid listing-location-fields">
      <SelectMenu id="listing-main-location" name="main_location" label={labels?.main ?? say("Main Location", "지역")} placeholder={labels?.mainPlaceholder ?? say("Select main location", "지역 선택")} options={NZ_MAIN_LOCATIONS.map((location) => ({ label: location, value: location }))} value={value.mainLocation} onChange={(nextLocation) => selectMainLocation(nextLocation as MainLocation | "")} />
      <SelectMenu id="listing-sub-location" name="sub_location" label={labels?.sub ?? say("Sub Location", "세부 지역")} placeholder={labels?.subPlaceholder ?? say("Select sub location", "세부 지역 선택")} options={visibleSubLocations.map((location) => ({ label: location, value: location }))} value={value.subLocation} disabled={!value.mainLocation} onChange={selectSubLocation} />
    </div>
  </fieldset>;
}
