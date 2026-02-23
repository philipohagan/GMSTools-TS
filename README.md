# GMSTools

A collection of tools for managing Game Management System data, currently including an appointments scraper and contacts scraper for Who's The Umpire. Built with TypeScript.

## Prerequisites & Installation

### Windows
1. Install Node.js
   - Download Node.js 20.x from [nodejs.org](https://nodejs.org)
   - Run the installer, accepting all defaults
   - Open Command Prompt and verify installation:
     ```bash
     node --version  # Should show v20.x.x
     npm --version
     ```

2. Install 1Password CLI
   - Download from [1Password CLI](https://1password.com/downloads/command-line)
   - Run the installer
   - Open Command Prompt and verify installation:
     ```bash
     op --version
     ```

### macOS
1. Install Homebrew (if not already installed)
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

2. Install Node.js and 1Password CLI
   ```bash
   brew install node
   brew install --cask 1password-cli
   ```

3. Verify installations:
   ```bash
   node --version
   npm --version
   op --version
   ```

### Setup Project
1. Clone this repository
2. Install dependencies:
   ```bash
   cd GMSTools
   npm install
   ```

## 1Password Configuration

The scraper expects your Who's The Umpire credentials to be stored in 1Password with the following configuration:

1. Item name: "Who's the umpire" (exact spelling and case)
2. Username field: Your Who's The Umpire email
3. Password field: Your Who's The Umpire password

To verify your 1Password setup:
```bash
op item get "Who's the umpire" --format json
```

## Running the Appointments Scraper

```bash
npm run appointments
```

The script will:
1. Fetch credentials from 1Password (or prompt if not found)
2. Ask for date range and filtering preferences
3. Download appointment data
4. Save to appointments_YYYY-MM-DD_to_YYYY-MM-DD.csv in the project directory

## Running the Contacts Scraper

```bash
npm run contacts
```

The script will:
1. Fetch credentials from 1Password (or prompt if not found)
2. Ask for organization and contact type preferences
3. Download contacts data
4. Save to contacts.csv in the project directory

## Development

### Building the Project
```bash
npm run build
```

### Testing
```bash
npm run test          # Run all tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
```

### Code Quality
```bash
npm run lint         # Run ESLint with auto-fix
npm run type-check   # Run TypeScript type checking
npm run check        # Run both linting and type checking
```

## Troubleshooting

If you encounter credential issues:
1. Ensure you're signed into 1Password CLI: `op signin`
2. Verify the item name and field configuration
3. If issues persist, the script will fall back to manual credential entry