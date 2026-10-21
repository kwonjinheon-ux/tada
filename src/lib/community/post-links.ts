/**
 * The two links a community post can carry: where a story came from, and a
 * video that belongs with it.
 *
 * Both the form, the API and the page read the same rules from here, so a link
 * that the writer was told is fine cannot be refused on the way in or quietly
 * dropped on the way out.
 */

/** A link we are willing to send a reader to. */
export function isSafeHttpUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 500) return false;
  try {
    const url = new URL(trimmed);
    // A hostname with a dot: `https://localhost` and `https://x` are mistakes
    // far more often than they are the source of a news story.
    return (url.protocol === "http:" || url.protocol === "https:") && url.hostname.includes(".");
  } catch {
    return false;
  }
}

/** The host a source link points at, for showing where it leads before it is followed. */
export function linkHostLabel(value: string) {
  try {
    return new URL(value.trim()).hostname.replace(/^www\./i, "");
  } catch {
    return value.trim();
  }
}

const YOUTUBE_HOSTS = new Set(["youtube.com", "youtube-nocookie.com", "music.youtube.com", "youtu.be"]);

/**
 * The video id inside any shape YouTube hands out — a watch link, a share
 * link, a Short, an embed — or null when the link is not one of them.
 *
 * Readers paste whatever the Share button gave them, with its timestamps and
 * tracking parameters attached, so the id is read out rather than the whole
 * link being matched against a pattern.
 */
export function youtubeVideoId(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  const host = url.hostname.replace(/^(?:www|m)\./i, "").toLowerCase();
  if (!YOUTUBE_HOSTS.has(host)) return null;
  const id = host === "youtu.be"
    ? url.pathname.slice(1)
    // watch?v=… carries the id as a parameter; /shorts/…, /embed/… and /live/…
    // carry it as the last step of the path.
    : url.searchParams.get("v") ?? url.pathname.split("/").filter(Boolean).at(-1) ?? "";
  return /^[\w-]{11}$/.test(id) ? id : null;
}

/** The player, with YouTube's cookie-free host so a reader is not tracked by opening a post. */
export function youtubeEmbedUrl(videoId: string) {
  return `https://www.youtube-nocookie.com/embed/${videoId}`;
}

/** The still YouTube serves for a video, for confirming the right one was pasted. */
export function youtubeThumbnailUrl(videoId: string) {
  return `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
}
