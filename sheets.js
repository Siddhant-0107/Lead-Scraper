import { google } from "googleapis";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(
    fs.readFileSync(path.join(__dirname, "credentials.json"), "utf-8")
  ),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

export async function appendToSheet(leads) {
  if (!leads.length) {
    console.log("⚠️ No leads to push");
    return;
  }

  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: client });

  // 📥 Read existing phone numbers from sheet
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SHEET_ID,
    range: "Sheet1!B:B", // Phone column
  });

  const existingPhones = new Set(
    (existing.data.values || []).flat().map(v => v.trim())
  );

  // 🧹 Filter only NEW leads
  const newLeads = leads.filter(
    l => l.phone && !existingPhones.has(l.phone.trim())
  );

  if (!newLeads.length) {
    console.log("ℹ️ No new leads (all duplicates)");
    return;
  }

  // ➕ Append only new leads
  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.SHEET_ID,
    range: "Sheet1!A:E",
    valueInputOption: "RAW",
    requestBody: {
      values: newLeads.map(l => [
        l.name || "",
        l.phone || "",
        l.whatsapp || "",
        l.address || "",
        l.website || "",
      ]),
    },
  });

  console.log(`✅ ${newLeads.length} new leads added`);
}
