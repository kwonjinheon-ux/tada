"use client";

import Link from "next/link";
import { CommunityPostCard } from "@/components/community/CommunityPostCard";
import { CommunityPostAuthor } from "@/components/community/CommunityPostAuthor";
import { useLanguage } from "@/components/LanguageProvider";
import type { CommunityPost } from "@/data/community-posts";

export function CommunityMemberPosts({ member, posts, isVisible, isOwner }: { member: { id: string; name: string; avatarUrl: string | null }; posts: CommunityPost[]; isVisible: boolean; isOwner: boolean }) {
  const { locale } = useLanguage();
  const ko = locale === "ko";
  const title = isOwner ? (ko ? "내 다른 글" : "My other posts") : (ko ? `${member.name}님의 다른 글` : `${member.name}'s other posts`);

  return <main className="community-member-posts page-container">
    <div className="community-member-posts-header">
      <Link className="community-member-posts-back" href="/community"><i className="ms ms-arrow-back" aria-hidden="true" />{ko ? "커뮤니티" : "Community"}</Link>
      <CommunityPostAuthor name={member.name} avatarUrl={member.avatarUrl} className="community-member-posts-author" avatarClassName="community-member-posts-avatar" />
      <h1>{title}</h1>
    </div>
    {!isVisible ? <section className="community-member-posts-empty" role="status"><i className="ms ms-lock" aria-hidden="true" /><strong>{ko ? "다른 글을 공개하지 않은 사용자예요" : "This member has not shared their other posts."}</strong><span>{ko ? "프로필 공개 범위 설정에 따라 다른 글을 볼 수 없어요." : "Their profile visibility settings control access to this list."}</span></section> : posts.length ? <div className="community-post-list">{posts.map((post) => <CommunityPostCard key={post.id} post={post} href={`/community/${post.id}`} />)}</div> : <section className="community-member-posts-empty" role="status"><i className="ms ms-forum" aria-hidden="true" /><strong>{ko ? "아직 공개된 다른 글이 없어요" : "No other public posts yet."}</strong></section>}
  </main>;
}
