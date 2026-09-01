import mongoose from "mongoose";
import IORedis from "ioredis";

// Ensure tests use a dedicated test database
const TEST_MONGODB_URI = process.env.TEST_MONGODB_URI || "mongodb://localhost:27017/leadflow_test";
const TEST_REDIS_URL = process.env.TEST_REDIS_URL || "redis://localhost:6379/1";

export async function setupTestDatabase() {
  // Override env before app loads
  process.env.MONGODB_URI = TEST_MONGODB_URI;
  process.env.REDIS_URL = TEST_REDIS_URL;

  // Connect to test database
  await mongoose.connect(TEST_MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
}

export async function cleanupTestDatabase() {
  // Clean all collections but keep indexes
  const collections = await mongoose.connection.db.listCollections().toArray();
  for (const { name } of collections) {
    await mongoose.connection.db.dropCollection(name);
  }
}

export async function closeTestDatabase() {
  await mongoose.disconnect();
}

export async function setupTestRedis() {
  return new IORedis(TEST_REDIS_URL, { maxRetriesPerRequest: null });
}

export async function cleanupTestRedis(redis) {
  if (redis) {
    await redis.flushdb();
    await redis.quit();
  }
}

export async function createTestJob(overrides = {}) {
  const { Job } = await import("../src/jobs/job.model.js");
  const defaults = {
    business: "test_business",
    location: "test_location",
    maxResults: 50,
    requestKey: `test_${Date.now()}_${Math.random()}`,
    status: "queued"
  };
  return Job.create({ ...defaults, ...overrides });
}

export async function createTestLead(overrides = {}) {
  const { Lead } = await import("../src/leads/lead.model.js");
  const defaults = {
    name: `Test Business ${Date.now()}`,
    phone: "+919876543210",
    normalizedPhone: `+919876543210_${Date.now()}`,
    address: "Test Address",
    website: `https://test-${Date.now()}.com`,
    googleMapsUrl: `https://maps.google.com/test_${Date.now()}`,
    source: "google_maps"
  };
  return Lead.create({ ...defaults, ...overrides });
}

export function generateUniqueRequestKey() {
  return `test_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function generateUniquePhone() {
  const suffix = Math.floor(Math.random() * 10000000);
  return `+91${suffix.toString().padStart(10, "0")}`;
}

export function generateUniqueUrl(prefix = "test") {
  return `https://${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}.com`;
}
