import { LoginOptions } from '../../core/auth/types';

/**
 * Common options for all scrapers
 */
export interface ScraperOptions {
  /**
   * Login options for the scraper
   */
  loginOptions?: LoginOptions;

  /**
   * Default output filename
   * If not provided, each scraper will generate its own default
   */
  defaultFilename?: string;

  /**
   * Whether to prompt for output filename
   * If false, the default filename will be used
   */
  promptForFilename?: boolean;
}

/**
 * Common pagination configuration for all scrapers
 */
export interface PaginationConfig {
  limit: number;
  delayBetweenRequests: number;
  maxEmptyResponses: number;
  retryAttempts: number;
  retryDelay: number;
}
