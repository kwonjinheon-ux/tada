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
