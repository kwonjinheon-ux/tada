# Advertising management

## Architecture

Advertising is served through `AdSlot`, which requests a server-selected candidate for one placement and device. Inactive, scheduled, expired, over-cap, unsupported-device, or disabled-placement ads return `null`; no empty ad container is rendered.

- Providers: `adsense`, `sponsor`
- Placements: market top/feed/sidebar, search feed, and product detail middle/bottom
- Sponsor selection: highest `priority` first, then weighted random selection using frequency weights 1/2/4/7/12.
- Serving modes: sponsor-first, AdSense-first, weighted mix, sponsor-only, and AdSense-only.
- Feed insertion: after 8 products, then every 12 products, without changing the listing data array.

## Security

- Admin operations must use the existing server-side `isMarketModerator` authorization check.
- Sponsor destinations are validated as HTTPS URLs by Zod; no arbitrary HTML or JavaScript is stored or executed.
- Public selection uses the restricted `active_ad_candidates` view, which excludes admin notes and author metadata.
- Sponsor links use `rel="sponsored noopener noreferrer"`.
- Events are rate-limited with a short-lived cookie and only record bounded, validated values.

## Database

Apply `202607310002_create_advertising.sql` before enabling the feature. It creates `ads`, `ad_placement_settings`, and `ad_events`, RLS policies, public safe views, placement defaults, and reporting indexes.

## Operations

1. Create an active AdSense entry with a valid client ID and slot ID, or create a sponsor entry with HTTPS asset URLs, destination URL, and alt text.
2. Set placement/device support and dates. Mobile sponsors require a mobile asset unless responsive fallback is explicitly enabled.
3. Set placement serving mode and, for weighted mix, percentages totaling 100.
4. For production AdSense, verify the site and publisher account in Google AdSense, obtain approved client/slot IDs, and configure consent/privacy requirements before activation.
