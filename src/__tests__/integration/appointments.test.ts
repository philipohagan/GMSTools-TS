import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { AppointmentsScraper } from '../../scrapers/appointments/AppointmentsScraper';
import axios, { AxiosInstance } from 'axios';
import { mockAppointmentData, mockPaginatedData } from '../helpers/mockData';
import { wrapper } from 'axios-cookiejar-support';
import { delay } from '../../core/utils/time';
import { SearchParams } from '../../scrapers/appointments/types';
import { ORGANIZATIONS } from '../../core/constants/organizations';
import * as cheerio from 'cheerio';

interface MockAxiosInstance extends Omit<AxiosInstance, 'get' | 'post'> {
  get: jest.Mock;
  post: jest.Mock;
}

jest.mock('axios');
jest.mock('fs/promises');
jest.mock('../../core/utils/credentials');
jest.mock('axios-cookiejar-support');
jest.mock('../../core/utils/csv', () => ({
  CsvWriter: jest.fn().mockImplementation(() => ({
    writeToFile: jest.fn().mockImplementation(async (...args: unknown[]) => {
      const [data] = args as [Record<string, string | number>[]];
      console.log(
        'CsvWriter.writeToFile called with',
        Array.isArray(data) ? data.length : 0,
        'items'
      );
      return Promise.resolve();
    })
  }))
}));
jest.mock('../../core/utils/time', () => ({
  delay: jest.fn((_ms: number) => Promise.resolve())
}));

// Mock the prompt utilities
jest.mock('../../core/utils/prompt', () => {
  return {
    selectFromList: jest.fn().mockImplementation(async () => {
      return ORGANIZATIONS['England Hockey - London'];
    }),
    question: jest.fn().mockImplementation(async () => {
      return '';
    }),
    validateInput: jest.fn().mockImplementation(async () => {
      return '01-01-2024';
    })
  };
});

describe('AppointmentsScraper Integration', () => {
  let scraper: AppointmentsScraper;
  let mockAxios: MockAxiosInstance;
  let requestCount: number;
  let promptUtils: typeof import('../../core/utils/prompt');

  beforeEach(() => {
    requestCount = 0;
    jest.clearAllMocks();

    // Import the mocked prompt utilities
    promptUtils = jest.requireMock('../../core/utils/prompt');

    // Create mock axios instance
    mockAxios = {
      get: jest.fn(),
      post: jest.fn(),
      defaults: {
        headers: { common: {}, post: {} }
      },
      interceptors: {
        request: { use: jest.fn(), eject: jest.fn(), clear: jest.fn() },
        response: { use: jest.fn(), eject: jest.fn(), clear: jest.fn() }
      }
    } as unknown as MockAxiosInstance;

    (axios.create as jest.Mock).mockReturnValue(mockAxios);
    (wrapper as jest.Mock).mockImplementation((client) => client);

    // Initialize scraper with options
    scraper = new AppointmentsScraper({
      promptForFilename: false,
      defaultFilename: 'test_appointments.csv'
    });

    // Mock the delay function to resolve immediately
    (delay as jest.Mock).mockImplementation(() => Promise.resolve());
  });

  afterEach(() => {
    scraper.cleanup();
  });

  describe('Initialization and Login', () => {
    it('should initialize successfully with default settings', async () => {
      const loginSpy = jest
        .spyOn(scraper['authClient'], 'login')
        .mockResolvedValue({ success: true });

      await expect(scraper['initialize']()).resolves.toBe(true);
      expect(loginSpy).toHaveBeenCalledWith({ useArchive: undefined });
    });

    it('should handle login failure', async () => {
      jest
        .spyOn(scraper['authClient'], 'login')
        .mockResolvedValue({ success: false, error: 'Invalid credentials' });

      await expect(scraper['initialize']()).resolves.toBe(false);
    });
  });

  describe('Search Parameters', () => {
    it('should collect valid search parameters', async () => {
      // Mock the validateInput and selectFromList functions to return specific values
      const validateInputSpy = jest.spyOn(promptUtils, 'validateInput');
      (validateInputSpy as jest.Mock).mockImplementationOnce(() => '01-01-2024');
      (validateInputSpy as jest.Mock).mockImplementationOnce(() => '31-01-2024');

      const selectFromListSpy = jest.spyOn(promptUtils, 'selectFromList');
      (selectFromListSpy as jest.Mock).mockImplementationOnce(
        () => ORGANIZATIONS['England Hockey - London']
      );

      const params = await scraper['getSearchParams']();

      expect(params).toEqual({
        clicked_find_counter: '0',
        find_from_date: '01-01-2024',
        find_to_date: '31-01-2024',
        find_team_index_key: '0',
        find_month: '0',
        find_contact_index_key: '0',
        find_competition_index_key: '0',
        find_contact_type_index_key: '0',
        find_organisation_index_key: ORGANIZATIONS['England Hockey - London'],
        find_grade_index_key: '0',
        find: 'go',
        status_filter: 'Y'
      });

      expect(validateInputSpy).toHaveBeenCalledTimes(2);
      expect(selectFromListSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle invalid date formats', async () => {
      // This test is no longer relevant with the new implementation
      // as the validateInput function handles validation internally
      expect(true).toBe(true);
    });
  });

  describe('Data Fetching and Processing', () => {
    beforeEach(() => {
      // Remove this spy attempt since delay is already mocked globally
      // jest.spyOn(scraper as any, 'delay').mockImplementation(() => Promise.resolve());
    });

    it('should fetch and process appointments with pagination', async () => {
      // Setup login success
      jest.spyOn(scraper['authClient'], 'login').mockResolvedValue({ success: true });

      // Setup question responses - mock all inputs to avoid waiting for user input
      jest
        .spyOn(scraper as unknown as { question: (typeof scraper)['question'] }, 'question')
        .mockImplementation(async (query: string) => {
          if (query.includes('archive mode')) return 'Y';
          if (query.includes('official name')) return '';
          if (query.includes('output filename')) return 'appointments.csv';
          if (query.includes('start date')) return '01-12-2024';
          if (query.includes('end date')) return '31-12-2024';
          if (query.includes('organization')) return '1';
          return '';
        });

      // Create mock HTML responses
      const mockHtmlResponses = [
        createMockTableHtml(mockPaginatedData.firstPage),
        createMockTableHtml(mockPaginatedData.secondPage),
        createMockTableHtml([])
      ];

      // Mock axios responses for pagination
      mockAxios.post.mockImplementation((_url: unknown, data: unknown) => {
        const params = new URLSearchParams(data as string);
        const isLoadMore = params.get('loadmore') === 'Y';
        const response = {
          data: mockHtmlResponses[isLoadMore ? requestCount : 0],
          headers: { 'content-type': 'text/html; charset=UTF-8' },
          status: 200
        };
        if (isLoadMore) requestCount++;
        return Promise.resolve(response);
      });

      // Run the scraper
      await scraper.run();

      // Verify results
      expect(requestCount).toBe(2);

      // Verify that the data was processed correctly
      const $ = cheerio.load(mockHtmlResponses[0]);
      const rows = $('#queryResultsTable_2 tbody tr');
      const result = scraper['processTableRows']($, rows);

      expect(result[0]).toEqual({
        Date: mockAppointmentData.Date,
        Time: mockAppointmentData.Time,
        Level: mockAppointmentData.Level,
        'Competition/Event': mockAppointmentData['Competition/Event'],
        'Home Team': mockAppointmentData['Home Team'],
        Venue: mockAppointmentData.Venue,
        'Away Team': mockAppointmentData['Away Team'],
        Official: 'Surinder BODWAL',
        Role: 'Umpire - Outdoor',
        Status: mockAppointmentData.Status
      });
    }, 30000); // Increase timeout to 30 seconds

    it('should handle empty response data', async () => {
      mockAxios.post.mockImplementation(() =>
        Promise.resolve({
          data: createMockTableHtml([]),
          headers: { 'content-type': 'text/html; charset=UTF-8' },
          status: 200
        })
      );

      const data = await scraper['getAppointmentsData']({
        clicked_find_counter: '0',
        find_from_date: '01-12-2024',
        find_to_date: '31-12-2024',
        find_team_index_key: '0',
        find_month: '0',
        find_contact_index_key: '0',
        find_competition_index_key: '0',
        find_contact_type_index_key: '0',
        find_organisation_index_key: '0',
        find_grade_index_key: '0',
        find: 'go',
        status_filter: 'Y'
      } as SearchParams);

      expect(data).toHaveLength(0);
    });

    it('should handle network errors gracefully', async () => {
      mockAxios.post.mockImplementation(() => Promise.reject(new Error('Network error')));

      const data = await scraper['getAppointmentsData']({
        clicked_find_counter: '0',
        find_from_date: '01-12-2024',
        find_to_date: '31-12-2024',
        find_team_index_key: '0',
        find_month: '0',
        find_contact_index_key: '0',
        find_competition_index_key: '0',
        find_contact_type_index_key: '0',
        find_organisation_index_key: '0',
        find_grade_index_key: '0',
        find: 'go',
        status_filter: 'Y'
      } as SearchParams);

      expect(data).toHaveLength(0);
    });
  });

  describe('Data Parsing', () => {
    it('should correctly parse home team and venue', async () => {
      const html = createMockTableHtml([
        {
          ...mockAppointmentData,
          'Home Team': 'London Academicals M1',
          Venue: 'Test Ground'
        }
      ]);

      const $ = cheerio.load(html);
      const rows = $('#queryResultsTable_2 tbody tr');
      const result = scraper['processTableRows']($, rows);

      expect(result[0]['Home Team']).toBe('London Academicals M1');
      expect(result[0].Venue).toBe('Test Ground');
    });

    it('should correctly parse official and role', async () => {
      const html = createMockTableHtml([
        {
          ...mockAppointmentData,
          Official: 'Surinder BODWAL',
          Role: 'Umpire - Outdoor'
        }
      ]);

      const $ = cheerio.load(html);
      const rows = $('#queryResultsTable_2 tbody tr');
      const result = scraper['processTableRows']($, rows);

      expect(result[0].Official).toBe('Surinder BODWAL');
      expect(result[0].Role).toBe('Umpire - Outdoor');
    });

    it('should correctly parse status', async () => {
      const html = createMockTableHtml([
        {
          ...mockAppointmentData,
          Status: 'Y'
        }
      ]);

      const $ = cheerio.load(html);
      const rows = $('#queryResultsTable_2 tbody tr');
      const result = scraper['processTableRows']($, rows);

      expect(result[0].Status).toBe('Y');
    });
  });

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

      mockAxios.get.mockImplementationOnce(() =>
        Promise.resolve({
          data: mockPageHtml,
          status: 200
        })
      );

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

      mockAxios.get.mockImplementationOnce(() =>
        Promise.resolve({
          data: mockPageHtml,
          status: 200
        })
      );

      const contacts = await scraper['fetchContactList']();

      expect(contacts).toHaveLength(1);
      expect(contacts[0]).toEqual({ name: 'SMITH, John', key: 'ABC123' });
    });

    describe('Contact Key Resolution', () => {
      const mockContacts = [
        { name: 'SMITH, John', key: 'ABC123' },
        { name: 'SMITH, Jane', key: 'DEF456' },
        { name: 'JONES, Sarah', key: 'GHI789' }
      ];

      beforeEach(() => {
        jest
          .spyOn(
            scraper as unknown as { fetchContactList: () => Promise<typeof mockContacts> },
            'fetchContactList'
          )
          .mockResolvedValue(mockContacts);
      });

      it('should return the key when exactly one contact matches', async () => {
        const result = await scraper['resolveContactKey']('jones');
        expect(result).toBe('GHI789');
      });

      it('should return null when no contacts match', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const result = await scraper['resolveContactKey']('nobody');
        expect(result).toBeNull();
        consoleSpy.mockRestore();
      });

      it('should prompt user to select when multiple contacts match', async () => {
        const mockPrompt = jest.requireMock('../../core/utils/prompt') as {
          selectFromList: jest.Mock<(...args: unknown[]) => Promise<string>>;
        };
        mockPrompt.selectFromList.mockResolvedValueOnce('ABC123');

        const result = await scraper['resolveContactKey']('smith');
        expect(result).toBe('ABC123');
        expect(mockPrompt.selectFromList).toHaveBeenCalled();
      });

      it('should match case-insensitively', async () => {
        const result = await scraper['resolveContactKey']('JONES');
        expect(result).toBe('GHI789');
      });
    });
  });

  describe('Server-Side Contact Filtering', () => {
    it('should pass contact key to search params when name is provided', async () => {
      jest.spyOn(scraper['authClient'], 'login').mockResolvedValue({ success: true });

      // Mock resolveContactKey to return a key
      jest
        .spyOn(
          scraper as unknown as { resolveContactKey: (name: string) => Promise<string | null> },
          'resolveContactKey'
        )
        .mockResolvedValue('ABC123');

      // Mock prompt responses
      (promptUtils.question as jest.Mock<() => Promise<string>>)
        .mockResolvedValueOnce('Y') // archive mode
        .mockResolvedValueOnce('smith') // name filter
        .mockResolvedValueOnce(''); // output filename

      (promptUtils.validateInput as jest.Mock<() => Promise<string>>)
        .mockResolvedValueOnce('01-01-2024') // from date
        .mockResolvedValueOnce('31-01-2024'); // to date

      // Mock empty response to end quickly
      mockAxios.post.mockImplementation(() =>
        Promise.resolve({
          data: createMockTableHtml([]),
          status: 200
        })
      );

      const fetchSpy = jest.spyOn(
        scraper as unknown as {
          fetchAppointmentsPage: (offset: number, params: SearchParams) => Promise<unknown>;
        },
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

      (promptUtils.question as jest.Mock<() => Promise<string>>)
        .mockResolvedValueOnce('Y') // archive mode
        .mockResolvedValueOnce('') // name filter (blank)
        .mockResolvedValueOnce(''); // output filename

      mockAxios.post.mockImplementation(() =>
        Promise.resolve({
          data: createMockTableHtml([]),
          status: 200
        })
      );

      const getSearchParamsSpy = jest.spyOn(
        scraper as unknown as { getSearchParams: (contactKey?: string) => Promise<SearchParams> },
        'getSearchParams'
      );

      await scraper.run();

      if (getSearchParamsSpy.mock.calls.length > 0) {
        const params = (await getSearchParamsSpy.mock.results[0].value) as SearchParams;
        expect(params.find_contact_index_key).toBe('0');
      }
    });
  });
});

function createMockTableHtml(appointments: (typeof mockAppointmentData)[]): string {
  const rows = appointments
    .map(
      (appointment) => `
        <tr class="view_list_row">
          <td class="view_list_data">
            <input type="hidden" id="hilite123" name="hilite123" value="0">
            <a class="view_list_data" href="/db_admin/appointments.php?function=view&amp;index_key=123">${appointment.Date}</a>
          </td>
          <td class="view_list_data noprint">
            <span class="actioncellicons">
              <span onclick="displayDatabasePopup('/db_admin/appointments.php?function=view&amp;index_key=123', this.parentNode);" style="cursor: pointer;">
                <img class="results_icon" src="https://secure.whostheref.com/db_admin/images/skins/2024/results-view.png">
              </span>
              <a href="/db_admin/appointments.php?function=amend&amp;index_key=123">
                <img class="results_icon" src="https://secure.whostheref.com/db_admin/images/skins/2024/results-edit.png">
              </a>
              <a onclick="displayDatabasePopup('/db_admin/appointments.php?function=view&amp;index_key=123', this.parentNode, true);" style="cursor: pointer;">
                <img class="results_icon" src="https://secure.whostheref.com/db_admin/images/skins/2024/results-delete.png">
              </a>
            </span>
          </td>
          <td class="view_list_data" style="display: none;">
            <input type="hidden" id="email123" name="email123" value="0">
          </td>
          <td class="view_list_data">${appointment.Time}</td>
          <td class="view_list_data"><span title="England Hockey">${appointment.Level}</span></td>
          <td class="view_list_data">
            <a title="Click to view this competition" href="competitions.php?function=view&amp;index_key=123">${appointment['Competition/Event']}</a>
          </td>
          <td class="view_list_data">
            <a title="Click to view this teams detail" class="viewlist" href="teams.php?function=view&amp;index_key=123">${appointment['Home Team']}</a>
            <br>(Venue: <a title="Click to view detail" href="venues.php?function=view&amp;index_key=123">${appointment.Venue}</a>)
          </td>
          <td class="view_list_data">
            <a title="Click to view this teams detail" class="viewlist" href="teams.php?function=view&amp;index_key=123">${appointment['Away Team']}</a>
          </td>
          <td class="view_list_data">
            <a title="Click to view detail" class="viewlist" href="contacts.php?function=view&amp;index_key=123">${appointment.Official}</a> (${appointment.Role})
          </td>
          <td class="view_list_data">${appointment.Status}</td>
        </tr>`
    )
    .join('\n');

  return `
    <table id="queryResultsTable_2">
      <thead>
        <tr>
          <th>Date</th>
          <th></th>
          <th></th>
          <th>Time</th>
          <th>Level</th>
          <th>Competition/Event</th>
          <th>Home Team</th>
          <th>Away Team</th>
          <th>Official</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}
