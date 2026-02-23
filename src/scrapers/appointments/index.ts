import { AppointmentsScraper } from './AppointmentsScraper';

const scraper = new AppointmentsScraper();
scraper.run().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
