# Development and Deployment

## Local setup

```bash
npm install
copy .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. For a phone on the same Wi-Fi use the computer's LAN address with port `3000`; development firewall access may be required on Windows.

## Required checks

```bash
npm run typecheck
npm run lint
npm run build
```

## Deployment sequence

1. Create the Supabase project and set its URL/anon key in Vercel environment variables.
2. Apply reviewed migrations with the Supabase CLI.
3. Configure auth redirect URLs for local, preview and production domains.
4. Deploy the Next.js application to Vercel from GitHub.
5. Add Sentry and PostHog keys only after consent and privacy policy decisions are documented.

Never put `SUPABASE_SERVICE_ROLE_KEY` in Vercel variables prefixed with `NEXT_PUBLIC_`.
