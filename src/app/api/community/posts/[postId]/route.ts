import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function DELETE(_: Request, { params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Community posts are unavailable right now." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in to delete this post." }, { status: 401 });
  const { data: images } = await supabase.from("community_post_images").select("storage_path").eq("post_id", postId).eq("owner_id", user.id);
  const { error } = await supabase.from("community_posts").delete().eq("id", postId).eq("author_id", user.id);
  if (error) return NextResponse.json({ error: "Unable to delete this post." }, { status: 400 });
  if (images?.length) await supabase.storage.from("community-post-images").remove(images.map((image) => image.storage_path));
  return NextResponse.json({ ok: true });
}
