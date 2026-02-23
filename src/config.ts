export const config = {
  api: {
    baseUrl: 'https://secure.whostheumpire.com',
    headers: {
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
      'Cache-Control': 'max-age=0',
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    },
    timeout: 60000,
    retryAttempts: 3,
    retryDelay: 3000
  },
  scraper: {
    pagination: {
      limit: 50,
      maxEmptyResponses: 3,
      delayBetweenRequests: 3000
    },
    defaultSearchParams: {
      team: 'All teams',
      month: 'All months',
      contact: 'All contacts',
      competition: 'All competitions',
      contact_type: 'All contact types',
      association: 'England Hockey - London',
      status_filter: 'Y'
    }
  },
  credentials: {
    onePasswordItemName: "Who's the umpire"
  }
};

export type Config = typeof config;
