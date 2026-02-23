import { wrapper } from 'axios-cookiejar-support';
import axios, { AxiosInstance } from 'axios';
import { AuthClient } from '../auth/AuthClient';
import { config, type Config } from '../../config';
import { commonHeaders } from './scraper';

/**
 * A shared client for all scrapers to use
 * Eliminates duplicate code in each scraper implementation
 */
export class ScraperClient {
  private client: AxiosInstance;
  private config: Config;
  private authClient: AuthClient;

  constructor(authClient: AuthClient) {
    this.authClient = authClient;
    this.config = config;
    this.client = wrapper(
      axios.create({
        baseURL: config.api.baseUrl,
        jar: this.authClient.getCookieJar(),
        withCredentials: true,
        timeout: config.api.timeout
      })
    );
  }

  /**
   * Make a POST request to the API
   * @param url The URL to make the request to
   * @param data The data to send with the request
   * @param customHeaders Optional custom headers to include
   * @returns The response from the API
   */
  async post<T>(url: string, data: string, customHeaders: Record<string, string> = {}): Promise<T> {
    const response = await this.client.post<T>(url, data, {
      headers: {
        ...commonHeaders,
        ...customHeaders
      },
      timeout: this.config.api.timeout
    });

    return response.data;
  }

  /**
   * Make a GET request to the API
   * @param url The URL to make the request to
   * @param customHeaders Optional custom headers to include
   * @returns The response from the API
   */
  async get<T>(url: string, customHeaders: Record<string, string> = {}): Promise<T> {
    const response = await this.client.get<T>(url, {
      headers: {
        ...commonHeaders,
        ...customHeaders
      },
      timeout: this.config.api.timeout
    });

    return response.data;
  }
}
