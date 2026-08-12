import { Avatar } from "@/components/ui/Avatar";

type CommunityPostAuthorProps = {
  name: string | null | undefined;
  avatarUrl: string | null | undefined;
  className: string;
  avatarClassName: string;
};

/** Shared identity treatment for community feed cards and post details. */
export function CommunityPostAuthor({ name, avatarUrl, className, avatarClassName }: CommunityPostAuthorProps) {
  const label = name ?? "Community member";
  return <span className={className}><Avatar src={avatarUrl} name={label} className={avatarClassName} initials="double" /><strong className="community-post-author-name">{label}</strong></span>;
}
