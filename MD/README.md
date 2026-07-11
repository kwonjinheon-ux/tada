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
