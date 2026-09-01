import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { createApp } from "../src/app.js";
import { setupTestDatabase, cleanupTestDatabase, closeTestDatabase, generateUniqueRequestKey, generateUniquePhone, generateUniqueUrl } from "./setup.js";
import { Job } from "../src/jobs/job.model.js";
import { Lead } from "../src/leads/lead.model.js";

// Mock the external services
vi.mock("../src/jobs/queue.js", async () => {
  const actual = await vi.importActual("../src/jobs/queue.js");
  return {
    ...actual,
    enqueueJob: vi.fn(async (job) => {
      await job.updateOne({ queueJobId: `test-queue-${job.id}` });
      return { id: `test-queue-${job.id}` };
    })
  };
});

describe("API Integration Tests", () => {
  let app;

  beforeAll(async () => {
    await setupTestDatabase();
    app = createApp();
  });

  afterEach(async () => {
    await cleanupTestDatabase();
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  describe("POST /api/jobs", () => {
    it("accepts valid job request and returns 202", async () => {
      const response = await request(app)
        .post("/api/jobs")
        .send({
          business: "dentist",
          location: "Delhi",
          maxResults: 50
        });

      expect(response.status).toBe(202);
      expect(response.body).toHaveProperty("jobId");
      expect(response.body).toHaveProperty("status");
      expect(response.body.status).toBe("queued");
      
      const savedJob = await Job.findById(response.body.jobId);
      expect(savedJob).toBeDefined();
      expect(savedJob.business).toBe("dentist");
      expect(savedJob.location).toBe("Delhi");
      expect(savedJob.maxResults).toBe(50);
    });

    it("rejects missing business field", async () => {
      const response = await request(app)
        .post("/api/jobs")
        .send({
          location: "Delhi",
          maxResults: 50
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("INVALID_JOB_INPUT");
    });

    it("rejects business too short", async () => {
      const response = await request(app)
        .post("/api/jobs")
        .send({
          business: "d",
          location: "Delhi",
          maxResults: 50
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("INVALID_JOB_INPUT");
    });

    it("rejects location too short", async () => {
      const response = await request(app)
        .post("/api/jobs")
        .send({
          business: "dentist",
          location: "D",
          maxResults: 50
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("INVALID_JOB_INPUT");
    });

    it("rejects maxResults below minimum", async () => {
      const response = await request(app)
        .post("/api/jobs")
        .send({
          business: "dentist",
          location: "Delhi",
          maxResults: 0
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("INVALID_JOB_INPUT");
    });

    it("rejects maxResults above maximum", async () => {
      const response = await request(app)
        .post("/api/jobs")
        .send({
          business: "dentist",
          location: "Delhi",
          maxResults: 201
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("INVALID_JOB_INPUT");
    });

    it("uses default maxResults when not provided", async () => {
      const response = await request(app)
        .post("/api/jobs")
        .send({
          business: "dentist",
          location: "Delhi"
        });

      expect(response.status).toBe(202);
      const savedJob = await Job.findById(response.body.jobId);
      expect(savedJob.maxResults).toBe(50);
    });

    it("detects duplicate active request and returns 200 with duplicate flag", async () => {
      const jobData = {
        business: "dentist",
        location: "Delhi",
        maxResults: 50
      };

      const response1 = await request(app)
        .post("/api/jobs")
        .send(jobData);

      expect(response1.status).toBe(202);
      const jobId1 = response1.body.jobId;

      const response2 = await request(app)
        .post("/api/jobs")
        .send(jobData);

      expect(response2.status).toBe(200);
      expect(response2.body.duplicate).toBe(true);
      expect(response2.body.jobId).toBe(jobId1);
      expect(response2.body.status).toBe("queued");

      const count = await Job.countDocuments();
      expect(count).toBe(1);
    });

    it("allows resubmitting a completed job with same parameters", async () => {
      const jobData = {
        business: "dentist",
        location: "Delhi",
        maxResults: 50
      };

      const response1 = await request(app)
        .post("/api/jobs")
        .send(jobData);

      const jobId1 = response1.body.jobId;
      await Job.findByIdAndUpdate(jobId1, { status: "completed" });

      const response2 = await request(app)
        .post("/api/jobs")
        .send(jobData);

      expect(response2.status).toBe(202);
      expect(response2.body.jobId).not.toBe(jobId1);
    });
  });

  describe("GET /api/jobs", () => {
    it("returns paginated jobs with default pagination", async () => {
      for (let i = 0; i < 30; i += 1) {
        await Job.create({
          business: `business${i}`,
          location: `location${i}`,
          maxResults: 50,
          requestKey: generateUniqueRequestKey()
        });
      }

      const response = await request(app).get("/api/jobs");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
      expect(response.body).toHaveProperty("page");
      expect(response.body).toHaveProperty("limit");
      expect(response.body).toHaveProperty("total");
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(25);
      expect(response.body.total).toBe(30);
      expect(response.body.data).toHaveLength(25);
    });

    it("respects custom pagination parameters", async () => {
      for (let i = 0; i < 10; i += 1) {
        await Job.create({
          business: `business${i}`,
          location: `location${i}`,
          maxResults: 50,
          requestKey: generateUniqueRequestKey()
        });
      }

      const response = await request(app)
        .get("/api/jobs")
        .query({ page: 2, limit: 5 });

      expect(response.status).toBe(200);
      expect(response.body.page).toBe(2);
      expect(response.body.limit).toBe(5);
      expect(response.body.total).toBe(10);
      expect(response.body.data).toHaveLength(5);
    });

    it("rejects invalid page parameter", async () => {
      const response = await request(app)
        .get("/api/jobs")
        .query({ page: 0 });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("INVALID_PAGINATION");
    });

    it("rejects invalid limit parameter", async () => {
      const response = await request(app)
        .get("/api/jobs")
        .query({ limit: 101 });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("INVALID_PAGINATION");
    });

    it("returns empty array when no jobs exist", async () => {
      const response = await request(app).get("/api/jobs");

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
      expect(response.body.total).toBe(0);
    });

    it("returns jobs sorted by most recent first", async () => {
      const job1 = await Job.create({
        business: "business1",
        location: "location1",
        maxResults: 50,
        requestKey: generateUniqueRequestKey()
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      const job2 = await Job.create({
        business: "business2",
        location: "location2",
        maxResults: 50,
        requestKey: generateUniqueRequestKey()
      });

      const response = await request(app).get("/api/jobs");

      expect(response.body.data[0]._id).toBe(job2._id.toString());
      expect(response.body.data[1]._id).toBe(job1._id.toString());
    });
  });

  describe("GET /api/jobs/:id", () => {
    it("returns existing job", async () => {
      const job = await Job.create({
        business: "dentist",
        location: "Delhi",
        maxResults: 50,
        requestKey: generateUniqueRequestKey()
      });

      const response = await request(app).get(`/api/jobs/${job._id}`);

      expect(response.status).toBe(200);
      expect(response.body._id).toBe(job._id.toString());
      expect(response.body.business).toBe("dentist");
      expect(response.body.location).toBe("Delhi");
    });

    it("returns 404 for nonexistent job", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app).get(`/api/jobs/${fakeId}`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("JOB_NOT_FOUND");
    });

    it("rejects invalid job ID format", async () => {
      const response = await request(app).get("/api/jobs/invalid-id");

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("INVALID_ID");
    });
  });

  describe("POST /api/jobs/:id/cancel", () => {
    it("cancels queued job", async () => {
      const job = await Job.create({
        business: "dentist",
        location: "Delhi",
        maxResults: 50,
        requestKey: generateUniqueRequestKey(),
        status: "queued"
      });

      const response = await request(app)
        .post(`/api/jobs/${job._id}/cancel`);

      expect(response.status).toBe(200);
      expect(response.body.jobId).toBe(job._id.toString());
      expect(response.body.status).toBe("cancelled");

      const updated = await Job.findById(job._id);
      expect(updated.status).toBe("cancelled");
      expect(updated.completedAt).toBeDefined();
    });

    it("cancels running job", async () => {
      const job = await Job.create({
        business: "dentist",
        location: "Delhi",
        maxResults: 50,
        requestKey: generateUniqueRequestKey(),
        status: "running",
        startedAt: new Date()
      });

      const response = await request(app)
        .post(`/api/jobs/${job._id}/cancel`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("cancelled");
    });

    it("returns 404 for nonexistent job", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .post(`/api/jobs/${fakeId}/cancel`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("JOB_NOT_FOUND");
    });

    it("returns 409 when trying to cancel completed job", async () => {
      const job = await Job.create({
        business: "dentist",
        location: "Delhi",
        maxResults: 50,
        requestKey: generateUniqueRequestKey(),
        status: "completed",
        completedAt: new Date()
      });

      const response = await request(app)
        .post(`/api/jobs/${job._id}/cancel`);

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe("JOB_NOT_CANCELLABLE");
    });

    it("returns 409 when trying to cancel failed job", async () => {
      const job = await Job.create({
        business: "dentist",
        location: "Delhi",
        maxResults: 50,
        requestKey: generateUniqueRequestKey(),
        status: "failed",
        completedAt: new Date()
      });

      const response = await request(app)
        .post(`/api/jobs/${job._id}/cancel`);

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe("JOB_NOT_CANCELLABLE");
    });

    it("rejects invalid job ID format", async () => {
      const response = await request(app)
        .post("/api/jobs/invalid-id/cancel");

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("INVALID_ID");
    });
  });

  describe("GET /api/leads", () => {
    it("returns paginated leads with default pagination", async () => {
      for (let i = 0; i < 30; i += 1) {
        await Lead.create({
          name: `Business ${i}`,
          phone: generateUniquePhone(),
          normalizedPhone: generateUniquePhone(),
          address: `Address ${i}`,
          website: generateUniqueUrl(),
          googleMapsUrl: generateUniqueUrl("maps")
        });
      }

      const response = await request(app).get("/api/leads");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
      expect(response.body).toHaveProperty("page");
      expect(response.body).toHaveProperty("limit");
      expect(response.body).toHaveProperty("total");
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(25);
      expect(response.body.total).toBe(30);
      expect(response.body.data).toHaveLength(25);
    });

    it("respects custom pagination parameters", async () => {
      for (let i = 0; i < 10; i += 1) {
        await Lead.create({
          name: `Business ${i}`,
          phone: generateUniquePhone(),
          normalizedPhone: generateUniquePhone(),
          address: `Address ${i}`,
          website: generateUniqueUrl(),
          googleMapsUrl: generateUniqueUrl("maps")
        });
      }

      const response = await request(app)
        .get("/api/leads")
        .query({ page: 2, limit: 3 });

      expect(response.status).toBe(200);
      expect(response.body.page).toBe(2);
      expect(response.body.limit).toBe(3);
      expect(response.body.total).toBe(10);
      expect(response.body.data).toHaveLength(3);
    });

    it("returns empty array when no leads exist", async () => {
      const response = await request(app).get("/api/leads");

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
      expect(response.body.total).toBe(0);
    });

    it("returns leads sorted by most recent first", async () => {
      const lead1 = await Lead.create({
        name: "Business 1",
        phone: generateUniquePhone(),
        normalizedPhone: generateUniquePhone(),
        address: "Address 1",
        website: generateUniqueUrl(),
        googleMapsUrl: generateUniqueUrl("maps")
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      const lead2 = await Lead.create({
        name: "Business 2",
        phone: generateUniquePhone(),
        normalizedPhone: generateUniquePhone(),
        address: "Address 2",
        website: generateUniqueUrl(),
        googleMapsUrl: generateUniqueUrl("maps")
      });

      const response = await request(app).get("/api/leads");

      expect(response.body.data[0]._id).toBe(lead2._id.toString());
      expect(response.body.data[1]._id).toBe(lead1._id.toString());
    });
  });

  describe("GET /api/leads/:id", () => {
    it("returns existing lead", async () => {
      const lead = await Lead.create({
        name: "Test Business",
        phone: generateUniquePhone(),
        normalizedPhone: generateUniquePhone(),
        address: "Test Address",
        website: generateUniqueUrl(),
        googleMapsUrl: generateUniqueUrl("maps")
      });

      const response = await request(app).get(`/api/leads/${lead._id}`);

      expect(response.status).toBe(200);
      expect(response.body._id).toBe(lead._id.toString());
      expect(response.body.name).toBe("Test Business");
      expect(response.body.address).toBe("Test Address");
    });

    it("returns 404 for nonexistent lead", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app).get(`/api/leads/${fakeId}`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("LEAD_NOT_FOUND");
    });

    it("rejects invalid lead ID format", async () => {
      const response = await request(app).get("/api/leads/invalid-id");

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("INVALID_ID");
    });
  });

  describe("DELETE /api/leads/:id", () => {
    it("deletes existing lead", async () => {
      const lead = await Lead.create({
        name: "Test Business",
        phone: generateUniquePhone(),
        normalizedPhone: generateUniquePhone(),
        address: "Test Address",
        website: generateUniqueUrl(),
        googleMapsUrl: generateUniqueUrl("maps")
      });

      const response = await request(app)
        .delete(`/api/leads/${lead._id}`);

      expect(response.status).toBe(204);

      const deleted = await Lead.findById(lead._id);
      expect(deleted).toBeNull();
    });

    it("returns 404 for nonexistent lead", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .delete(`/api/leads/${fakeId}`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("LEAD_NOT_FOUND");
    });

    it("rejects invalid lead ID format", async () => {
      const response = await request(app)
        .delete("/api/leads/invalid-id");

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("INVALID_ID");
    });
  });

  describe("GET /api/stats", () => {
    it("returns stats with empty database", async () => {
      const response = await request(app).get("/api/stats");

      expect(response.status).toBe(200);
      expect(response.body.totalLeads).toBe(0);
      expect(response.body.totalJobs).toBe(0);
      expect(response.body.completedJobs).toBe(0);
      expect(response.body.failedJobs).toBe(0);
      expect(response.body.leadsToday).toBe(0);
      expect(response.body.averageJobDurationMs).toBe(0);
      expect(response.body.averageLeadsPerJob).toBe(0);
      expect(response.body.successRate).toBe(0);
    });

    it("returns stats with jobs and leads", async () => {
      for (let i = 0; i < 5; i += 1) {
        await Lead.create({
          name: `Business ${i}`,
          phone: generateUniquePhone(),
          normalizedPhone: generateUniquePhone(),
          address: `Address ${i}`,
          website: generateUniqueUrl(),
          googleMapsUrl: generateUniqueUrl("maps")
        });
      }

      const startTime = new Date();
      await new Promise(resolve => setTimeout(resolve, 10));

      await Job.create({
        business: "dentist",
        location: "Delhi",
        maxResults: 50,
        requestKey: generateUniqueRequestKey(),
        status: "completed",
        leadsFound: 3,
        startedAt: startTime,
        completedAt: new Date()
      });

      await Job.create({
        business: "doctor",
        location: "Mumbai",
        maxResults: 50,
        requestKey: generateUniqueRequestKey(),
        status: "failed",
        completedAt: new Date()
      });

      const response = await request(app).get("/api/stats");

      expect(response.status).toBe(200);
      expect(response.body.totalLeads).toBe(5);
      expect(response.body.totalJobs).toBe(2);
      expect(response.body.completedJobs).toBe(1);
      expect(response.body.failedJobs).toBe(1);
      expect(response.body.successRate).toBe(0.5);
    });
  });

  describe("GET /api/health", () => {
    it("returns healthy status when database and redis connected", async () => {
      const response = await request(app).get("/api/health");

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("healthy");
      expect(response.body.database).toBe("connected");
      expect(response.body.redis).toBe("connected");
    });
  });

  describe("Error Handling", () => {
    it("returns 404 for nonexistent route", async () => {
      const response = await request(app).get("/api/nonexistent");

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("ROUTE_NOT_FOUND");
    });

    it("returns 400 for invalid JSON", async () => {
      const response = await request(app)
        .post("/api/jobs")
        .set("Content-Type", "application/json")
        .send("invalid json");

      expect(response.status).toBe(400);
    });
  });
});
