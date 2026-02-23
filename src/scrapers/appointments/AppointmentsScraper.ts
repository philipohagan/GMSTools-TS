import * as cheerio from 'cheerio';
import { BaseScraper } from '../base/BaseScraper';
import { SearchParams, AppointmentData } from './types';
import type { CheerioAPI, Cheerio } from 'cheerio';
import type { Element } from 'domhandler';
import { createPaginationParams, handlePagination } from '../../core/utils/scraper';
import { ORGANIZATIONS, OrganizationKey } from '../../core/constants/organizations';
import { ScraperOptions } from '../base/types';
import { selectFromList, SelectionOption, validateInput, question } from '../../core/utils/prompt';

export class AppointmentsScraper extends BaseScraper {
  private readonly ORGANIZATIONS = ORGANIZATIONS;

  constructor(options: ScraperOptions = {}) {
    super(options);
  }

  private async getSearchParams(contactKey?: string): Promise<SearchParams> {
    const dateRegex = /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-\d{4}$/;
    const dateErrorMsg = 'Invalid date format. Please use DD-MM-YYYY (e.g., 01-12-2024)';

    const from_date = await validateInput(
      this.rl,
      'Enter start date (DD-MM-YYYY): ',
      dateRegex,
      dateErrorMsg
    );

    const to_date = await validateInput(
      this.rl,
      'Enter end date (DD-MM-YYYY): ',
      dateRegex,
      dateErrorMsg
    );

    console.log('\nSelect organization:');
    const orgKeys = Object.keys(this.ORGANIZATIONS) as OrganizationKey[];
    const orgOptions: SelectionOption<string>[] = orgKeys.map((key) => ({
      name: key,
      value: this.ORGANIZATIONS[key]
    }));

    const orgIndex = await selectFromList(this.rl, orgOptions, 'Enter number');

    return {
      clicked_find_counter: '0',
      find_from_date: from_date,
      find_to_date: to_date,
      find_team_index_key: '0',
      find_month: '0',
      find_contact_index_key: contactKey || '0',
      find_competition_index_key: '0',
      find_contact_type_index_key: '0',
      find_organisation_index_key: orgIndex,
      find_grade_index_key: '0',
      find: 'go',
      status_filter: 'Y'
    };
  }

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

  private processTableRows($: CheerioAPI, rows: Cheerio<Element>): AppointmentData[] {
    const batchData: AppointmentData[] = [];

    rows.each((_, row) => {
      const columns = $(row).find('td');
      if (columns.length < 10) return; // Skip rows with insufficient columns

      // Extract data from columns
      const date = $(columns[0]).find('a').text().trim();
      const time = $(columns[3]).text().trim();
      const level = $(columns[4]).text().trim();
      const competition = $(columns[5]).find('a').text().trim();

      // Parse home team and venue
      const homeTeamCell = $(columns[6]);
      const homeTeam = homeTeamCell.find('a.viewlist').text().trim();
      const venue = homeTeamCell.find('a[href*="venues.php"]').text().trim();

      const awayTeam = $(columns[7]).find('a.viewlist').text().trim();

      // Parse official and role
      const officialCell = $(columns[8]);
      const officialText = officialCell.text().trim();

      // Remove known titles in parentheses and the role
      const cleanedOfficial = officialText
        .replace(/\(Dr\.\)\s*/g, '')
        .replace(/\(LHO\)\s*/g, '')
        .replace(/\s*\([^)]*\)$/, '') // Remove the role in parentheses at the end
        .trim();

      // Extract role - look for the last set of parentheses
      const roleMatch = officialText.match(/\(([^)]+)\)$/);
      const role = roleMatch ? roleMatch[1] : '';

      const status = $(columns[9]).text().trim();

      const appointmentData: AppointmentData = {
        Date: date,
        Time: time,
        Level: level,
        'Competition/Event': competition,
        'Home Team': homeTeam,
        Venue: venue,
        'Away Team': awayTeam,
        Official: cleanedOfficial,
        Role: role,
        Status: status
      };

      batchData.push(appointmentData);
    });

    return batchData;
  }

  private async fetchAppointmentsPage(
    offset: number,
    searchParams: SearchParams
  ): Promise<CheerioAPI> {
    const requestUrl = '/db_admin/appointments.php?function=view';
    const requestParams = createPaginationParams(
      {
        clicked_find_counter: offset === 0 ? '0' : '1',
        find_from_date: searchParams.find_from_date,
        find_to_date: searchParams.find_to_date,
        find_team_index_key: '0',
        find_month: '0',
        find_contact_index_key: searchParams.find_contact_index_key,
        find_competition_index_key: '0',
        find_contact_type_index_key: '0',
        find_organisation_index_key: searchParams.find_organisation_index_key,
        find_grade_index_key: '0',
        find: 'go'
      },
      offset
    );

    const htmlResponse = await this.client.post<string>(requestUrl, requestParams, {
      Origin: 'https://secure.whostheumpire.com',
      Referer: 'https://secure.whostheumpire.com/db_admin/appointments.php?function=view'
    });

    return cheerio.load(htmlResponse);
  }

  private async getAppointmentsData(searchParams: SearchParams): Promise<AppointmentData[]> {
    return handlePagination<CheerioAPI, AppointmentData>(
      (offset) => this.fetchAppointmentsPage(offset, searchParams),
      ($) => {
        const rows = $('#queryResultsTable_2 tbody tr');
        return this.processTableRows($, rows);
      },
      this.getPaginationConfig()
    );
  }

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
}
