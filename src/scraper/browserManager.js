import puppeteer from "puppeteer";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

export async function withBrowser(work) {
  const browser = await puppeteer.launch({
    headless: process.env.PUPPETEER_HEADLESS !== "false",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-blink-features=AutomationControlled"],
    defaultViewport: { width: 1365, height: 900 }
  });
  let page;
  try {
    page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36");
    page.setDefaultTimeout(env.SCRAPE_TIMEOUT_MS);
    page.setDefaultNavigationTimeout(env.SCRAPE_TIMEOUT_MS);
    return await work(page);
  } finally {
    await page?.close().catch(err => { logger.warn({ err }, "Page cleanup failed"); });
    await browser.close().catch(err => { logger.warn({ err }, "Browser cleanup failed"); });
  }
}
