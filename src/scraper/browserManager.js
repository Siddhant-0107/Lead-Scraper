import puppeteer from "puppeteer";
import { env } from "../config/env.js";
export async function withBrowser(work) {
  const browser = await puppeteer.launch({ headless: process.env.PUPPETEER_HEADLESS !== "false", args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  let page;
  try { page = await browser.newPage(); page.setDefaultTimeout(env.SCRAPE_TIMEOUT_MS); page.setDefaultNavigationTimeout(env.SCRAPE_TIMEOUT_MS); return await work(page); } finally { await page?.close().catch(() => {}); await browser.close().catch(() => {}); }
}
