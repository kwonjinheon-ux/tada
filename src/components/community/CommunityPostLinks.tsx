"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { isSafeHttpUrl, linkHostLabel, youtubeEmbedUrl, youtubeVideoId } from "@/lib/community/post-links";

/**
 * What a post points at: the video it is about, and where its story came from.
 *
 * Both sit under the body, in the order a reader wants them — the video plays
 * where it was written about, and the source is the last thing on the way to
 * the comments, which is where someone goes to check a claim.
 *
 * Each is read through the same rules the form used, so a link that cannot be
 * trusted is simply not shown rather than rendered and left to the browser.
 */
export function CommunityPostLinks({ sourceUrl, videoUrl }: { sourceUrl?: string | null; videoUrl?: string | null }) {
  const { t } = useLanguage();
  const videoId = videoUrl ? youtubeVideoId(videoUrl) : null;
  const source = sourceUrl && isSafeHttpUrl(sourceUrl) ? sourceUrl.trim() : null;
  if (!videoId && !source) return null;

  return (
    <div className="community-post-links">
      {videoId ? (
        <div className="community-post-video">
          <iframe
            src={youtubeEmbedUrl(videoId)}
            title={t("communityPostVideoLabel")}
            loading="lazy"
            allow="accelerometer; encrypted-media; picture-in-picture; web-share; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
      ) : null}
      {source ? (
        <a className="community-post-source" href={source} target="_blank" rel="nofollow noopener noreferrer">
          <i className="ms ms-newspaper" aria-hidden="true" />
          <span>
            <strong>{t("communityPostSourceLabel")}</strong>
            <small>{linkHostLabel(source)}</small>
          </span>
          <i className="ms ms-open-in-new" aria-hidden="true" />
        </a>
      ) : null}
    </div>
  );
}
