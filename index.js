import "dotenv/config";
import { scrapeGoogleMaps } from "./scrape.js";
import { appendToSheet } from "./sheets.js";

const business = process.argv[2] || "barber";
const location = process.argv[3] || "kuwait";

(async () => {
  console.log(`Scraping Google Maps: ${business} in ${location}`);

  const leads = await scrapeGoogleMaps(business, location);

  console.log(`Found ${leads.length} leads`);

  // ✅ PASS OBJECTS DIRECTLY
  await appendToSheet(leads);

  console.log("Leads pushed to Google Sheets ✅");
})();
