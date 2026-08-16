export function CommentCountBadge({ count, className = "" }: { count?: number; className?: string }) {
  if (!count) return null;
  return <span className={`comment-count-badge ${className}`.trim()} aria-label={`${count} comments`}>{count}</span>;
}
