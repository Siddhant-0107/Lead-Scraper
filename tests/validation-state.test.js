import { describe, expect, it } from "vitest";
import { createJobSchema, paginationSchema } from "../src/api/validation.js";
import { canTransition, JOB_STATUS } from "../src/jobs/state.js";

describe("request validation", () => {
  it("accepts bounded job input", () => expect(createJobSchema.parse({ business: "dentist", location: "Delhi", maxResults: "50" }).maxResults).toBe(50));
  it("rejects malformed jobs and pagination", () => { expect(createJobSchema.safeParse({ business: "", location: "D", maxResults: 201 }).success).toBe(false); expect(paginationSchema.safeParse({ page: 0, limit: 101 }).success).toBe(false); });
});
describe("job states", () => {
  it("permits only intended lifecycle transitions", () => { expect(canTransition(JOB_STATUS.QUEUED, JOB_STATUS.RUNNING)).toBe(true); expect(canTransition(JOB_STATUS.RUNNING, JOB_STATUS.CANCELLED)).toBe(true); expect(canTransition(JOB_STATUS.CANCELLED, JOB_STATUS.COMPLETED)).toBe(false); expect(canTransition(JOB_STATUS.COMPLETED, JOB_STATUS.RUNNING)).toBe(false); });
});
