import { NZ_LOCATIONS, NZ_MAIN_LOCATIONS, type LocationSelection, type MainLocation } from "@/data/nzLocations";

export type GpsLocation = {
  suburb?: string | null;
  locality?: string | null;
  city?: string | null;
  region?: string | null;
  latitude: number;
  longitude: number;
};

export function normalizeLocationName(value: string | null | undefined): string {
  return (value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("en-NZ").replace(/[^a-z0-9]/g, "");
}

export function findMainLocation(value: string | null | undefined): MainLocation | undefined {
  const normalized = normalizeLocationName(value);
  return NZ_MAIN_LOCATIONS.find((location) => location !== "Other New Zealand" && normalizeLocationName(location) === normalized);
}

export function findSubLocation(mainLocation: MainLocation, value: string | null | undefined): string | undefined {
  const normalized = normalizeLocationName(value);
  return NZ_LOCATIONS[mainLocation].find((location) => normalizeLocationName(location) === normalized);
}

export function mapGpsLocationToCategory(location: GpsLocation): LocationSelection {
  const city = findMainLocation(location.city) ?? findMainLocation(location.locality);
  const locality = location.locality?.trim() || location.city?.trim() || null;
  const rawSuburb = location.suburb?.trim() || null;
  if (city) {
    const subLocation = findSubLocation(city, location.suburb) ?? findSubLocation(city, location.locality) ?? `Other ${city}`;
    return { mainLocation: city, subLocation, locality, rawSuburb: subLocation.startsWith("Other ") ? rawSuburb : null, region: location.region?.trim() || null, latitude: location.latitude, longitude: location.longitude };
  }
  const region = findSubLocation("Other New Zealand", location.region);
  if (region && region !== "GPS Location Not Found") {
    return { mainLocation: "Other New Zealand", subLocation: region, locality, rawSuburb, region: location.region?.trim() || null, latitude: location.latitude, longitude: location.longitude };
  }
  return { mainLocation: "Other New Zealand", subLocation: "GPS Location Not Found", locality, rawSuburb, region: location.region?.trim() || null, latitude: location.latitude, longitude: location.longitude };
}
