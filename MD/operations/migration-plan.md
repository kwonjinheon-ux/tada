# Static Prototype to React Migration

## Preserve first

The root-level `index.html`, `market.html`, `post-ad.html`, authentication pages, `styles.css` and page scripts are the visual prototype. They remain untouched during the first React foundation phase so current browser feedback remains available.

## Migration phases

1. **Foundation completed**: Next.js structure, shared header, design tokens, marketplace and post-ad route skeletons, schemas and docs.
2. **UI parity**: move static sections into feature components, comparing desktop, tablet and phone states against the current prototype.
3. **Supabase integration**: Auth, listing creation, image upload, RLS-protected browsing and saved listings.
4. **Production hardening**: tests, Sentry, PostHog consent, CI, previews, security review and launch checklist.
5. **Native clients**: expose a versioned API/domain contract that iOS and Android can consume. Do not couple native apps to React component state.

## Legacy cleanup rule

After a React route reaches visual and functional parity, move its static source to `legacy/` in a dedicated commit and update documentation. Do not delete the only visual reference during active migration.
