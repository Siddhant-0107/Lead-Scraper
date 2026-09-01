import { describe, expect, it } from "vitest";
import { shouldContinueScrolling } from "../src/scraper/scrollStopper.js";

describe("scroll stopper", () => {
  it("stops when max iterations reached", () => {
    expect(shouldContinueScrolling(20, 10, 10, 50, 20)).toBe(false);
  });

  it("stops when listing count reaches maxResults", () => {
    expect(shouldContinueScrolling(5, 50, 40, 50, 20)).toBe(false);
  });

  it("stops when no new listings appear after first iteration", () => {
    expect(shouldContinueScrolling(5, 30, 30, 50, 20)).toBe(false);
  });

  it("continues scrolling on first iteration", () => {
    expect(shouldContinueScrolling(0, 10, 0, 50, 20)).toBe(true);
  });

  it("continues when listings are increasing", () => {
    expect(shouldContinueScrolling(3, 35, 25, 50, 20)).toBe(true);
  });

  it("continues when below maxResults and has new listings", () => {
    expect(shouldContinueScrolling(10, 40, 35, 50, 20)).toBe(true);
  });

  it("stops when listing count exceeds maxResults", () => {
    expect(shouldContinueScrolling(5, 75, 60, 50, 20)).toBe(false);
  });
});
