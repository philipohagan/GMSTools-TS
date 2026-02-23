import { ContactsScraper } from './ContactsScraper';

const scraper = new ContactsScraper();
scraper.run().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
