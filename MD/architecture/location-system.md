# New Zealand location system

All product location features use the shared New Zealand category system. The canonical data and matching helpers live in `src/data/nzLocations.ts` and `src/lib/market/nz-location.ts`; feature code must not create its own city, suburb, or GPS-nearest lists.

## Canonical fields

Persist the following fields where a record has a public or searchable location:

| Field | Purpose |
| --- | --- |
| `main_location` | One of the predefined main locations, including `Other New Zealand` |
| `sub_location` | A valid sub-location for the selected main location |
| `locality` | Reverse-geocoded city/locality retained for detail |
| `raw_suburb` | Reverse-geocoded suburb that does not fit the category list |
| `region` | Reverse-geocoded region |
| `latitude`, `longitude` | Coordinates for future radius search |

Keep legacy `region_city` and `region_suburb` synchronised to `main_location` and `sub_location` until every existing feature and stored record has migrated.

## UI and GPS

Use `ListingLocationSelector` for any editable location UI. It supplies the same mobile-first main/sub selection and calls the shared reverse-geocoding route. Manual changes clear GPS-derived raw fields and coordinates; GPS detection retains them.

GPS mapping must use `mapGpsLocationToCategory()`:

1. Match a known main city and known suburb.
2. If only the city is known, use its `Other {City}` category and preserve `raw_suburb`.
3. If no main city matches, use `Other New Zealand` plus the mapped region and preserve `locality`.
4. If reverse geocoding is insufficient, use `Other New Zealand → GPS Location Not Found`.

Always compare external names through `normalizeLocationName()` so Māori macrons, case, spaces, and punctuation cannot prevent a match.

## Search

Marketplace filters use `mainLocation` and `subLocation` URL parameters. Server queries must retain the legacy-column fallback while old listings exist. New location-based features should use these same parameters and fields rather than serialised display labels.
