# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GMSTools is a TypeScript-based scraping toolkit for extracting data from the "Who's The Umpire" Game Management System (secure.whostheumpire.com). It currently provides two scrapers: appointments and contacts, both outputting to CSV files.

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

## Architecture

### Core Layer (`src/core/`)

- **BaseClient** - Axios HTTP client with cookie jar support for session management
- **AuthClient** - Handles login flow, CSRF tokens, and archive mode for accessing historical data
- **CredentialManager** - Retrieves credentials from 1Password CLI (`op` command), falls back to manual input

### Scraper Layer (`src/scrapers/`)

- **BaseScraper** - Abstract base providing auth, pagination config, CSV writing, and readline prompt utilities
- **AppointmentsScraper** / **ContactsScraper** - Concrete implementations that:
  1. Call `initialize()` to authenticate
  2. Prompt user for search parameters (dates, organization, contact type)
  3. Use `handlePagination()` to iterate through paginated results
  4. Parse HTML tables with Cheerio
  5. Write results via `CsvWriter`

### Key Patterns

**Pagination** - The `handlePagination()` function in `src/core/utils/scraper.ts` handles retry logic, rate limiting, and empty response detection. Scrapers provide a fetch function and a row-processing function.

**HTML Parsing** - Cheerio parses response HTML. Table data is in `#queryResultsTable_2 tbody tr`. Each scraper's `processTableRows()` method extracts column data with specific indexes.

**Configuration** - `src/config.ts` contains API timeouts, pagination limits, default search params, and the 1Password item name for credentials.

## Testing

Tests use Jest with `nock` for HTTP mocking. Integration tests (`src/__tests__/integration/`) test full scraper flows with mocked HTTP responses. Test setup is in `src/__tests__/setup.ts`.

## External Dependencies

- **1Password CLI** (`op`) - Required for automatic credential retrieval. Item must be named "Who's the umpire" with username/password fields.
- **Who's The Umpire** - Target site at secure.whostheumpire.com. Uses form-based auth with CSRF protection.
