import { BaseClient } from '../BaseClient';
import { CredentialManager } from '../utils/credentials';
import { AuthClientOptions, LoginOptions, LoginResponse } from './types';
import * as cheerio from 'cheerio';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { CookieJar } from 'tough-cookie';

export class AuthClient extends BaseClient {
  private credentialManager: CredentialManager;

  constructor(_options?: AuthClientOptions) {
    super();
    this.credentialManager = new CredentialManager();
  }

  async login(options: LoginOptions = { useArchive: true }): Promise<LoginResponse> {
    try {
      const credentials = await this.credentialManager.getCredentials();

      // Set initial cookies with proper domain and path
      await this.cookieJar.setCookie(
        'databasetouse=hockey; Domain=secure.whostheumpire.com; Path=/',
        'https://secure.whostheumpire.com'
      );
      await this.cookieJar.setCookie(
        'agree_to_terms=1; Domain=secure.whostheumpire.com; Path=/',
        'https://secure.whostheumpire.com'
      );

      // Get initial page and potential CSRF token
      const _initialResponse = await this.session.get('/db_admin/index.php');
      const csrfToken = await this.getCSRFToken();

      // Perform login with enhanced form data
      const loginData = new URLSearchParams({
        email: credentials.email,
        password: credentials.password,
        databasetouse: 'hockey',
        t_and_c_agreement: 'on',
        login: 'Y',
        ...(csrfToken ? { _token: csrfToken } : {})
      });

      console.log('Submitting login form...');
      const response = await this.session.post('/db_admin/index.php?login=Y', loginData, {
        headers: {
          ...this.getDefaultHeaders(),
          'Content-Type': 'application/x-www-form-urlencoded',
          Origin: 'https://secure.whostheumpire.com',
          Referer: 'https://secure.whostheumpire.com/db_admin/index.php'
        },
        maxRedirects: 5,
        validateStatus: (status) => status >= 200 && status < 400
      });

      const $ = cheerio.load(response.data);

      // Enhanced login form detection
      const loginForm =
        $('input[name="email"]').length > 0 && $('input[name="password"]').length > 0;

      if (loginForm) {
        console.log('Login form still present after submission');
        const errorMsg = $('.error-message, .alert-error, .alert-danger, .alert').text().trim();
        console.log('Error messages on page:', errorMsg || 'No error message found');
        console.log('Current URL:', response.request?.res?.responseUrl);
        return {
          success: false,
          error: errorMsg || 'Login failed - still seeing login form'
        };
      }

      // Additional success verification
      const welcomeText =
        $('body').text().includes('Welcome') || $('body').text().includes('My Profile');

      if (!welcomeText) {
        console.log('Warning: Login might have failed - no welcome message found');
      }

      console.log('Login successful - login form no longer present');

      if (options.useArchive) {
        await this.enableArchiveMode();
      }

      return { success: true };
    } catch (error) {
      console.error('Login error details:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login request failed'
      };
    }
  }

  private getDefaultHeaders() {
    return {
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
      'Cache-Control': 'max-age=0',
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    };
  }

  close(): void {
    this.credentialManager.close();
  }

  public async post(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse> {
    return this.session.post(url, data, config);
  }

  async get(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse> {
    return this.session.get(url, config);
  }

  public getCookieJar(): CookieJar {
    return this.cookieJar;
  }

  async enableArchiveMode(): Promise<void> {
    // Set the archive cookie first
    await this.cookieJar.setCookie(
      'gotoarchive=1; Domain=secure.whostheumpire.com; Path=/',
      'https://secure.whostheumpire.com'
    );

    // Then make the request to enable archive mode
    await this.session.get('/db_admin/appointments.php?archive=Y');
  }
}
