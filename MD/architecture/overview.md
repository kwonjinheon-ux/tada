# Architecture

## Technology choices

| Area | Choice | Responsibility |
| --- | --- | --- |
| Web client | Next.js App Router + React + TypeScript | Responsive screens, routing, server rendering |
| Styling | Tailwind CSS + shared CSS tokens | One visual reference for all products |
| Backend | Supabase | Auth, PostgreSQL, Storage, Realtime |
| Hosting | Vercel | Preview and production deployment |
| Monitoring | Sentry | Exceptions and performance monitoring |
| Product analytics | PostHog | Privacy-conscious product events |
| Source control | GitHub | Code review, CI, release history |

Supabase hosts the backend services. Vercel is the recommended web host for Next.js. If Supabase Hosting is selected later, the web adapter and build configuration should be reviewed before switching; the application boundary stays the same.

## Folder model

```text
src/
  app/                 Route composition only
  components/          Shared, domain-neutral UI and layout
  features/
    listings/          Marketplace listing domain
      components/      Views
      hooks/           ViewModels and presentation state
      schemas/         Zod input contracts
    market/            Marketplace browse experience
  lib/                 Infrastructure clients and server utilities
  types/               Cross-domain types
supabase/migrations/   Versioned database and RLS changes
MD/                    Product and engineering documentation
```

## MVVM rules

- **View**: React components render props and call intent handlers. They do not directly query Supabase.
- **ViewModel**: feature hooks own UI state, validation transitions, loading and error states.
- **Model**: Zod schemas, TypeScript types and Supabase data access represent data contracts.
- **Repository boundary**: add repositories under `features/<domain>/repositories` when a feature first reads or writes Supabase. Views should never import `lib/supabase`.

## Domain boundaries

`listings` is Marketplace-only. `jobs` gets an independent feature folder and database tables. Auth, profiles, media upload, design tokens and shared UI can be reused; category-specific logic cannot leak across domains.

## React rendering and loading contracts

- Keep route files as composition boundaries. Server components fetch initial data; client components own interactions that need browser state. Do not convert static loading placeholders to client components.
- Persistent layouts own their navigation and main landmark. A nested loading boundary renders only the content it replaces, never a second sidebar or nested main.
- Extend `RouteSkeleton` variants and reuse actual list/grid classes. Community loading reuses `CommunityPostListSkeleton`; card surfaces reuse `ui-card` / `ui-panel`. Loading and loaded states must share responsive geometry.
- A loading boundary covers server suspension, not subsequent client fetches. Client feeds must retain their own pending, error and empty states. Do not replace a usable page with a blank Suspense fallback.
- Select visible records before photo lookup/signing. Batch their media request and run independent wishlist reads concurrently. Preserve authorization and avoid globally caching personalized data.
- Use functional state updates for asynchronous mutations. A failed deletion restores only the deleted record; restoring a captured whole list can erase additions completed during the request.
- Measure speed with equivalent data, authentication, viewport and cache conditions. Reduced requests or work are not evidence of a twofold improvement in full-page loading time.
