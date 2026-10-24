# Tada Points and Levels

## Status

Proposal. Nothing in this document is built. It exists to be argued with before
any table or gate is written.

## Purpose

Give members a reason to come back and contribute, and give Tada a safe way to
hand out capacity: a new account gets a modest allowance, a member who has been
here a while gets more. Levels should feel like room to move, not like a paywall
with a different name.

---

## 1. What already exists

Four things in the product already count or rank members. A points system that
ignores them will be the fifth, and members will not know which number matters.

| Thing | Where | What it is |
| --- | --- | --- |
| **Tada Charge** (타다 충전) | `src/lib/dashboard/tada-charge-content.ts`, `/market/dashboard/tada-charge` | A reputation meter, 20–100%, driven by counterparty feedback on completed trades. Documented to members. Marked "coming soon". |
| **Charge ring on My Page** | `src/components/dashboard/MyPageClient.tsx:50` | A placeholder using the same name: profile-setup completeness, not reputation. The guide page admits this. |
| **Trust power** | `src/components/dashboard/SellerDashboard.tsx:86` | `min(100, completed sales + purchases + bargain reservations)`, with red/yellow/blue/green tones. A third number, unexplained anywhere. |
| **Community score** | `community_posts.score`, `cast_community_post_vote` | Per-post votes. Already feeds the ranked feed. |

### The rule this forces

**Charge measures trust. Points measure activity. They must never be the same
number, and the level must never be displayed where it can be read as trust.**

The Charge guide already promises members, in writing:

> "Likes and comments — Activity alone does not raise Charge."
> "커뮤니티 활동 역시 반영되지 않아요."
> "Listing items or services — The number of listings does not raise Charge."

That promise is the right one, and it is exactly what a points system rewards.
If posting raised Charge, a member who writes fifty comments would outrank a
member who completed twenty honest trades, and the one number people use to
decide whether to meet a stranger would be farmed. So:

- **Charge** — can go down, shown to other people, earned only from verified
  trade feedback.
- **Level** — only goes up, shown mostly to the member themselves, earned from
  activity, spends itself as *capacity* rather than as status.

**Trust power should be retired** when Charge ships, or renamed. Three meters is
two too many.

---

## 2. What earns points

Points are awarded for finishing something another person can see, never for
pressing a button.

| Action | Points | Cap | Notes |
| --- | --- | --- | --- |
| Complete a trade (`market_trade_offers` → `completed`) | **30** | — | Both buyer and seller. The strongest signal Tada has. |
| Leave a trade review (`completed_trade_reviews`) | **15** | 1 per trade | Only after the trade is completed. |
| Leave a service review (`service_reviews`) | **15** | 1 per service listing | |
| Complete a bargain-sale pickup | **20** | — | Same reasoning as a trade. |
| Open a group buy that reaches its minimum | **25** | — | Paid on success, not on creation. |
| Join a group buy order | **10** | — | |
| Publish a community post | **10** | 3 posts/day | Must pass the existing 20-character body rule. |
| Publish a market or service listing | **5** | 3/day | Paid once per listing, never on re-edit. |
| Write a comment (community, listing, bargain) | **2** | 10/day | |
| Receive an upvote on your post or comment | **1** | 20/day | Rewards being read, not posting. |
| First-time profile setup (name, photo, region) | **20** | once | The My Page checklist, paid once. |
| Verify a phone number | **20** | once | Cheap friction for a spammer, real value to Tada. |

### Not worth points

- Saving to a wishlist, following, viewing, voting (costless to do, trivially
  automated).
- Sending a message (rewarding volume in an inbox is how you get spam).
- Editing or re-posting existing content.

### Reversal

Points are reversed when what earned them goes away: a deleted post, a removed
comment, a review the author takes back, a listing removed by moderation. An
append-only ledger makes this a compensating row, never a deletion.

### Anonymous posts

Anonymous posts in `free-board` and `qna` (`allowsAnonymousCommunityPost`) still
earn, because the row knows the author. But they earn **half**, and they do not
count toward the daily post cap — anonymity is for safety, not for farming.

---

## 3. Levels

Five levels, because the Charge stages already use five and members should not
have to learn two different shapes.

| Level | Name (EN / KO) | Points | Roughly |
| --- | --- | --- | --- |
| 1 | New neighbour / 새 이웃 | 0 | Day one |
| 2 | Settling in / 자리 잡는 중 | 50 | First real week |
| 3 | Regular / 단골 이웃 | 200 | A month of normal use |
| 4 | Local / 동네 터줏대감 | 600 | Three to four months |
| 5 | Pillar / 마을 기둥 | 1,500 | Most of a year |

Sanity check: a member who completes one trade, leaves its review, writes two
posts and a handful of comments in a week earns about 80 points. That reaches
Level 2 in the first week and Level 3 in roughly a month — fast enough to feel
alive, slow enough that Level 5 means something.

**No decay.** Levels do not fall when someone is away for a month; the weekly
allowances below reset weekly, which is where the "use it or lose it" pressure
belongs. Decay punishes a holiday and buys nothing.

---

## 4. What a level unlocks

This is the part that has to be grounded in what Tada actually has today. Each
row below says where the limit lives now.

### 4.1 Bump a listing (끌어올림)

**This feature does not exist yet.** There is no bump, renew or boost anywhere in
the codebase — the listing table has `created_at`/`updated_at` and the feed sorts
on them. It has to be built before it can be gated, and it is the single best
candidate for level-gating because it is pure visibility, costs nothing to grant,
and is the thing a seller actually wants.

| Level | Bumps per week |
| --- | --- |
| 1 | 3 |
| 2 | 5 |
| 3 | 7 |
| 4 | 10 |
| 5 | 14 |

With a floor of, say, 6 hours between bumps on one listing at every level, so the
top of the feed cannot be held by one person.

### 4.2 Saved items (찜)

**No cap exists today** — `market_wishlist`, `community_wishlist`,
`service_wishlist` and `bargain_wishlist` are all unlimited.

This is the one place to be careful. Introducing 10 saves for Level 1 does not
grant anything; it *takes away* what every current member already has, and the
first thing they will notice is an error where there was none. Two options:

- **Recommended:** leave saving unlimited and gate something that is not yet
  given away. A cap on saving is a small reward and a large annoyance.
- If a cap is wanted anyway, set Level 1 at or above what real members already
  save (measure it first), and grandfather existing rows so nobody is asked to
  delete something they saved last month.

| Level | Saved items | |
| --- | --- | --- |
| 1 | 60 | Only if a cap is really wanted |
| 2 | 100 | |
| 3 | 200 | |
| 4 | 400 | |
| 5 | Unlimited | |

### 4.3 Keyword alerts

**A real precedent already exists:** `enforce_market_keyword_alert_limit()`
raises `P0001` past 20 alerts, and `src/app/api/market/keywords/route.ts:38`
turns that into "You can save up to 20 keyword alerts." The trigger only needs to
read the member's level instead of the constant 20.

Same rule as above — never below today's 20.

| Level | Keyword alerts |
| --- | --- |
| 1 | 20 (today's limit) |
| 2 | 30 |
| 3 | 40 |
| 4 | 60 |
| 5 | 100 |

### 4.4 Spam-shaped capabilities

These are the gates worth having even if nothing else ships, because they are
how a new throwaway account is kept cheap. They restrict a *new* account rather
than an established one, so almost nobody feels them.

| Capability | Where it lives now | Level 1 | Level 2+ |
| --- | --- | --- | --- |
| Source and video links on a community post | `source_url`, `video_url` (new) | Not available | Available |
| Links inside a post body | `sanitizePostHtml` keeps `<a>` | Stripped to text | Kept |
| Posts per day | No limit | 3 | 5 at L2, 10 at L3+ |
| Comments per day | No limit | 10 | 30 at L2, unlimited at L3+ |
| Messages to people you have never traded with, per day | No limit | 5 | 20 at L2+, unlimited at L4 |
| Simultaneous active listings | No limit | 5 | 10 / 20 / 50 / unlimited |
| Group buy — open one | Any member | Not available | L3+ (it handles other people's money) |

### 4.5 Nice-to-have capacity

| Capability | Where it lives now | Scale |
| --- | --- | --- |
| Photos per listing | `marketListingImagePolicy.maxCount = 10` | 5 / 8 / 10 / 12 / 15 |
| AI listing drafts | 3 per 10 minutes (`generate-listing/route.ts:18`) | 2 / 3 / 5 / 8 / 10 per 10 min — this one costs real money per call, so it is the most defensible gate of all |
| Service listings per account | No limit | 1 / 2 / 3 / 5 / 10 |
| Pinned listing on your seller profile | Does not exist | L3+ |
| Level badge beside your name in the community | Does not exist | L3+, opt-out |

---

## 5. Data model

Three objects. The ledger is the only source of truth; everything else is
derived and can be rebuilt from it.

```sql
-- Append-only. Never updated, never deleted; a reversal is a negative row.
create table public.member_point_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  action text not null,            -- 'community_post', 'trade_completed', …
  points integer not null,         -- negative for a reversal
  subject_type text,               -- 'community_post', 'market_listing', …
  subject_id uuid,
  created_at timestamptz not null default now(),
  -- One award per member per thing. A reversal carries its own action name,
  -- so it does not collide with the award it cancels.
  unique (user_id, action, subject_type, subject_id)
);

-- A running total, maintained by trigger. Cheap to read on every page.
create table public.member_levels (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  points integer not null default 0,
  level smallint not null default 1,
  reached_at timestamptz not null default now()
);

-- Weekly allowances (bumps and so on) are counted from the ledger rather than
-- stored, so there is nothing to reset and nothing to drift.
```

- **Read access:** a member reads their own ledger; everyone reads
  `member_levels.level` only (never another member's point total — a total is a
  scoreboard and invites farming).
- **Write access:** nobody. Points are written by `security definer` functions
  attached to the events that earn them, exactly as
  `complete_market_trade_offer` already works. No API route may insert points
  directly, or the browser can.
- **Enforcement:** the limit lives next to the data, the way the keyword trigger
  already does, and the API translates the error into a sentence. A check that
  exists only in a React component is a suggestion.

---

## 6. How a member sees it

- **My Page** — level, progress to the next one, and what the next one gives.
  This is the only place a point total appears.
- **Where an allowance is spent** — "3 of 5 bumps left this week" next to the
  bump button. A limit a member meets without warning reads as a bug.
- **Community author line** — a small badge at Level 3+, opt-out. Not a number.
- **Nowhere on a listing or a trade screen.** A buyer deciding whether to meet
  someone should see Charge, not how much that person posts.

A level-up is worth a notification. `notification_preferences` and the `type`
check constraint in `20261022071112_unified_notification_preferences.sql` would
need a `level` type, and its `href` check currently allows only `/market`,
`/community/%` and `/services/%` paths — a link to My Page needs that widened.

---

## 7. Abuse

The points table is a specification for how to farm Tada, so each line needs an
answer before it ships:

- **Daily caps** on everything cheap (posts, comments, votes received).
- **Award on completion, not creation** — a group buy pays when it reaches its
  minimum, a trade pays when both sides confirm.
- **Reversal on removal**, so deleting a farmed post takes the points back.
- **One award per subject**, enforced by the unique constraint, so re-publishing
  the same listing pays once.
- **Self-dealing**: two accounts completing trades with each other is the
  expensive attack. Trades between accounts that have traded together more than
  twice in a month should pay nothing further until reviewed.
- **Reciprocal votes**: an upvote from someone who upvotes everything you write
  should stop counting. Simplest version: only the first vote from each member,
  per week, on your content pays.
- **The gates themselves are the defence.** A new account cannot post links,
  cannot message strangers at volume, and cannot open a group buy. That is worth
  more than any score.

---

## 8. Suggested order

1. **Ledger only, invisible.** Write point events for actions that already
   exist. Nothing is gated, nothing is shown. Lets real numbers settle before
   any threshold is fixed — the values in this document are guesses until then.
2. **Show it.** My Page level card, level-up notification. Still no gates.
3. **Gate the spam-shaped things** (§4.4). These only bite new accounts and are
   defensible on their own.
4. **Build bump, gated from day one** (§4.1). A new feature with a limit is a
   gift; an old feature with a new limit is a takeaway.
5. **Scale the existing caps** (keyword alerts, photos, AI drafts) upward only.
6. **Reconcile the meters**: Charge ships as reputation, trust power is retired,
   the My Page ring stops calling profile setup "Charge".

---

## 9. Decisions needed

1. Are Charge and Level definitely two separate things? (This document assumes
   yes, and the rest falls apart if not.)
2. Do we accept that saving stays uncapped, or do we measure real usage first?
3. Does a level ever show to other members, or is it private capacity only?
4. Does Level 5 need anything that is not capacity — early access, a say in
   moderation, a different badge — or is capacity enough?
5. What happens to a member who is demoted by a reversal? Recommendation: level
   never falls, even if points do, until a moderator removes it.
