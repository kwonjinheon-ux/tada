import { NextResponse } from "next/server";
import { mapGpsLocationToCategory } from "@/lib/market/nz-location";

type NominatimAddress = { suburb?: string; neighbourhood?: string; village?: string; town?: string; city?: string; municipality?: string; state?: string; region?: string; country_code?: string };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const latitude = Number(url.searchParams.get("latitude"));
  const longitude = Number(url.searchParams.get("longitude"));
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return NextResponse.json({ error: "Valid latitude and longitude are required." }, { status: 400 });
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}`, { headers: { "Accept-Language": "en-NZ,en", "User-Agent": "TadaNZMarketplace/1.0" }, next: { revalidate: 0 } });
    if (!response.ok) throw new Error("Reverse geocoding failed");
    const payload = await response.json() as { address?: NominatimAddress };
    const address = payload.address;
    if (!address || (address.country_code && address.country_code.toLowerCase() !== "nz")) throw new Error("Location was not found in New Zealand");
    return NextResponse.json({ location: mapGpsLocationToCategory({ suburb: address.suburb ?? address.neighbourhood, locality: address.village ?? address.town ?? address.municipality, city: address.city, region: address.state ?? address.region, latitude, longitude }) });
  } catch {
    return NextResponse.json({ location: mapGpsLocationToCategory({ latitude, longitude }) });
  }
}
