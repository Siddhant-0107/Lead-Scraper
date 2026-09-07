import { env } from "../config/env.js";
import { withBrowser } from "./browserManager.js";
import { firstSelector, matchingSelector, selectors } from "./selectors.js";

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function collectVisibleLinks(page, feedSelector, listingSelector) {
  try {
    return await page.$$eval(
      `${feedSelector} ${listingSelector}`,
      elements => [...new Set(elements.map(el => el.href).filter(Boolean))]
    );
  } catch {
    return [];
  }
}

async function hasReachedEnd(page) {
  try {
    return await page.evaluate(() => {
      const text = document.body?.innerText || "";
      return /you'?ve reached the end of the list/i.test(text);
    });
  } catch {
    return false;
  }
}

async function waitForDetail(page) {
  return firstSelector(page, selectors.detailLoaded, env.SCRAPE_TIMEOUT_MS);
}

async function extractLead(page, sourceUrl) {
  return page.evaluate((s, url) => {
    const find = key => {
      for (const selector of s[key]) {
        try {
          const element = document.querySelector(selector);
          if (element) return element;
        } catch {}
      }
      return null;
    };

    const text = key => find(key)?.innerText?.trim() || "";
    const href = key => find(key)?.href || "";

    return {
      name: text("name"),
      phone: text("phone"),
      address: text("address"),
      website: href("website"),
      category: text("category"),
      googleMapsUrl: url
    };
  }, selectors, sourceUrl);
}

export async function scrapeGoogleMaps({ business, location, maxResults, onProgress = async () => {}, isCancelled = async () => false }) {
  return withBrowser(async page => {
    const search = encodeURIComponent(`${business} in ${location}`);
    await page.goto(`https://www.google.com/maps/search/${search}`, { waitUntil: "domcontentloaded" });

    const feedSelector = await firstSelector(page, selectors.feed, env.SCRAPE_TIMEOUT_MS);
    if (!feedSelector) {
      throw new Error("Google Maps results feed was not found; selectors may need an update.");
    }

    const listingSelector = await matchingSelector(page, selectors.listing);
    if (!listingSelector) {
      throw new Error("Google Maps result links were not found; selectors may need an update.");
    }

    const target = Math.min(Math.max(1, maxResults), 100);
    const links = new Set();
    let noNewResults = 0;

    // Google Maps virtualizes the feed, so old cards can disappear from the DOM.
    // Snapshot links on every scroll while they are mounted, rather than only
    // inspecting the final DOM. Scroll to the feed's bottom so Maps can load the
    // next batch of results, then reacquire selectors because the DOM can change.
    for (let i = 0; i < env.MAX_SCROLL_ITERATIONS && links.size < target; i += 1) {
      const currentFeedSelector = await firstSelector(page, selectors.feed, 5000);
      const currentListingSelector = await matchingSelector(page, selectors.listing);
      if (!currentFeedSelector || !currentListingSelector) break;

      const before = links.size;
      const visibleLinks = await collectVisibleLinks(page, currentFeedSelector, currentListingSelector);
      for (const url of visibleLinks) {
        links.add(url);
        if (links.size >= target) break;
      }

      noNewResults = links.size === before ? noNewResults + 1 : 0;
      await onProgress(Math.min(25, Math.round((links.size / target) * 25)), 0);

      if (links.size >= target || await isCancelled()) break;
      if (await hasReachedEnd(page)) break;

      await page.evaluate(selector => {
        const el = document.querySelector(selector);
        if (el) el.scrollTo(0, el.scrollHeight);
      }, currentFeedSelector);

      await sleep(1800);

      // A single stagnant iteration is normal with virtualized loading. Give
      // Maps several attempts before declaring that the search has ended.
      if (noNewResults >= 4 && i >= 8) break;
    }

    const urls = [...links].slice(0, target);
    const leads = [];

    for (const [index, url] of urls.entries()) {
      if (await isCancelled()) break;
      try {
        await page.goto(url, { waitUntil: "domcontentloaded" });
        const loadedSelector = await waitForDetail(page);
        if (!loadedSelector) throw new Error("Business detail panel did not load");

        const lead = await extractLead(page, url);
        if (lead.name) leads.push(lead);
      } catch (error) {
        // One broken listing must not fail the whole scraping job.
        // The job will still report the successfully extracted leads.
        void error;
      }

      await onProgress(
        urls.length ? 25 + Math.round(((index + 1) / urls.length) * 65) : 90,
        leads.length
      );
    }

    return leads;
  });
}
