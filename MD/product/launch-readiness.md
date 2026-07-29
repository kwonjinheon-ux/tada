# Tada Web Marketplace: Launch Readiness

## Purpose

This document defines the minimum bar for a limited public web launch. It is the baseline for the next nine roadmap stages; it does not authorize a native-app launch or a community launch.

## Launch scope

### Included

- Account creation and sign-in.
- Create, edit, publish, archive and delete a marketplace listing.
- Private image upload and signed-image delivery.
- Browse, search, filter, save and view a listing.
- In-app conversations, offers, notifications and basic seller profiles.
- English and Korean interface support.

### Explicitly excluded

- Payments, escrow and delivery fulfilment.
- Public community posts, groups, follows and a community feed.
- Native iOS and Android clients.
- Support for the five locale choices that do not yet have full translated copy.

## Primary user journeys

| Journey | Success condition |
| --- | --- |
| Visitor discovers a listing | Browse, search and filter return relevant published listings; opening a listing never exposes private media or seller data. |
| Member publishes a listing | A signed-in member can upload images, save a draft and publish a valid listing without creating orphaned media. |
| Buyer contacts a seller | A buyer can start one conversation per listing, send a message, make an offer and see the updated state. |
| Seller completes a trade | The seller can accept, decline, cancel or complete only permitted offer transitions, with both parties notified. |
| Member manages identity | A member can update profile, avatar and locale, and sign out from the web session. |
| Unsafe activity is handled | A user can report or block harmful activity, and an operator can review and act on it. |

## Release gates

All gates must pass before opening public sign-up. A staging deployment may proceed while gates are still in progress.

### Product gates

- No dead-end mobile primary-navigation action on any `/market` route.
- Empty, loading, error and signed-out states exist for every primary journey.
- English and Korean content is complete for every shipped screen; unsupported locale choices are not presented as fully translated.
- Listing status, offer status and unread indicators are understandable without relying only on colour.

### Security and abuse gates

- RLS policy tests cover anonymous, owner, non-owner, buyer and seller access for every public table and storage bucket.
- Rate limiting and bot protection exist for sign-up, listing publication, messages, offers and AI generation.
- Report, block and moderation review flows are available before public launch.
- Secret scanning, dependency auditing, backup/restore, retention and account-deletion procedures are documented and exercised.

### Reliability gates

- Automated tests cover sign-in, listing lifecycle, image upload, saved listings, messages, offers and notifications.
- Error monitoring, structured server logs and an uptime check are active in production.
- Database migration, rollback and incident-response runbooks are tested on staging.
- Key pages meet an agreed mobile performance budget on a mid-range device and a slow network.

### Data and platform gates

- Listing browse/search uses server-side filtering and cursor pagination; no user-facing result set is limited by a fixed client-side fetch window.
- API contracts have versioning, shared validation schemas and stable error codes for future native clients.
- Image variants and cache behaviour are defined for cards, galleries and avatars.

## Initial measurable targets

These are launch targets to validate on staging and production, not guarantees before measurement is installed.

| Area | Target |
| --- | --- |
| Listing publication | At least 95% of valid submissions complete without user retry. |
| Message delivery | A sent message appears for both participants within 5 seconds under normal conditions. |
| Core errors | No unhandled client or server error in the top five user journeys during release testing. |
| Security | Zero known cross-user RLS or storage access failures in the test matrix. |
| Mobile usability | Every primary action is usable at 320px width with keyboard and screen-reader labels. |

## Release decision

The release owner records one of the following against every gate:

- **Pass** — verified with a link to test or monitoring evidence.
- **Risk accepted** — scope is reduced, owner and expiry date are recorded.
- **Block** — public launch is paused until resolved.

No payment, native app or community feature is added to the launch scope without updating this document first.
