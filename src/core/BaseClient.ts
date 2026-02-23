import axios, { AxiosInstance } from 'axios';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';
import * as cheerio from 'cheerio';

export class BaseClient {
  protected session: AxiosInstance;
  protected cookieJar: CookieJar;

  constructor() {
    this.cookieJar = new CookieJar();
    this.session = wrapper(
      axios.create({
        baseURL: 'https://secure.whostheumpire.com',
        jar: this.cookieJar,
        withCredentials: true,
        maxRedirects: 5
      })
    );
  }

  protected async getCSRFToken(): Promise<string | null> {
    try {
      const response = await this.session.get('/db_admin/index.php');
      const $ = cheerio.load(response.data);
      return (
        (($('input[name="csrf_token"]').val() ||
          $('input[name="_token"]').val() ||
          $('meta[name="csrf-token"]').attr('content')) as string) || null
      );
    } catch (error) {
      console.error('Error getting CSRF token:', error);
      return null;
    }
  }

  protected getCookieJar(): CookieJar {
    return this.cookieJar;
  }
}
