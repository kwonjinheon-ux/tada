import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null) as { serviceId?: unknown; rating?: unknown; comment?: unknown } | null;
  const serviceId = typeof payload?.serviceId === "string" ? payload.serviceId : "";
  const rating = typeof payload?.rating === "number" ? payload.rating : Number.NaN;
  const comment = typeof payload?.comment === "string" ? payload.comment.trim() : "";

  if (!serviceId || !Number.isInteger(rating) || rating < 1 || rating > 5 || comment.length < 1 || comment.length > 1000) {
    return NextResponse.json({ error: "Please choose a rating and write a review of up to 1,000 characters." }, { status: 400 });
  }

  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Please log in to write a review." }, { status: 401 });

  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Reviews are unavailable right now." }, { status: 503 });

  const { data, error } = await supabase
    .from("service_reviews")
    .insert({ service_id: serviceId, reviewer_id: user.id, rating, comment })
    .select("id, rating, comment, created_at")
    .single();

  if (error || !data) {
    const status = error?.code === "23505" ? 409 : 400;
    return NextResponse.json({ error: error?.code === "23505" ? "You have already reviewed this service." : "Unable to save your review right now." }, { status });
  }

  return NextResponse.json({ review: data }, { status: 201 });
}
