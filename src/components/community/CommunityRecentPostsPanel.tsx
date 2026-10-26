"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import type { CommunityCategory } from "@/components/community/CommunityFilterSidebar";
import { communityPostFeedResponseSchema } from "@/contracts/api";
import { communityPostTypeLabelKeys, type CommunityPost } from "@/data/community-posts";
import { readApiResponse } from "@/lib/api/client";
import { useProfileMainLocation } from "@/lib/market/useProfileMainLocation";
import type { MainLocation } from "@/data/nzLocations";

// One desktop rail adapts its data source to the selected community category.
export function CommunityRecentPostsPanel({ category = "all", mainLocation, subLocation }: { category?: CommunityCategory; mainLocation?: MainLocation | ""; subLocation?: string }) {
  const { t, locale } = useLanguage();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [desktopVisible, setDesktopVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [profileLocation, setProfileLocation] = useState<{ main: MainLocation; sub: string } | null>(null);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1200px)");
    const update = () => setDesktopVisible(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useProfileMainLocation({
    // A page that already knows its area passes it down, an empty one meaning
    // everywhere. Only a page that does not asks the profile, and it does so once.
    enabled: desktopVisible && mainLocation === undefined,
    hasMainLocationInUrl: false,
    mainLocation: "",
    onResolve: (main, sub) => setProfileLocation({ main, sub }),
  });
  const area = mainLocation ?? profileLocation?.main ?? "";
  const suburb = subLocation ?? (area && area === profileLocation?.main ? profileLocation.sub : "");
  const heading = area ? `${suburb || area} · ${locale === "ko" ? "동네 새 글" : "Local posts"}` : t("communityRecentPostsHeading");

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1200px)");
    let controller: AbortController | null = null;
    const params = new URLSearchParams({ sort: "recent" });
    if (category !== "all") params.set("category", category);
    if (area) params.set("mainLocation", area);
    if (area && suburb) params.set("subLocation", suburb);

    const loadVisibleRail = () => {
      controller?.abort();
      controller = null;
      if (!desktop.matches) return;
      setPosts([]);
      setIsLoading(true);
      controller = new AbortController();
      const { signal } = controller;
      void fetch(`/api/community/posts?${params}`, { signal })
        .then((response) => readApiResponse(response, communityPostFeedResponseSchema))
        .then((result) => { if (!signal.aborted && result.data) setPosts(result.data.posts); })
        .catch((error: unknown) => { if (!signal.aborted && (error as { name?: string }).name !== "AbortError") setPosts([]); })
        .finally(() => { if (!signal.aborted) setIsLoading(false); });
    };
    loadVisibleRail();
    desktop.addEventListener("change", loadVisibleRail);
    return () => { controller?.abort(); desktop.removeEventListener("change", loadVisibleRail); };
  }, [category, area, suburb]);

  return (
    <aside className="community-recent-panel" aria-label={heading}>
      <Link className="community-recent-ad-slot" href="/market">
        <Image src="/images/home/journey-market.png" alt="Discover home finds on Tada Market" fill sizes="300px" />
        <span className="community-recent-ad-label">Advertisement</span>
        <span className="community-recent-ad-copy"><strong>Fresh finds for your home</strong><small>Explore Tada Market</small></span>
      </Link>
      <div className="community-recent-panel-heading">
        <h2>{heading}</h2>
      </div>
      <div className="community-recent-panel-list">
        {!isLoading && !posts.length ? <p className="community-recent-post-meta">{locale === "ko" ? "이 지역에 등록된 새 글이 없습니다." : "No recent posts in this area."}</p> : null}
        {posts.map((post) => (
          <article className={`community-recent-post ${post.image ? "" : "community-recent-post-no-media"}`} key={post.id}>
            <Link className="community-recent-post-link" href={`/community/${post.id}${category === "all" ? "" : `?category=${category}`}`}>
              <div className="community-recent-post-body">
                <span className="community-recent-post-meta">{t(communityPostTypeLabelKeys[post.type])} · {post.timeAgo ?? post.eventDate ?? t("communityNewPost")}</span>
                <h3>{post.title}</h3>
                <span className="community-recent-post-stats">{post.responseCount != null ? `${post.responseCount} ${t("communityResponses")}` : t("communityNoResponsesYet")}</span>
              </div>
              {post.image ? <div className="community-recent-post-media"><img src={post.image} alt="" /></div> : null}
            </Link>
          </article>
        ))}
      </div>
    </aside>
  );
}
