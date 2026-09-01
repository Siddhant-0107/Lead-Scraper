import { env } from "../config/env.js";
import { withBrowser } from "./browserManager.js";
import { firstSelector, selectors } from "./selectors.js";
import { shouldContinueScrolling } from "./scrollStopper.js";

export async function scrapeGoogleMaps({ business, location, maxResults, onProgress = async () => {}, isCancelled = async () => false }) {
  return withBrowser(async page => {
    const search = encodeURIComponent(`${business} in ${location}`);
    await page.goto(`https://www.google.com/maps/search/${search}`, { waitUntil: "domcontentloaded" });
    const feed = await firstSelector(page, selectors.feed, env.SCRAPE_TIMEOUT_MS);
    if (!feed) throw new Error("Google Maps results feed was not found; selectors may need an update.");
    let previousListingCount = 0;
    for (let i = 0; i < env.MAX_SCROLL_ITERATIONS; i += 1) {
      await page.evaluate(selector => { const el = document.querySelector(selector); if (el) el.scrollBy(0, el.scrollHeight); }, feed);
      await new Promise(resolve => setTimeout(resolve, 800));
      const currentLinks = await page.$$eval(selectors.listing[0], elements => [...new Set(elements.map(el => el.href))]);
      const currentListingCount = currentLinks.length;
      if (!shouldContinueScrolling(i, currentListingCount, previousListingCount, maxResults, env.MAX_SCROLL_ITERATIONS)) break;
      previousListingCount = currentListingCount;
    }
    const links = await page.$$eval(selectors.listing[0], elements => [...new Set(elements.map(el => el.href))]);
    const leads = [];
    for (const [index, url] of links.slice(0, maxResults).entries()) {
      if (await isCancelled()) break;
      try {
        await page.goto(url, { waitUntil: "domcontentloaded" });
        const lead = await page.evaluate((s, sourceUrl) => ({ name: (document.querySelector(s.name[0])?.innerText || document.querySelector(s.name[1])?.innerText || "").trim(), phone: document.querySelector(s.phone[0])?.innerText?.trim() || "", address: document.querySelector(s.address[0])?.innerText?.trim() || "", website: document.querySelector(s.website[0])?.href || "", category: document.querySelector(s.category[0])?.innerText?.trim() || "", googleMapsUrl: sourceUrl }), selectors, url);
        if (lead.name) leads.push(lead);
      } catch { /* individual listings are non-fatal */ }
      await onProgress(Math.round(((index + 1) / Math.min(links.length, maxResults)) * 90), leads.length);
    }
    return leads;
  });
}
