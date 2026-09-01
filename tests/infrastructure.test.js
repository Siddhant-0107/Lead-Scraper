import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { setupTestDatabase, closeTestDatabase, cleanupTestDatabase, createTestJob } from "./setup.js";
import { Job } from "../src/jobs/job.model.js";

describe("test infrastructure", () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterEach(async () => {
    await cleanupTestDatabase();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  it("connects to test database (not production)", async () => {
    expect(process.env.MONGODB_URI).toContain("leadflow_test");
  });

  it("can create and read from test database", async () => {
    const job = await createTestJob({ business: "dentist", location: "Delhi" });
    expect(job.id).toBeDefined();
    expect(job.business).toBe("dentist");
    expect(job.location).toBe("Delhi");
    expect(job.status).toBe("queued");
  });

  it("cleans up test database after each test", async () => {
    const job1 = await createTestJob();
    expect(job1.id).toBeDefined();
    
    await cleanupTestDatabase();
    
    const count = await Job.countDocuments();
    expect(count).toBe(0);
  });
});
