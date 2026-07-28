# Marketplace Implementation Guide

이 문서는 현재 Tada 마켓플레이스에 구현된 기능, 코드 위치, 데이터 모델, API 패턴, UI 패턴을 한곳에 정리한 실행 가이드다. 다음에 비슷한 기능을 만들 때는 이 문서를 먼저 보고 기존 방식과 맞춰서 구현한다.

## 목적

- 지금까지 구현된 기능을 빠르게 파악한다.
- 새 기능을 만들 때 같은 구조, 같은 보안 기준, 같은 UX 패턴을 반복한다.
- 나중에 Android/iOS 앱을 붙일 때 어떤 로직을 API/service 경계로 빼야 하는지 미리 알 수 있게 한다.

## 현재 기술 구조

| 영역 | 현재 선택 | 사용 위치 |
| --- | --- | --- |
| Web app | Next.js App Router, React, TypeScript | `src/app`, `src/components` |
| Backend | Supabase Auth, Postgres, Storage, Realtime | `src/lib/supabase`, `supabase/migrations` |
| API boundary | Next Route Handlers | `src/app/api` |
| Styling | Tailwind 설정 + 전역 CSS + 페이지 전용 CSS | `src/app/globals.css`, `styles.css`, `src/app/post-ad/post-ad.css` |
| AI listing draft | OpenAI server route | `src/app/api/ai/generate-listing/route.ts`, `src/lib/ai/listing.ts` |
| Type checking | TypeScript strict mode | `npm run typecheck` |

## 현재 라우트 맵

| Route | 역할 | 주요 파일 |
| --- | --- | --- |
| `/` | 홈 화면 | `src/app/page.tsx`, `src/components/HomePageClient.tsx` |
| `/market` | 마켓 목록, 검색, 카테고리 필터, 무한 렌더링, 실시간 상태 refresh | `src/app/market/page.tsx`, `src/components/market/MarketPageClient.tsx` |
| `/market/[listingId]` | 상품 상세, 찜, 공유, 댓글, 메시지/오퍼 진입 | `src/app/market/[listingId]/page.tsx`, `src/components/market/ListingDetailClient.tsx`, `src/components/market/ListingComments.tsx` |
| `/market/create` | 상품 등록 | `src/app/market/create/page.tsx`, `src/components/post-ad/PostAdPageClient.tsx` |
| `/market/[listingId]/edit` | 상품 수정 | `src/app/market/[listingId]/edit/page.tsx`, `src/components/post-ad/PostAdPageClient.tsx` |
| `/market/wishlist` | 찜/최근 본 상품 | `src/app/market/wishlist/page.tsx`, `src/components/market/WishlistClient.tsx` |
| `/market/sellers/[sellerId]` | 판매자 프로필과 판매 상품 | `src/app/market/sellers/[sellerId]/page.tsx` |
| `/market/dashboard` | 판매자 대시보드 | `src/app/market/dashboard/page.tsx`, `src/components/dashboard/SellerDashboard.tsx` |
| `/market/dashboard/messages` | 채팅, 오퍼 표시/액션, 실시간 메시지 | `src/app/market/dashboard/messages/page.tsx`, `src/components/messages/MarketMessagesClient.tsx` |
| `/market/dashboard/notifications` | 알림 목록, 읽음 처리 | `src/app/market/dashboard/notifications/page.tsx`, `src/components/notifications/MarketNotificationsClient.tsx` |
| `/market/dashboard/keywords` | 키워드 알림 설정 | `src/app/market/dashboard/keywords/page.tsx`, `src/components/market/KeywordAlertsClient.tsx` |
| `/market/dashboard/profile` | 프로필, 닉네임, 전화번호, 위치, 아바타 | `src/app/market/dashboard/profile/page.tsx`, `src/components/dashboard/ProfileSettingsForm.tsx`, `src/components/dashboard/ProfilePhotoUploader.tsx` |
| `/login`, `/signup`, `/(auth)/sign-in`, `/(auth)/sign-up` | 인증 화면 | `src/components/auth/AuthForms.tsx`, `src/lib/auth.ts` |
| `/auth/callback` | Supabase OAuth/email callback | `src/app/auth/callback/route.ts` |
| `/jobs`, `/jobs/dashboard` | 미래 Jobs 도메인 placeholder | `src/app/jobs/page.tsx`, `src/app/jobs/dashboard/page.tsx` |

## 현재 API 맵

마켓 관련 mutation은 가능한 한 `src/app/api/market` 아래에 둔다. 새 모바일 앱이 붙을 가능성이 있는 기능은 이 API 계층을 우선 확장한다.

| API | Method | 역할 | 인증 |
| --- | --- | --- | --- |
| `/api/market/wishlist?listingId=...` | `GET` | 특정 상품 찜 여부 확인 | 필요 |
| `/api/market/wishlist` | `POST` | 상품 찜 추가 | 필요 |
| `/api/market/wishlist` | `DELETE` | 상품 찜 삭제 | 필요 |
| `/api/market/listings/[listingId]` | `PATCH` | 상품 수정 | owner 필요 |
| `/api/market/listings/[listingId]` | `DELETE` | 상품 삭제, storage 이미지 제거 | owner 필요 |
| `/api/market/listings/[listingId]/view` | `POST` | 조회수 기록 RPC 호출 | 선택적 사용자 |
| `/api/market/listings/[listingId]/comments` | `GET` | 댓글, 작성자 프로필, 내 투표 조회 | 선택적 사용자 |
| `/api/market/listings/[listingId]/comments` | `POST` | 댓글/답글 작성 | 필요 |
| `/api/market/comments/[commentId]` | `PATCH` | 댓글 수정 | owner 필요 |
| `/api/market/comments/[commentId]` | `DELETE` | 댓글 삭제 | owner 필요 |
| `/api/market/comments/[commentId]/vote` | `POST` | 댓글 up/down vote 또는 취소 | 필요 |
| `/api/market/conversations` | `POST` | 상품별 구매자-판매자 conversation 생성/조회 | 필요 |
| `/api/market/messages` | `POST` | 메시지 전송 | conversation 참여자 |
| `/api/market/messages/[conversationId]/read` | `PATCH` | conversation 메시지 읽음 처리 | 참여자 |
| `/api/market/offers` | `POST` | 거래 오퍼 생성 | 구매자 |
| `/api/market/offers/[offerId]` | `PATCH` | 오퍼 수락/거절/취소/완료 | 역할별 권한 |
| `/api/market/keywords` | `GET` | 내 키워드 알림 목록 | 필요 |
| `/api/market/keywords` | `POST` | 키워드 알림 생성 | 필요 |
| `/api/market/keywords` | `DELETE` | 키워드 알림 삭제 | 필요 |
| `/api/market/notifications/[notificationId]/read` | `PATCH` | 알림 1개 읽음 | owner 필요 |
| `/api/market/notifications/read-all` | `PATCH` | 내 알림 전체 읽음 | 필요 |
| `/api/ai/generate-listing` | `POST` | AI 상품 설명 초안 생성 | 필요 |

## 주요 데이터 모델

### Auth/profile

- `profiles`: 사용자 표시 이름, 아바타, 전화번호, 위치 설정의 중심 테이블.
- `profile-avatars` storage bucket: 프로필 이미지 저장. 브라우저에는 signed URL만 내려준다.
- 닉네임 변경은 cooldown 정책이 있다. 관련 migration은 `202607120003_create_profiles_settings.sql`, `202607120004_enforce_profile_nickname_cooldown_on_insert.sql`, `20260713111218_remove_profile_nickname_cooldown.sql`을 확인한다.

### Marketplace listings

- `market_listings`: 상품 본문, 가격, 카테고리, 위치, 거래 방식, 상태.
- `market_listing_photos`: 상품 이미지 메타데이터. 실제 파일은 `market-listing-images` storage bucket에 둔다.
- `market_listing_status`: 현재 실사용 enum은 `draft`, `published`, `pending`, `sold`, `archived`다.
- 웹 표시용 타입에서는 `published`를 `available`로 매핑하는 곳이 있다. 새 기능에서는 DB 상태값과 UI 상태값을 명확히 분리한다.

### Engagement

- `market_wishlist`: 사용자별 찜.
- `market_listing_views`: 사용자별 최근 본 상품.
- `record_market_listing_view`: 조회수 기록 RPC.
- `market_keyword_alerts`: 키워드 기반 새 상품 알림.
- `market_notifications`: 메시지, 오퍼, 키워드 매치 등 사용자 알림.

### Community and trade

- `market_listing_comments`: 상품 댓글/답글.
- `market_listing_comment_votes`: 댓글 vote.
- `market_conversations`: 상품 단위 구매자-판매자 conversation.
- `market_messages`: conversation 메시지.
- `market_trade_offers`: 금액 제안, 수락/거절/취소/완료 상태.

### AI

- `ai_generation_usage`: 사용자별 AI 초안 생성 rate limit, duplicate guard, 성공/실패 상태 기록.
- `market-listing-images/<userId>/ai-drafts/...`: AI에 보낼 임시 압축 이미지. 생성 후 제거한다.

## 마켓 기능별 구현 패턴

### 상품 목록

현재 흐름:

1. `src/app/market/page.tsx`에서 서버 Supabase client를 만든다.
2. `market_listings`에서 `published`, `pending`, `sold` 상품을 최신순으로 가져온다.
3. 대표 이미지는 `market_listing_photos`에서 primary 또는 display order가 가장 낮은 사진을 고른다.
4. `getSignedStorageImages`로 thumbnail signed URL을 만든다.
5. `MarketPageClient`에 `postedListings`, `savedListingIds`를 props로 넘긴다.
6. 클라이언트에서는 검색어, 카테고리, 서브카테고리, grid/list view, mobile drawer 상태를 처리한다.
7. Supabase Realtime channel로 listing status update를 감지하면 `router.refresh()`를 호출한다.

다음에 비슷한 목록 기능을 만들 때:

- 서버 컴포넌트에서 데이터 조회와 signed URL 생성을 먼저 한다.
- 클라이언트 컴포넌트는 filtering, view mode, drawer, animation 같은 presentation state만 맡긴다.
- 목록 API가 모바일에도 필요하면 같은 query를 repository/API로 분리한다.

### 상품 상세

현재 흐름:

1. `src/app/market/[listingId]/page.tsx`가 listing, photos, seller profile, wishlist 여부를 조회한다.
2. 상태값은 UI용 `available`, `pending`, `sold`로 매핑한다.
3. `ListingDetailClient`가 gallery, share, wishlist interaction, message/offer 진입을 맡는다.
4. `ListingComments`가 댓글 API를 호출해 댓글, 답글, vote를 처리한다.

다음에 비슷한 상세 기능을 만들 때:

- 상세 페이지는 서버에서 읽기 데이터를 모아서 클라이언트에 넘긴다.
- action은 API route로 보낸다.
- owner check는 UI에서 숨기는 것과 별개로 API/RLS에서 반드시 다시 한다.

### 상품 등록/수정

현재 흐름:

1. `PostAdPageClient`가 등록과 수정을 모두 처리한다.
2. 제목 입력 시 `suggestCategoryFromTitle`로 카테고리를 추천한다.
3. 사진은 브라우저에서 preview URL을 만들고, 최대 10개, PNG/JPG/WebP, 5MB 이하만 허용한다.
4. 신규 등록은 클라이언트가 `market_listings`에 insert한다.
5. 사진 파일은 `market-listing-images` bucket에 업로드하고, `market_listing_photos`에 rows를 insert한다.
6. 수정은 `/api/market/listings/[listingId]` `PATCH`로 본문 데이터를 수정한 뒤, 사진 추가/삭제/대표/정렬을 동기화한다.

다음에 비슷한 등록 기능을 만들 때:

- validation 상수는 컴포넌트 내부에 흩뿌리지 말고 feature schema로 빼는 것이 좋다.
- 모바일 앱에서도 쓸 가능성이 높은 등록/수정/사진 동기화는 API route 또는 repository로 옮긴다.
- 브라우저가 보낸 `owner_id`는 신뢰하지 않는다. API/RLS에서 `auth.uid()`와 매칭한다.
- 파일 업로드는 storage path 규칙을 고정한다: `<userId>/<listingId>/<order>-<uuid>.<ext>`.

### 찜

현재 흐름:

1. 상품 카드/detail에서 wishlist API를 호출한다.
2. `POST /api/market/wishlist`는 자기 상품 찜을 막고, `upsert`로 중복을 방지한다.
3. `DELETE /api/market/wishlist`는 현재 사용자와 listing id 기준으로 삭제한다.
4. UI는 optimistic interaction과 heart burst animation을 사용한다.

다음에 비슷한 저장 기능을 만들 때:

- toggle API보다 `POST`/`DELETE`를 분리하면 클라이언트 상태 복구가 쉽다.
- 목록 페이지에는 초기 saved id set을 서버에서 내려준다.
- 저장 대상 소유자가 본인인지 API에서 다시 확인한다.

### 댓글과 vote

현재 흐름:

1. `GET /api/market/listings/[listingId]/comments`가 댓글, 작성자 profile, 내 vote를 함께 가져온다.
2. avatar는 `profile-avatars` signed URL을 생성한다.
3. 댓글 작성은 `POST`, 수정/삭제는 comment id API, vote는 별도 vote API를 쓴다.
4. 댓글 삭제 시 답글은 보존하는 정책이다.

다음에 비슷한 community 기능을 만들 때:

- 읽기 API에서 화면에 필요한 부가 데이터(profile, my state)를 한 번에 조합한다.
- mutation API는 작고 명확하게 나눈다.
- 댓글 권한은 API와 RLS 양쪽에서 owner 기준으로 검사한다.

### 메시지

현재 흐름:

1. `POST /api/market/conversations`가 listing id 기준으로 conversation을 만들거나 기존 conversation을 반환한다.
2. 구매자는 판매자 본인에게 메시지를 보낼 수 없다.
3. `POST /api/market/messages`는 conversation id와 body만 받는다.
4. DB trigger가 conversation 참여 여부를 확인하고 실제 recipient를 결정한다.
5. 메시지 화면은 Realtime channel로 새 메시지를 받고, unread count도 Navbar/Dashboard에서 갱신한다.

다음에 비슷한 private interaction 기능을 만들 때:

- recipient 같은 민감한 값은 브라우저 payload를 신뢰하지 말고 DB 함수/trigger에서 결정한다.
- UI unread count는 server initial count + realtime refresh 조합을 쓴다.
- 메시지 body 길이는 API에서 제한하고, DB에도 constraint/RLS를 둔다.

### 거래 오퍼

현재 흐름:

1. `POST /api/market/offers`는 listing, conversation, active offer를 검증하고 offer를 만든다.
2. `PATCH /api/market/offers/[offerId]`는 action에 따라 RPC를 호출한다.
3. 수락/거절/취소/완료 권한과 listing 상태 전환은 DB function/RLS에서 강하게 제어한다.
4. pending 상태에서도 경쟁 오퍼를 허용하도록 migration이 보강되어 있다.

다음에 비슷한 상태 전환 기능을 만들 때:

- 상태 전환은 API에서 직접 update하지 말고 RPC/DB function으로 묶는다.
- function execute grant를 필요한 role에만 허용한다.
- 상태 전환이 알림을 만들면 trigger로 처리한다.

### 알림

현재 흐름:

1. `market_notifications`에 메시지, 오퍼, 키워드 매치 이벤트가 쌓인다.
2. Navbar와 DashboardSidebar는 unread count를 가져온다.
3. 알림 페이지는 Realtime channel로 변경을 감지한다.
4. 개별 읽음과 전체 읽음 API가 분리되어 있다.

다음에 비슷한 알림 기능을 만들 때:

- 이벤트 발생 지점마다 UI에서 insert하지 말고 DB trigger/function에서 알림을 생성한다.
- unread count는 head count query를 사용한다.
- 읽음 처리는 owner 기준으로만 update한다.

### 키워드 알림

현재 흐름:

1. 사용자는 keyword와 optional category slug를 저장한다.
2. 새 상품이 published 상태가 되면 keyword/category 조건에 맞춰 알림을 만든다.
3. API는 `GET`, `POST`, `DELETE`로 분리되어 있다.

다음에 비슷한 user preference 기능을 만들 때:

- 사용자별 설정 테이블은 `user_id` ownership RLS를 기본으로 한다.
- 같은 설정 중복 방지는 unique index 또는 upsert 정책으로 막는다.
- preference가 event와 연결되면 trigger/function을 사용한다.

### 프로필과 아바타

현재 흐름:

1. `ProfileSettingsForm`이 display name, phone, location mode, city/suburb, lat/lng를 저장한다.
2. `ProfilePhotoUploader`가 이미지를 canvas로 압축한 뒤 `profile-avatars` bucket에 업로드한다.
3. 저장 후 signed URL을 다시 만들고 `profile-avatar-updated` custom event로 Navbar avatar를 갱신한다.

다음에 비슷한 프로필 기능을 만들 때:

- public profile과 private contact fields를 구분한다.
- 이미지 업로드는 client compression + storage upload + profile row update 순서로 처리한다.
- 다른 컴포넌트 갱신은 가능하면 서버 refresh나 shared state를 쓰고, custom event를 쓸 때는 이벤트 이름을 상수화한다.

### AI 상품 설명 초안

현재 흐름:

1. `AiListingGenerator`가 제목/카테고리/가격/상태/위치/사진을 모은다.
2. 이미지는 클라이언트에서 압축해 `market-listing-images/<userId>/ai-drafts`에 임시 업로드한다.
3. `POST /api/ai/generate-listing`가 인증, rate limit, duplicate guard를 확인한다.
4. `src/lib/ai/listing.ts`가 OpenAI 호출과 structured output schema를 관리한다.
5. 성공/실패 상태는 `ai_generation_usage`에 기록한다.
6. 임시 AI draft 이미지는 작업 후 제거한다.

다음에 비슷한 AI 기능을 만들 때:

- OpenAI API key는 반드시 server-only env에 둔다.
- browser에는 raw key, prompt 내부 정책, 장기 signed URL을 넘기지 않는다.
- rate limit 테이블을 먼저 만들고 API에서 사용량 row를 생성한 뒤 모델을 호출한다.
- 결과는 Zod schema로 구조화한다.
- 사용자가 업로드한 이미지를 AI로 보낼 때는 짧은 signed URL만 사용하고, 임시 파일을 정리한다.

## Supabase migration 흐름

현재 프로젝트는 `supabase/migrations` 아래 hand-authored migration을 누적하는 방식이다.

주요 migration 묶음:

- `202607110001_initial_marketplace.sql`: 초기 profiles/listings/storage/RLS.
- `202607120001` - `20260713111218`: profile avatar, profile settings, nickname 정책.
- `202607150001_create_market_listings.sql`: 현재 `market_listings`, `market_listing_photos`, storage 정책 기반.
- `20260716044100_create_ai_generation_usage.sql`: AI usage/rate limit.
- `20260718123000` - `20260718203241`: seller profile/rating/avatar backfill.
- `20260719030143` - `20260719095115`: comments, messages, permission hardening.
- `20260722014351` - `20260723044736`: wishlist, views, keyword alerts.
- `20260724090000` - `20260724100000`: optimized listing images, direct upload restore.
- `20260725133000` - `20260726095110`: trade offers, realtime, notifications, read policies, competing offers.

새 DB 기능을 만들 때:

1. 테이블/enum/index/RLS/function/trigger를 같은 migration에 넣되, 너무 커지면 기능 단위로 나눈다.
2. public table은 RLS를 반드시 enable한다.
3. `anon`/`authenticated` 권한과 RLS 정책을 별도로 생각한다.
4. browser mutation에 필요한 권한만 열고, owner/participant 검사는 RLS와 DB function에서 반복한다.
5. `SECURITY DEFINER` function은 필요한 경우에만 쓰고, execute grant를 바로 제한한다.
6. 상태 전환은 가능하면 RPC/function으로 묶어 race condition을 줄인다.

## UI/UX 반복 패턴

### Responsive layout

- 목록은 desktop grid, mobile list를 기본으로 한다.
- mobile drawer는 `src/components/MobileDrawer.tsx`를 재사용한다.
- dashboard drawer, category drawer처럼 drawer 간 충돌이 생길 수 있는 곳은 body class와 custom event를 조심해서 관리한다.
- 모바일 viewport 높이 이슈가 있는 메시지 화면은 `visualViewport`와 CSS variable을 사용한다.

### Cards and actions

- 상품 카드는 `ProductCard`를 기준으로 한다.
- saved/wishlist action은 즉각 반응하는 UI를 먼저 보여주고, API 실패 시 상태를 되돌린다.
- status가 `sold`이면 구매/오퍼 액션을 막고 시각적으로 비활성 상태를 보여준다.

### Forms

- submit 중에는 progress 또는 disabled 상태를 명확히 보여준다.
- 파일 업로드는 preview, validation error, remove, primary selection을 포함한다.
- 선택 항목은 native select와 enhanced custom select를 같이 둬 접근성과 스타일을 맞춘다.
- rich text는 현재 `contentEditable` + `document.execCommand` 방식이다. 장기적으로는 editor library 교체 후보로 남긴다.

### Realtime

- Supabase Realtime은 화면 단위 channel name을 명확히 만든다.
- 변경 이벤트가 잦을 수 있는 화면은 `requestAnimationFrame`이나 작은 debounce로 `router.refresh()` 호출을 제한한다.
- subscription cleanup에서 `removeChannel`을 호출한다.

## 보안 기준

항상 적용한다:

- service role key는 브라우저에 절대 노출하지 않는다.
- `NEXT_PUBLIC_` env에는 public URL과 publishable/anon key만 둔다.
- 모든 mutation API는 `supabase.auth.getUser()`로 인증을 확인한다.
- owner/participant 권한은 UI, API, RLS 중 하나만 믿지 말고 중복 확인한다.
- storage bucket은 private을 기본으로 하고 signed URL을 사용한다.
- 브라우저가 보낸 `owner_id`, `recipient_id`, `seller_id`, `status`는 신뢰하지 않는다.
- 댓글/메시지/AI 입력처럼 사용자가 작성하는 문자열은 길이 제한을 둔다.
- AI 기능은 rate limit과 duplicate guard 없이 public launch하지 않는다.

## 모바일 앱 확장 기준

현재 구조에서 모바일 앱을 붙일 때 우선 API화해야 하는 기능:

1. 상품 목록/상세 조회.
2. 상품 등록/수정/삭제.
3. 사진 업로드와 photo metadata sync.
4. 찜/최근 본 상품.
5. 메시지/conversation/read 상태.
6. 오퍼 생성/상태 전환.
7. 알림 목록/읽음.
8. 프로필/아바타.

모바일 앱도 Supabase client를 직접 쓸 수는 있지만, 다음 기준에 해당하면 Next API 또는 Supabase RPC를 우선한다:

- 여러 테이블을 동시에 변경한다.
- 상태 전환 권한이 복잡하다.
- storage 파일과 DB row를 함께 동기화한다.
- 알림/메시지/오퍼처럼 abuse 가능성이 있다.
- 웹과 앱이 같은 validation/error message를 써야 한다.

## 새 기능 구현 체크리스트

기능을 추가하기 전에:

- 기존 route/API/component 중 재사용 가능한 것이 있는지 확인한다.
- 데이터가 새 테이블인지, 기존 테이블 확장인지 결정한다.
- public read인지 owner-only인지 participant-only인지 access model을 먼저 쓴다.
- 모바일 앱에서 같은 기능이 필요할지 판단한다.

구현할 때:

- server component는 읽기 조합과 signed URL 생성을 담당한다.
- client component는 UI state와 사용자 interaction을 담당한다.
- mutation은 API route 또는 RPC/function으로 보낸다.
- validation은 client UX용, API boundary용, DB constraint/RLS용으로 나눠 생각한다.
- status enum은 DB 값과 UI 값을 분리하거나 명확히 매핑한다.
- Realtime subscription은 channel name, cleanup, refresh throttling을 넣는다.

검증할 때:

- `npm run typecheck`를 통과시킨다.
- owner, 다른 로그인 사용자, 비로그인 사용자 케이스를 확인한다.
- storage 파일이 남거나 DB row만 남는 partial failure가 없는지 본다.
- 모바일 viewport에서 drawer, form, keyboard, message composer가 겹치지 않는지 확인한다.
- 새 migration이 있으면 RLS 정책과 function grants를 다시 읽는다.

## 현재 구조에서 개선 우선순위

1. `src/features/market` 또는 `src/features/listings`를 실제로 만들고 repository/service/schema를 옮긴다.
2. `PostAdPageClient`의 등록, 사진 업로드, 사진 sync 로직을 API/service로 분리한다.
3. `published`와 `available` 상태명을 문서/타입/API에서 정리한다.
4. Supabase generated database type을 도입하고 수동 타입과 실제 schema를 맞춘다.
5. 프로필 저장, 아바타 업로드도 모바일 재사용 가능한 API로 정리한다.
6. API response envelope을 통일한다. 예: `{ data, error }` 또는 `{ success, data, error }`.

## 빠른 참고 파일

- Architecture: `MD/architecture/overview.md`
- Product model: `MD/product/marketplace.md`
- RLS baseline: `MD/security/supabase-rls.md`
- Categories: `src/data/marketplace-categories.ts`
- Supabase clients: `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`
- Signed storage helper: `src/lib/supabase/storage-image.ts`
- Market list: `src/app/market/page.tsx`, `src/components/market/MarketPageClient.tsx`
- Listing create/edit: `src/components/post-ad/PostAdPageClient.tsx`
- AI listing draft: `src/components/post-ad/AiListingGenerator.tsx`, `src/app/api/ai/generate-listing/route.ts`, `src/lib/ai/listing.ts`
- Messages: `src/app/market/dashboard/messages/page.tsx`, `src/components/messages/MarketMessagesClient.tsx`
- Notifications: `src/components/notifications/MarketNotificationsClient.tsx`
