# Server-Side Contact Filtering

## Problem

The appointments scraper currently fetches all appointments then filters client-side by name. This is wasteful — the GMS server supports filtering by contact via the `find_contact_index_key` parameter, which corresponds to a `<select>` dropdown on the appointments page.

## Design

### Flow

1. User enters a name filter string (or leaves blank for all)
2. If a name is provided, GET the appointments page and parse the `#findContactIndexKey` `<select>` element
3. Build a list of `{name, key}` from `<option>` elements
4. Fuzzy match (case-insensitive substring) against the name filter
5. If multiple matches, present a selection prompt; if zero, report "not found" and exit
6. Pass the resolved key as `find_contact_index_key` in all paginated requests
7. Remove client-side filtering

### Changes to `AppointmentsScraper.ts`

**New method `fetchContactList()`** — GETs the appointments page, parses the `<select id="findContactIndexKey">` element, returns `Array<{name: string, key: string}>`.

**New method `resolveContactKey(nameFilter: string)`** — Calls `fetchContactList()`, does case-insensitive substring matching. One match returns the key. Multiple matches prompt user to pick. Zero matches returns null.

**Modified `run()`** — Name filter prompt moves before `getSearchParams()`. Resolved key passed into `getSearchParams()`.

**Modified `getSearchParams(contactKey?)`** — Accepts optional `contactKey`, uses it for `find_contact_index_key` (default `'0'`).

**Remove client-side filtering** — Delete the post-fetch filter logic (lines 178-191).

### Files unchanged

- `BaseScraper.ts` — no new base functionality needed
- `types.ts` — `SearchParams` already has `find_contact_index_key`
- `ScraperClient.ts` — already supports GET requests
