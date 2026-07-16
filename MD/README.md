# Tada Engineering Notes

This folder is the maintained source of truth for product, design, architecture, security, and operations decisions made while moving Tada from a static prototype to a production marketplace.

## Reading order

1. [Architecture](./architecture/overview.md)
2. [Design system](./design/foundations.md)
3. [Marketplace domain](./product/marketplace.md)
4. [Security and Supabase RLS](./security/supabase-rls.md)
5. [Migration plan](./operations/migration-plan.md)
6. [Local development and deployment](./operations/development-and-deployment.md)

## Current state

- Legacy HTML/CSS/JS in the project root remains the visual reference during migration.
- The new application lives in `src/` and uses Next.js App Router, TypeScript, Tailwind CSS and Supabase.
- Marketplace is the first domain. Jobs is deliberately isolated as a future domain route.

## AI listing drafts

The listing form can generate an editable AI draft through `POST /api/ai/generate-listing`.
The API key is server-only: set `OPENAI_API_KEY` in `.env.local` for local development and set the same variable in Vercel's Development, Preview, and Production environments. Do not use a `NEXT_PUBLIC_OPENAI_API_KEY` variable.

`OPENAI_LISTING_MODEL` is optional and defaults to `gpt-5-mini`. The feature uses short-lived signed URLs for up to three compressed, user-owned listing images; those temporary files are removed after generation. `AI_LISTING_RATE_LIMIT_ENABLED` defaults to `true`; set it to `false` only during development testing to bypass the per-user three-drafts-per-ten-minutes quota. The duplicate-request guard remains enabled.

Before deploying, apply `supabase/migrations/20260716044100_create_ai_generation_usage.sql`. It creates the RLS-protected usage table that enforces the server-side generation limit. No API keys, prompts, full image URLs, or raw listing details are stored in that table.
