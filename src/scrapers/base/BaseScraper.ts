import { AuthClient } from '../../core/auth/AuthClient';
import { CsvWriter } from '../../core/utils/csv';
import { LoginOptions } from '../../core/auth/types';
import * as readline from 'readline';
import { ScraperClient } from '../../core/utils/ScraperClient';
import { config, type Config } from '../../config';
import { ScraperOptions, PaginationConfig } from './types';
import { question } from '../../core/utils/prompt';

export abstract class BaseScraper {
  protected authClient: AuthClient;
  protected csvWriter: CsvWriter;
  protected rl: readline.Interface;
  protected client: ScraperClient;
  protected config: Config;
  protected options: ScraperOptions;

  constructor(options: ScraperOptions = {}) {
    this.authClient = new AuthClient();
    this.csvWriter = new CsvWriter();
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });
    this.client = new ScraperClient(this.authClient);
    this.config = config;
    this.options = options;
  }

  protected async question(query: string): Promise<string> {
    return question(this.rl, query);
  }

  protected async getOutputFilename(defaultFilename: string): Promise<string> {
    if (this.options.promptForFilename === false) {
      return this.options.defaultFilename || defaultFilename;
    }

    const customFilename = await this.question(
      `Enter output filename (default: ${defaultFilename}): `
    );
    return customFilename.trim() || defaultFilename;
  }

  abstract run(): Promise<void>;

  protected getPaginationConfig(): PaginationConfig {
    return {
      limit: this.config.scraper.pagination.limit,
      delayBetweenRequests: this.config.scraper.pagination.delayBetweenRequests,
      maxEmptyResponses: this.config.scraper.pagination.maxEmptyResponses,
      retryAttempts: this.config.api.retryAttempts,
      retryDelay: this.config.api.retryDelay
    };
  }

  protected async initialize(loginOptions?: LoginOptions): Promise<boolean> {
    const options = loginOptions || this.options.loginOptions;
    const loginResponse = await this.authClient.login({ useArchive: options?.useArchive });
    if (!loginResponse.success) {
      console.error('Login failed:', loginResponse.error);
      return false;
    }
    return true;
  }

  cleanup(): void {
    this.rl.close();
    this.authClient.close();
  }
}
