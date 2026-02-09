# 📍 Google Maps Lead Scraper

A **human-safe, production-ready Google Maps lead generation tool** built with **Node.js + Puppeteer**, designed to extract high-quality business leads and store them directly in **Google Sheets**.

> Built for real-world usage  
> ✅ No headless abuse  
> ✅ No WhatsApp auto-spam  
> ✅ No account bans  
> ✅ Clean, deduplicated leads  

---

## ✨ Features

- 🔍 Scrapes business leads from **Google Maps**
- 🏢 Extracts:
  - Business Name
  - Phone Number
  - WhatsApp (auto-detected / fallback)
  - Address
  - Website
- 📊 Automatically appends data to **Google Sheets**
- 🧹 Deduplicates leads by phone number
- 🧠 Human-in-the-loop design (ban-safe)
- ⚙️ CLI-based usage (business + location)
- 🪟 Fully Windows-compatible

---

## 🧰 Tech Stack

- **Node.js**
- **Puppeteer**
- **Google Sheets API**
- **Google Maps Web**

---

## 🚀 How It Works

1. Opens Google Maps in a real browser
2. Searches for a business + location
3. Zooms out to expand search radius
4. Aggressively scrolls to load all listings
5. Clicks each listing and extracts details
6. Deduplicates leads by phone number
7. Appends only **new leads** to Google Sheets

---

## 📂 Project Structure

.
├── index.js # CLI entry point
├── scrape.js # Google Maps scraping logic
├── sheets.js # Google Sheets integration + deduplication
├── package.json
├── .gitignore
├── README.md
├── credentials.json # ❌ DO NOT COMMIT
└── .env # ❌ DO NOT COMMIT


---

## ⚙️ Setup Instructions

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/yourusername/google-maps-lead-scraper.git
cd google-maps-lead-scraper
2️⃣ Install Dependencies
npm install
3️⃣ Google Sheets Setup
Create a Google Cloud Project

Enable Google Sheets API

Create a Service Account

Download credentials.json

Place it in the project root
⚠️ Never commit this file

4️⃣ Environment Variables
Create a .env file:

SHEET_ID=your_google_sheet_id_here
▶️ Usage
Run from the command line:

node index.js jewellers noida
More examples:

node index.js dentist delhi
node index.js gym "greater noida"
node index.js salon dubai
📊 Google Sheet Output
Business Name	Phone	WhatsApp	Address	Website
Leads are appended, not overwritten

Duplicate phone numbers are skipped automatically

🟢 WhatsApp Outreach (Safe by Design)
This tool does NOT auto-send WhatsApp messages.

Instead:

Generates WhatsApp-ready numbers

Supports wa.me prefilled links via Google Sheets

Designed for manual confirmation before sending

This prevents WhatsApp number bans.

Example WhatsApp link formula (Google Sheets):

=HYPERLINK(
 "https://wa.me/91"&REGEXREPLACE(B2,"[^0-9]","")&
 "?text="&ENCODEURL("Hi, I found your business on Google Maps."),
 "Open WhatsApp"
)
🔒 What This Tool Does NOT Do
❌ No headless scraping

❌ No CAPTCHA bypass

❌ No WhatsApp auto-sending

❌ No ToS-breaking automation

These limitations are intentional.

⚠️ Disclaimer
This project is intended for educational and research purposes only.
Users are responsible for complying with:

Google Maps Terms of Service

WhatsApp usage policies

Local data protection laws

Use responsibly.

💡 Use Cases
Freelance lead generation

Local business outreach

Market research

Agency prospecting

CRM list building

📈 Future Improvements
⭐ Ratings & review count

📍 Google Maps profile links

🔁 Multi-city batch scraping

🧾 CSV export

📨 Outreach tracking (sent / replied)

🙌 Author
Built by Siddhant Dubey

If this project helped you, feel free to ⭐ the repository.

Happy scraping (responsibly) 🚀