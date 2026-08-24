import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const serviceCategories = new Set(["cleaning", "handyman", "moving", "auto", "gardening", "tutoring", "beauty", "petCare"]);
const providerTypes = new Set(["business", "sole_trader"]);

function optionalText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized && normalized.length <= maxLength ? normalized : null;
}

function normalizePhone(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  const normalized = `${trimmed.startsWith("+") ? "+" : ""}${trimmed.replace(/\D/g, "")}`;
  return /^[+]?[0-9]{7,20}$/.test(normalized) ? normalized : null;
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ serviceId: string }> }) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Service management is unavailable right now." }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in to delete a service." }, { status: 401 });

  const { serviceId } = await params;
  const { data: listing } = await supabase.from("service_listings").select("id,owner_id").eq("id", serviceId).maybeSingle();
  if (!listing) return NextResponse.json({ error: "Service not found." }, { status: 404 });
  if (listing.owner_id !== user.id) return NextResponse.json({ error: "You can only delete your own services." }, { status: 403 });

  const { data: photos } = await supabase.from("service_listing_photos").select("storage_path").eq("listing_id", serviceId);
  const paths = (photos ?? []).map((photo) => photo.storage_path).filter((path): path is string => Boolean(path));
  const { error } = await supabase.from("service_listings").delete().eq("id", serviceId).eq("owner_id", user.id);
  if (error) return NextResponse.json({ error: "Unable to delete this service right now." }, { status: 500 });

  if (paths.length) await supabase.storage.from("service-listing-images").remove(paths);
  return NextResponse.json({ deleted: true });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ serviceId: string }> }) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Service management is unavailable right now." }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in to edit a service." }, { status: 401 });

  const payload = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!payload) return NextResponse.json({ error: "Enter valid service details." }, { status: 400 });
  const providerName = optionalText(payload.providerName, 100);
  const businessName = optionalText(payload.businessName, 100);
  const description = optionalText(payload.description, 2000);
  const phone = normalizePhone(payload.phone);
  const category = typeof payload.category === "string" && serviceCategories.has(payload.category) ? payload.category : null;
  const providerType = typeof payload.providerType === "string" && providerTypes.has(payload.providerType) ? payload.providerType : null;
  const serviceAreas = Array.isArray(payload.serviceAreas) ? payload.serviceAreas.filter((value): value is string => typeof value === "string" && value.trim().length > 0 && value.trim().length <= 120).map((value) => value.trim()).slice(0, 20) : [];
  const suburbs = Array.isArray(payload.suburbs) ? payload.suburbs.filter((value): value is string => typeof value === "string" && value.trim().length > 0 && value.trim().length <= 120).map((value) => value.trim()).slice(0, 100) : [];
  const streetAddress = optionalText(payload.streetAddress, 200);
  const weekdayHours = optionalText(payload.weekdayHours, 80);
  const saturdayHours = optionalText(payload.saturdayHours, 80);
  const sundayHours = optionalText(payload.sundayHours, 80);
  const email = optionalText(payload.email, 254);
  const website = optionalText(payload.website, 500);
  const foundedYear = typeof payload.foundedYear === "number" && Number.isInteger(payload.foundedYear) && payload.foundedYear >= 1800 && payload.foundedYear <= 2100 ? payload.foundedYear : null;

  if (!providerName || !businessName || !description || !phone || !category || !providerType || !serviceAreas.length || !streetAddress || !weekdayHours) {
    return NextResponse.json({ error: "Complete the required service details before saving." }, { status: 400 });
  }

  const { serviceId } = await params;
  const { data: listing, error } = await supabase.from("service_listings").update({
    category_slug: category, provider_name: providerName, business_name: businessName, description, provider_type: providerType,
    service_areas: serviceAreas, suburbs, phone, email, website, street_address: streetAddress,
    weekday_hours: weekdayHours, saturday_hours: saturdayHours, sunday_hours: sundayHours, founded_year: foundedYear,
  }).eq("id", serviceId).eq("owner_id", user.id).select("id").maybeSingle();
  if (error || !listing) return NextResponse.json({ error: "Unable to update this service right now." }, { status: 403 });
  return NextResponse.json({ serviceId: listing.id });
}
