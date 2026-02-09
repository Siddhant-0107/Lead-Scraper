import puppeteer from "puppeteer";

export async function scrapeGoogleMaps(business, location) {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ["--start-maximized"],
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
  );

  const q = `${business} in ${location}`.replace(/ /g, "+");
  const url = `https://www.google.com/maps/search/${q}`;
  console.log("Opening:", url);
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await new Promise(r => setTimeout(r, 5000));

  // 🔎 Zoom out to expand radius
  await page.keyboard.down("Control");
  await page.keyboard.press("-");
  await page.keyboard.press("-");
  await page.keyboard.up("Control");
  await new Promise(r => setTimeout(r, 3000));

  // 📜 Aggressive scrolling to load all results
  const feed = "div[role='feed']";
  await page.waitForSelector(feed);
  console.log("📜 Loading all results...");
  for (let i = 0; i < 15; i++) {
    await page.evaluate(sel => {
      const p = document.querySelector(sel);
      p.scrollBy(0, p.scrollHeight);
    }, feed);
    await new Promise(r => setTimeout(r, 2500));
  }

  const listings = await page.$$(
    "a[href^='https://www.google.com/maps/place']"
  );
  console.log(`📍 Listings found in DOM: ${listings.length}`);

  const leads = [];

  for (let i = 0; i < listings.length; i++) {
    try {
      await listings[i].click();
      await new Promise(r => setTimeout(r, 4000));

      const data = await page.evaluate(() => {
        const txt = sel => document.querySelector(sel)?.innerText || "";

        const name =
          txt("h1.DUwDvf") || txt("h1.fontHeadlineLarge");

        const phone =
          document.querySelector("button[data-item-id^='phone']")
            ?.innerText || "";

        const address =
          document.querySelector("button[data-item-id='address']")
            ?.innerText || "";

        const website =
          document.querySelector("a[data-item-id='authority']")
            ?.href || "";

        // 🟢 WhatsApp detection
        let whatsapp = "";
        const waLink = document.querySelector(
          "a[href*='wa.me'], a[href*='whatsapp.com']"
        );
        if (waLink) whatsapp = waLink.href;
        if (!whatsapp && phone) whatsapp = phone; // common fallback

        return { name, phone, whatsapp, address, website };
      });

      if (data.name && data.phone) leads.push(data);
    } catch {
      continue;
    }
  }

  await browser.close();

  // 🧹 Deduplicate by phone
  const unique = Array.from(
    new Map(leads.map(l => [l.phone, l])).values()
  );

  console.log(`✅ Total unique leads: ${unique.length}`);
  return unique;
}
