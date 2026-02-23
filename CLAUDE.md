# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GMSTools-TS is a TypeScript scraping toolkit for extracting data from the "Who's The Umpire" Game Management System (secure.whostheumpire.com). It provides two scrapers — appointments and contacts — both outputting to CSV files.

## Commands

```bash
# Run scrapers
npm run appointments     # Interactive appointments scraper
npm run contacts         # Interactive contacts scraper

# Development
npm run build           # Compile TypeScript to dist/
npm run check           # Lint + type-check (run before committing)
npm run lint            # ESLint with auto-fix
npm run type-check      # TypeScript type checking only

# Testing
npm test                # Run all tests
npm test -- --watch     # Watch mode
npm test -- csv.test    # Run single test file by name
npm run test:coverage   # Coverage report
```

## CI

GitHub Actions runs two workflows on push/PR to `main`:
- **Code Quality** (`code-quality.yml`) — ESLint + TypeScript type checking
- **Tests** (`test.yml`) — Jest test suite with coverage

Both use Node.js 20.

## Architecture

### Data Flow

```
CLI (scrapers/*/index.ts) → BaseScraper → AuthClient → BaseClient (Axios + cookie jar)
                                ↓
                          handlePagination() → processTableRows() → CsvWriter
```

### Core Layer (`src/core/`)

- **BaseClient** (`BaseClient.ts`) — Axios HTTP client with cookie jar (`tough-cookie`) for session management
- **AuthClient** (`auth/AuthClient.ts`) — Login flow, CSRF token extraction, archive mode activation for historical data access
- **Constants** (`constants/`) — Organization keys (`organizations.ts`) and contact type mappings (`contactTypes.ts`) matching the GMS website's select elements
- **Utils** (`utils/`) — Credential retrieval (`credentials.ts`), CSV writing (`csv.ts`), pagination (`scraper.ts`), HTTP client wrapper (`ScraperClient.ts`), console output (`console.ts`), date/time helpers (`time.ts`), interactive prompts (`prompt.ts`)

### Scraper Layer (`src/scrapers/`)

- **BaseScraper** (`base/BaseScraper.ts`) — Abstract base providing auth, pagination config, CSV writing, and readline prompt utilities
- **AppointmentsScraper** / **ContactsScraper** — Concrete implementations that:
  1. Call `initialize()` to authenticate
  2. Prompt user for search parameters (dates, organization, contact type)
  3. Use `handlePagination()` to iterate through paginated results
  4. Parse HTML tables with Cheerio
  5. Write results via `CsvWriter`

### Key Patterns

**Credential Chain** — 1Password CLI (`op`) → manual input prompt

**Pagination** — `handlePagination()` in `src/core/utils/scraper.ts` handles retry logic, rate limiting (`delayBetweenRequests: 3000ms`), and empty response detection (`maxEmptyResponses: 3`). Page size is 50. Scrapers provide a fetch function and a row-processing function.

**HTML Parsing** — Cheerio parses response HTML. Table data is in `#queryResultsTable_2 tbody tr`. Each scraper's `processTableRows()` method extracts column data with specific indexes.

**Configuration** — `src/config.ts` contains API timeouts (60s), retry settings (3 attempts, 3s delay), pagination limits, default search params, and the 1Password item name.

## Testing

Tests use Jest with `nock` for HTTP mocking. Test files:
- `__tests__/integration/appointments.test.ts` — Appointments scraper flow with mocked HTTP
- `__tests__/integration/contacts.test.ts` — Contacts scraper flow with mocked HTTP
- `__tests__/unit/csv.test.ts` — CSV writer
- `__tests__/helpers/mockData.ts` — Shared mock data
- `__tests__/setup.ts` — Test setup (nock configuration)

## External Dependencies

- **1Password CLI** (`op`) — Optional, for automatic credential retrieval. Item must be named "Who's the umpire" with username/password fields.
- **Who's The Umpire** — Target site at secure.whostheumpire.com. Uses form-based auth with CSRF protection.
