# Server-Side Contact Filtering Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace client-side name filtering with server-side filtering by resolving contact names to GMS contact keys from the appointments page dropdown.

**Architecture:** GET the appointments page to parse the `<select id="findContactIndexKey">` dropdown, fuzzy-match user input against contact names, and pass the resolved key as `find_contact_index_key` in search params. Remove client-side filtering entirely.

**Tech Stack:** TypeScript, Cheerio (HTML parsing), existing ScraperClient (GET requests), existing prompt utilities (selectFromList)

---

### Task 1: Add `fetchContactList()` method

**Files:**
- Modify: `src/scrapers/appointments/AppointmentsScraper.ts`
- Test: `src/__tests__/integration/appointments.test.ts`

**Step 1: Write the failing test**

Add to the `AppointmentsScraper Integration` describe block in `src/__tests__/integration/appointments.test.ts`:

```typescript
describe('Contact List Fetching', () => {
  it('should parse contact options from the appointments page dropdown', async () => {
    jest.spyOn(scraper['authClient'], 'login').mockResolvedValue({ success: true });

    const mockPageHtml = `
      <html><body>
        <select id="findContactIndexKey" name="find_contact_index_key">
          <option value="0">All contacts</option>
          <option value="ABC123">SMITH, John</option>
          <option value="DEF456">JONES, Sarah</option>
        </select>
      </body></html>
    `;

    mockAxios.get.mockResolvedValueOnce({
      data: mockPageHtml,
      status: 200
    });

    const contacts = await scraper['fetchContactList']();

    expect(contacts).toEqual([
      { name: 'SMITH, John', key: 'ABC123' },
      { name: 'JONES, Sarah', key: 'DEF456' }
    ]);
  });

  it('should skip the "All contacts" option with value "0"', async () => {
    jest.spyOn(scraper['authClient'], 'login').mockResolvedValue({ success: true });

    const mockPageHtml = `
      <html><body>
        <select id="findContactIndexKey" name="find_contact_index_key">
          <option value="0">All contacts</option>
          <option value="ABC123">SMITH, John</option>
        </select>
      </body></html>
    `;

    mockAxios.get.mockResolvedValueOnce({
      data: mockPageHtml,
      status: 200
    });

    const contacts = await scraper['fetchContactList']();

    expect(contacts).toHaveLength(1);
    expect(contacts[0]).toEqual({ name: 'SMITH, John', key: 'ABC123' });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- appointments.test`
Expected: FAIL — `scraper['fetchContactList'] is not a function`

**Step 3: Implement `fetchContactList()`**

Add this method to `AppointmentsScraper` class in `src/scrapers/appointments/AppointmentsScraper.ts`:

```typescript
private async fetchContactList(): Promise<Array<{ name: string; key: string }>> {
  const url = '/db_admin/appointments.php?function=view';
  const html = await this.client.get<string>(url, {
    Referer: 'https://secure.whostheumpire.com/db_admin/appointments.php?function=view'
  });

  const $ = cheerio.load(html);
  const contacts: Array<{ name: string; key: string }> = [];

  $('#findContactIndexKey option').each((_, el) => {
    const key = $(el).attr('value') || '';
    const name = $(el).text().trim();
    if (key && key !== '0') {
      contacts.push({ name, key });
    }
  });

  return contacts;
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- appointments.test`
Expected: PASS

**Step 5: Commit**

```bash
git add src/scrapers/appointments/AppointmentsScraper.ts src/__tests__/integration/appointments.test.ts
git commit -m "feat: add fetchContactList() to parse contact dropdown from GMS page"
```

---

### Task 2: Add `resolveContactKey()` method

**Files:**
- Modify: `src/scrapers/appointments/AppointmentsScraper.ts`
- Test: `src/__tests__/integration/appointments.test.ts`

**Step 1: Write the failing tests**

Add to the `Contact List Fetching` describe block:

```typescript
describe('Contact Key Resolution', () => {
  const mockContacts = [
    { name: 'SMITH, John', key: 'ABC123' },
    { name: 'SMITH, Jane', key: 'DEF456' },
    { name: 'JONES, Sarah', key: 'GHI789' }
  ];

  beforeEach(() => {
    jest.spyOn(scraper as unknown as { fetchContactList: () => Promise<typeof mockContacts> }, 'fetchContactList')
      .mockResolvedValue(mockContacts);
  });

  it('should return the key when exactly one contact matches', async () => {
    const result = await scraper['resolveContactKey']('jones');
    expect(result).toBe('GHI789');
  });

  it('should return null when no contacts match', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const result = await scraper['resolveContactKey']('nobody');
    expect(result).toBeNull();
    consoleSpy.mockRestore();
  });

  it('should prompt user to select when multiple contacts match', async () => {
    const selectSpy = jest.spyOn(
      jest.requireMock('../../core/utils/prompt') as typeof import('../../core/utils/prompt'),
      'selectFromList'
    );
    (selectSpy as jest.Mock).mockResolvedValueOnce('ABC123');

    const result = await scraper['resolveContactKey']('smith');
    expect(result).toBe('ABC123');
    expect(selectSpy).toHaveBeenCalled();
  });

  it('should match case-insensitively', async () => {
    const result = await scraper['resolveContactKey']('JONES');
    expect(result).toBe('GHI789');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- appointments.test`
Expected: FAIL — `scraper['resolveContactKey'] is not a function`

**Step 3: Implement `resolveContactKey()`**

Add this method to `AppointmentsScraper` class:

```typescript
private async resolveContactKey(nameFilter: string): Promise<string | null> {
  console.log(`\nLooking up contact "${nameFilter}"...`);
  const contacts = await this.fetchContactList();
  const filter = nameFilter.toLowerCase();

  const matches = contacts.filter((c) => c.name.toLowerCase().includes(filter));

  if (matches.length === 0) {
    console.log(`No contacts found matching "${nameFilter}".`);
    return null;
  }

  if (matches.length === 1) {
    console.log(`Found contact: ${matches[0].name}`);
    return matches[0].key;
  }

  console.log(`\nMultiple contacts match "${nameFilter}":`);
  const options: SelectionOption<string>[] = matches.map((m) => ({
    name: m.name,
    value: m.key
  }));

  return selectFromList(this.rl, options, 'Select contact');
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- appointments.test`
Expected: PASS

**Step 5: Commit**

```bash
git add src/scrapers/appointments/AppointmentsScraper.ts src/__tests__/integration/appointments.test.ts
git commit -m "feat: add resolveContactKey() with fuzzy matching and selection prompt"
```

---

### Task 3: Wire up server-side filtering in `run()` and `getSearchParams()`

**Files:**
- Modify: `src/scrapers/appointments/AppointmentsScraper.ts`
- Modify: `src/__tests__/integration/appointments.test.ts`

**Step 1: Write the failing test**

Add to the `AppointmentsScraper Integration` describe block:

```typescript
describe('Server-Side Contact Filtering', () => {
  it('should pass contact key to search params when name is provided', async () => {
    jest.spyOn(scraper['authClient'], 'login').mockResolvedValue({ success: true });

    // Mock resolveContactKey to return a key
    jest.spyOn(
      scraper as unknown as { resolveContactKey: (name: string) => Promise<string | null> },
      'resolveContactKey'
    ).mockResolvedValue('ABC123');

    // Mock prompt responses
    const questionSpy = promptUtils.question as jest.Mock;
    questionSpy
      .mockResolvedValueOnce('Y')      // archive mode
      .mockResolvedValueOnce('smith')   // name filter
      .mockResolvedValueOnce('');       // output filename

    const validateSpy = promptUtils.validateInput as jest.Mock;
    validateSpy
      .mockResolvedValueOnce('01-01-2024')  // from date
      .mockResolvedValueOnce('31-01-2024'); // to date

    // Mock empty response to end quickly
    mockAxios.post.mockResolvedValue({
      data: createMockTableHtml([]),
      status: 200
    });

    const fetchSpy = jest.spyOn(
      scraper as unknown as { fetchAppointmentsPage: (offset: number, params: SearchParams) => Promise<unknown> },
      'fetchAppointmentsPage'
    );

    await scraper.run();

    // Verify the search params passed to fetchAppointmentsPage include the contact key
    if (fetchSpy.mock.calls.length > 0) {
      const searchParams = fetchSpy.mock.calls[0][1] as SearchParams;
      expect(searchParams.find_contact_index_key).toBe('ABC123');
    }
  });

  it('should use "0" for contact key when no name filter is provided', async () => {
    jest.spyOn(scraper['authClient'], 'login').mockResolvedValue({ success: true });

    const questionSpy = promptUtils.question as jest.Mock;
    questionSpy
      .mockResolvedValueOnce('Y')   // archive mode
      .mockResolvedValueOnce('')    // name filter (blank)
      .mockResolvedValueOnce('');   // output filename

    mockAxios.post.mockResolvedValue({
      data: createMockTableHtml([]),
      status: 200
    });

    const getSearchParamsSpy = jest.spyOn(
      scraper as unknown as { getSearchParams: (contactKey?: string) => Promise<SearchParams> },
      'getSearchParams'
    );

    await scraper.run();

    if (getSearchParamsSpy.mock.calls.length > 0) {
      const params = await getSearchParamsSpy.mock.results[0].value;
      expect(params.find_contact_index_key).toBe('0');
    }
  });
});
```

Note: The `createMockTableHtml` function is already defined at the bottom of the test file (line 322).

**Step 2: Run tests to verify they fail**

Run: `npm test -- appointments.test`
Expected: FAIL — contact key is always `'0'`

**Step 3: Modify `getSearchParams()` to accept optional contact key**

In `src/scrapers/appointments/AppointmentsScraper.ts`, change the `getSearchParams` signature and body:

```typescript
private async getSearchParams(contactKey?: string): Promise<SearchParams> {
```

And change line 51 from:
```typescript
      find_contact_index_key: '0',
```
to:
```typescript
      find_contact_index_key: contactKey || '0',
```

**Step 4: Modify `fetchAppointmentsPage()` to use contact key from search params**

In `fetchAppointmentsPage()`, change line 129 from:
```typescript
        find_contact_index_key: '0',
```
to:
```typescript
        find_contact_index_key: searchParams.find_contact_index_key,
```

**Step 5: Rewrite `run()` to use server-side filtering**

Replace the `run()` method body (lines 158-205) with:

```typescript
public async run(): Promise<void> {
  try {
    console.log('Initializing appointments scraper...');

    // Ask about archive mode
    const useArchive = await question(this.rl, 'Enable archive mode? (Y/N): ');
    const archiveMode = useArchive.toLowerCase() !== 'n';

    const initialized = await this.initialize({ useArchive: archiveMode });
    if (!initialized) {
      console.error('Failed to initialize. Exiting...');
      return;
    }

    // Ask for name filter before search params (needs server lookup)
    const nameFilter = await question(this.rl, 'Filter by official name (leave blank for all): ');

    let contactKey: string | undefined;
    if (nameFilter) {
      const resolved = await this.resolveContactKey(nameFilter);
      if (resolved === null) {
        return;
      }
      contactKey = resolved;
    }

    const searchParams = await this.getSearchParams(contactKey);

    // Get output filename
    const defaultFilename = `appointments_${searchParams.find_from_date}_to_${searchParams.find_to_date}.csv`;
    const outputFilename = await this.getOutputFilename(defaultFilename);

    const appointmentsData = await this.getAppointmentsData(searchParams);

    if (appointmentsData.length === 0) {
      console.log('No appointments found. Exiting...');
      return;
    }

    await this.csvWriter.writeToFile(appointmentsData, outputFilename);
    console.log(`\nAppointments data saved to ${outputFilename}`);
  } catch (error) {
    console.error('Error running appointments scraper:', error);
  } finally {
    this.cleanup();
  }
}
```

**Step 6: Run tests to verify they pass**

Run: `npm test -- appointments.test`
Expected: PASS

**Step 7: Run full check**

Run: `npm run check`
Expected: No lint or type errors

**Step 8: Commit**

```bash
git add src/scrapers/appointments/AppointmentsScraper.ts src/__tests__/integration/appointments.test.ts
git commit -m "feat: wire up server-side contact filtering, remove client-side filter"
```

---

### Task 4: Update existing tests for new prompt order

**Files:**
- Modify: `src/__tests__/integration/appointments.test.ts`

The `run()` method now asks for the name filter before search params (dates, org). Existing tests that mock prompt responses need their mock order updated.

**Step 1: Review and fix prompt order in existing integration test**

The `should fetch and process appointments with pagination` test (line 160) mocks `scraper.question`. The new prompt order is:
1. `'Enable archive mode?'` → `'Y'`
2. `'Filter by official name'` → `''` (blank, no filter)
3. Then `validateInput` for dates and `selectFromList` for org (handled by module mock)
4. `'Enter output filename'` → `''`

Update the question mock in that test to handle the name filter prompt:

```typescript
.mockImplementation(async (query: string) => {
  if (query.includes('archive mode')) return 'Y';
  if (query.includes('official name')) return '';
  if (query.includes('output filename')) return 'appointments.csv';
  return '';
})
```

**Step 2: Run full test suite**

Run: `npm test`
Expected: ALL PASS

**Step 3: Run full check**

Run: `npm run check`
Expected: No errors

**Step 4: Commit**

```bash
git add src/__tests__/integration/appointments.test.ts
git commit -m "test: update existing tests for new prompt order with name filter"
```
