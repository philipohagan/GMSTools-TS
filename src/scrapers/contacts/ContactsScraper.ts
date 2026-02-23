import { BaseScraper } from '../base/BaseScraper';
import { SearchParams, ContactData } from './types';
import type { CheerioAPI, Cheerio } from 'cheerio';
import type { Element } from 'domhandler';
import * as cheerio from 'cheerio';
import * as crypto from 'crypto';
import { createPaginationParams, handlePagination } from '../../core/utils/scraper';
import { ORGANIZATIONS, OrganizationKey } from '../../core/constants/organizations';
import { CONTACT_TYPES } from '../../core/constants/contactTypes';
import { ScraperOptions } from '../base/types';
import { selectFromList, SelectionOption } from '../../core/utils/prompt';

export class ContactsScraper extends BaseScraper {
  private readonly ORGANIZATIONS = ORGANIZATIONS;
  private readonly CONTACT_TYPES = CONTACT_TYPES;

  constructor(options: ScraperOptions = {}) {
    super(options);
  }

  private async getSearchParams(): Promise<SearchParams> {
    console.log('\nSelect organization:');
    const orgKeys = Object.keys(this.ORGANIZATIONS) as OrganizationKey[];
    const orgOptions: SelectionOption<string>[] = orgKeys.map((key) => ({
      name: key,
      value: this.ORGANIZATIONS[key]
    }));

    const orgIndex = await selectFromList(this.rl, orgOptions, 'Enter number');

    console.log('\nSelect contact type:');
    const contactTypeOptions: SelectionOption<string>[] = this.CONTACT_TYPES.map((type) => ({
      name: type.name,
      value: type.key
    }));

    const contactTypeIndex = await selectFromList(this.rl, contactTypeOptions, 'Enter number');

    return {
      clicked_find_counter: '0',
      find_contact_name: '',
      find_address: '',
      find_organisation_index_key: orgIndex,
      find_contact_type_index_key: contactTypeIndex,
      find_contact_type: 'B',
      find_grade_index_key: '0',
      find: 'go'
    };
  }

  private processTableRows($: CheerioAPI, rows: Cheerio<Element>): ContactData[] {
    const batchData: ContactData[] = [];

    rows.each((_, row) => {
      const columns = $(row).find('td');
      if (columns.length < 9) return; // Skip rows with insufficient columns

      // Generate a hash-based ID similar to what's in the CSV
      const nameText = $(columns[0]).text().trim();
      const id = crypto
        .createHash('md5')
        .update(nameText + Date.now())
        .digest('hex');

      // Get the name
      const name = nameText;

      // Get the level from the associations column (column 3)
      const level = $(columns[3]).text().trim();

      // Based on the user's requirements, the club list is in the Work Phone column
      // In the table structure, this is typically column 5 (index 5)
      const clubText = columns.length > 5 ? $(columns[5]).text().trim() : '';

      // Process club text to format as comma-separated values
      let club = '';
      if (clubText) {
        // First, remove any membership numbers at the beginning
        let cleanedClubText = clubText.replace(/^\d+\s*/, '');

        // Replace common separators with a standard comma
        cleanedClubText = cleanedClubText
          .replace(/\s+and\s+/g, ',') // Replace " and " with comma
          .replace(/\s+HC\s+/g, ' HC,') // Replace "HC " with "HC,"
          .replace(/\s+HC$/g, ' HC'); // Ensure trailing "HC" is preserved

        // Split by comma and process each part
        const parts = cleanedClubText
          .split(',')
          .map((part) => part.trim())
          .filter(Boolean);

        // Process each club name
        const clubNames = parts.map((part) => {
          // Add HC suffix if not already present
          if (!part.endsWith(' HC') && !part.includes('HC')) {
            return part + ' HC';
          }
          return part;
        });

        // Join the club names with commas
        club = clubNames.join(', ');
      }

      const contactData: ContactData = {
        ID: id,
        Name: name,
        Level: level,
        Club: club
      };

      batchData.push(contactData);
    });

    return batchData;
  }

  private async fetchContactsPage(offset: number, searchParams: SearchParams): Promise<CheerioAPI> {
    const requestUrl = '/db_admin/contacts.php?function=view';
    const requestParams = createPaginationParams(
      {
        clicked_find_counter: offset === 0 ? '0' : '1',
        find_contact_name: searchParams.find_contact_name,
        find_address: searchParams.find_address,
        find_organisation_index_key: searchParams.find_organisation_index_key,
        find_contact_type_index_key: searchParams.find_contact_type_index_key,
        find_contact_type: searchParams.find_contact_type,
        find_grade_index_key: searchParams.find_grade_index_key,
        find: 'go'
      },
      offset
    );

    const htmlResponse = await this.client.post<string>(requestUrl, requestParams, {
      Origin: 'https://secure.whostheumpire.com',
      Referer: 'https://secure.whostheumpire.com/db_admin/contacts.php?function=view'
    });

    return cheerio.load(htmlResponse);
  }

  private async getContactsData(searchParams: SearchParams): Promise<ContactData[]> {
    return handlePagination<CheerioAPI, ContactData>(
      (offset) => this.fetchContactsPage(offset, searchParams),
      ($) => {
        const rows = $('#queryResultsTable_2 tbody tr');
        return this.processTableRows($, rows);
      },
      this.getPaginationConfig()
    );
  }

  public async run(): Promise<void> {
    try {
      console.log('Initializing contacts scraper...');
      const initialized = await this.initialize();
      if (!initialized) {
        console.error('Failed to initialize. Exiting...');
        return;
      }

      // Get output filename upfront
      const defaultFilename = `contacts_${new Date().toISOString().slice(0, 10)}.csv`;
      const outputFilename = await this.getOutputFilename(defaultFilename);

      const searchParams = await this.getSearchParams();
      const contactsData = await this.getContactsData(searchParams);

      if (contactsData.length === 0) {
        console.log('No contacts found. Exiting...');
        return;
      }

      await this.csvWriter.writeToFile(contactsData, outputFilename);
      console.log(`\nContacts data saved to ${outputFilename}`);
    } catch (error) {
      console.error('Error running contacts scraper:', error);
    } finally {
      this.cleanup();
    }
  }
}
