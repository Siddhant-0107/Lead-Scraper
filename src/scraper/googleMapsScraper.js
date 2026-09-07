import { env } from "../config/env.js";
import { withBrowser } from "./browserManager.js";
import { firstSelector, selectors } from "./selectors.js";

export async function scrapeGoogleMaps({ business, location, maxResults, onProgress = async () => {}, isCancelled = async () => false }) {
  return withBrowser(async page => {
    const search = encodeURIComponent(`${business} in ${location}`);
    await page.goto(`https://www.google.com/maps/search/${search}`, { waitUntil: "domcontentloaded" });
    const feed = await firstSelector(page, selectors.feed, env.SCRAPE_TIMEOUT_MS);
    if (!feed) throw new Error("Google Maps results feed was not found; selectors may need an update.");

    // Google Maps virtualizes the results feed: cards that scroll out of view can
    // be removed from the DOM. Collect URLs during every scroll instead of only
    // inspecting the final DOM, otherwise only the last few visible cards are seen.
    const links = new Set();
    const target = Math.min(maxResults, 100);

    for (let i = 0; i < env.MAX_SCROLL_ITERATIONS && links.size < target; i += 1) {
      const visibleLinks = await page.$$eval(`${selectors.feed[0]} ${selectors.listing[0]}`, elements => elements.map(el => el.href).filter(Boolean));
      for (const url of visibleLinks) {
        links.add(url);
        if (links.size >= target) break;
      }

      await onProgress(Math.min(25, Math.round((links.size / target) * 25)), 0);
      if (links.size >= target) break;
      if (await isCancelled()) break;

      await page.evaluate(selector => {
        const el = document.querySelector(selector);
        if (el) el.scrollBy(0, 800);
      }, feed);
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    const urls = [...links].slice(0, target);
    const leads = [];
    for (const [index, url] of urls.entries()) {
      if (await isCancelled()) break;
      try {
        await page.goto(url, { waitUntil: "domcontentloaded" });
        const lead = await page.evaluate((s, sourceUrl) => ({ name: (document.querySelector(s.name[0])?.innerText || document.querySelector(s.name[1])?.innerText || "").trim(), phone: document.querySelector(s.phone[0])?.innerText?.trim() || "", address: document.querySelector(s.address[0])?.innerText?.trim() || "", website: document.querySelector(s.website[0])?.href || "", category: document.querySelector(s.category[0])?.innerText?.trim() || "", googleMapsUrl: sourceUrl }), selectors, url);
        if (lead.name) leads.push(lead);
      } catch { /* individual listings are non-fatal */ }
      await onProgress(25 + Math.round(((index + 1) / urls.length) * 65), leads.length);
    }
    return leads;
  });
}
