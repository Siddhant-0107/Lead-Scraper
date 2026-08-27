import { describe, expect, it } from "vitest";
import { normalizePhone, normalizeUrl } from "../src/leads/normalizer.js";
import { deduplicate } from "../src/leads/deduplicator.js";
import { retry } from "../src/utils/retry.js";
describe("normalizers", () => { it("normalizes Indian phone variants", () => { expect(normalizePhone("+91 98765 43210")).toBe("+919876543210"); expect(normalizePhone("09876543210")).toBe("+919876543210"); }); it("normalizes URLs", () => expect(normalizeUrl("Example.com/a/?x=1")).toBe("https://example.com/a")); it("deduplicates by strongest signal", () => expect(deduplicate([{ normalizedPhone: "+919", name: "A" }, { normalizedPhone: "+919", name: "B" }])).toHaveLength(1)); });
describe("retry", () => { it("retries transient failures", async () => { let calls = 0; await expect(retry(async () => { calls += 1; if (calls < 2) throw new Error("temporary"); return "ok"; }, { retries: 2, baseDelayMs: 1 })).resolves.toBe("ok"); expect(calls).toBe(2); }); });
