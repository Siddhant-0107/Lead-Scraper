export const selectors = {
  feed: [
    "div[role='feed']",
    "div[aria-label^='Results for']",
    "div.m6QErb.DxyBCb.kA9KIf.dS8AEf"
  ],
  listing: [
    "a[href*='/maps/place/']",
    "a.hfpxzc"
  ],
  name: [
    "div[role='main'] h1",
    "h1.DUwDvf",
    "h1.fontHeadlineLarge"
  ],
  phone: [
    "button[data-item-id^='phone']",
    "*[aria-label^='Phone:']",
    "button[data-tooltip='Copy phone number']"
  ],
  address: [
    "button[data-item-id='address']",
    "*[aria-label^='Address:']",
    "button[data-tooltip='Copy address']"
  ],
  website: [
    "a[data-item-id='authority']",
    "*[aria-label^='Website:']",
    "*[data-tooltip='Open website']"
  ],
  category: [
    "button[jsaction*='category']",
    "span.DkEaL"
  ],
  detailLoaded: [
    "div[role='main'][aria-label] h1",
    "button[data-item-id='address']",
    "button[data-item-id^='phone']",
    "h1.DUwDvf"
  ],
  endOfList: [
    "span.HlvSq",
    "p.fontBodyMedium"
  ]
};

export const firstSelector = async (page, candidates, timeout) => {
  for (const selector of candidates) {
    try {
      await page.waitForSelector(selector, { timeout });
      return selector;
    } catch {}
  }
  return null;
};

export const matchingSelector = async (page, candidates) => {
  for (const selector of candidates) {
    try {
      if (await page.$(selector)) return selector;
    } catch {}
  }
  return null;
};

export const waitForMatchingSelector = async (page, candidates, timeout) => {
  return firstSelector(page, candidates, timeout);
};
