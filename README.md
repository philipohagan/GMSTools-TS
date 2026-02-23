# GMSTools-TS

A TypeScript scraping toolkit for extracting appointments and contacts data from the [Who's The Umpire](https://secure.whostheumpire.com) Game Management System. Outputs to CSV.

## Requirements

- Node.js 20+
- [1Password CLI](https://1password.com/downloads/command-line) (optional, for automatic credential retrieval)

## Setup

```bash
git clone https://github.com/phil/GMSTools-TS.git
cd GMSTools-TS
npm install
```

## Usage

```bash
npm run appointments   # Scrape appointments to CSV
npm run contacts       # Scrape contacts to CSV
```

Both commands will:
1. Fetch credentials from 1Password (or prompt for manual entry)
2. Ask for search parameters (date range, organization, contact type)
3. Download and save results to a CSV file

## Development

```bash
npm run build           # Compile TypeScript
npm run check           # Lint + type-check
npm test                # Run tests
npm run test:coverage   # Tests with coverage
```

## Architecture

- **Core** (`src/core/`) — HTTP client with cookie/session management, login/CSRF handling, 1Password credential retrieval
- **Scrapers** (`src/scrapers/`) — Appointments and contacts scrapers with HTML table parsing (Cheerio), pagination, and CSV output
- **Config** (`src/config.ts`) — API timeouts, pagination limits, search defaults

## License

ISC
