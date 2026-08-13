export type CommentRecord = {
  id: string;
  parentId: string | null;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  depth: number;
  body: string;
  score: number;
  myVote: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  isPending?: boolean;
};

export type CommentsPayload = { comments: CommentRecord[]; currentUserId: string | null; error?: string };
export type CommentSpace = "market" | "bargain" | "community";

const CACHE_TTL_MS = 60_000;
const commentCache = new Map<string, { payload: CommentsPayload; expiresAt: number }>();
const pendingRequests = new Map<string, Promise<CommentsPayload>>();

function commentUrl(id: string, space: CommentSpace) {
  return `/api/${space}/${space === "community" ? "posts" : "listings"}/${id}/comments`;
}

function cacheKey(id: string, space: CommentSpace) {
  return `${space}:${id}`;
}

export function readCachedComments(id: string, space: CommentSpace) {
  const cached = commentCache.get(cacheKey(id, space));
  return cached && cached.expiresAt > Date.now() ? cached.payload : null;
}

export async function loadComments(id: string, space: CommentSpace, options: { force?: boolean } = {}) {
  const key = cacheKey(id, space);
  if (!options.force) {
    const cached = readCachedComments(id, space);
    if (cached) return cached;
  }

  const pending = pendingRequests.get(key);
  if (pending) return pending;

  const request = fetch(commentUrl(id, space), { cache: "no-store" })
    .then(async (response) => {
      const payload = await response.json().catch(() => null) as CommentsPayload | null;
      if (!response.ok || !payload) throw new Error(payload?.error || "Unable to load comments right now.");
      commentCache.set(key, { payload, expiresAt: Date.now() + CACHE_TTL_MS });
      return payload;
    })
    .finally(() => pendingRequests.delete(key));
  pendingRequests.set(key, request);
  return request;
}

export function prefetchComments(id: string, space: CommentSpace) {
  return loadComments(id, space).catch(() => undefined);
}

export function invalidateComments(id: string, space: CommentSpace) {
  commentCache.delete(cacheKey(id, space));
}
