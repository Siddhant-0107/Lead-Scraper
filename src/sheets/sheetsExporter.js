import { google } from "googleapis";
import { env } from "../config/env.js";
import { retry } from "../utils/retry.js";
export async function exportLeads(leads) {
  if (!env.GOOGLE_SHEET_ID || !env.GOOGLE_APPLICATION_CREDENTIALS || !leads.length) return { exported: 0, skipped: leads.length, enabled: false };
  const auth = new google.auth.GoogleAuth({ keyFile: env.GOOGLE_APPLICATION_CREDENTIALS, scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
  await retry(async () => google.sheets({ version: "v4", auth }).spreadsheets.values.append({ spreadsheetId: env.GOOGLE_SHEET_ID, range: "Sheet1!A:M", valueInputOption: "RAW", requestBody: { values: leads.map(l => [l.name, l.phone, l.whatsapp, l.address, l.website, l.googleMapsUrl, l.rating, l.reviewCount, l.category, l.location, l.source]) } }), { retries: env.MAX_RETRIES });
  return { exported: leads.length, skipped: 0, enabled: true };
}
