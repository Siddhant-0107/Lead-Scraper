import { Queue } from "bullmq";
import IORedis from "ioredis";
import { env } from "../config/env.js";
export const connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
export const jobQueue = new Queue("scrape-jobs", { connection });
export async function enqueueJob(job) { const queued = await jobQueue.add("scrape", { jobId: job.id }, { jobId: job.id, attempts: env.JOB_ATTEMPTS, backoff: { type: "exponential", delay: env.BACKOFF_DELAY_MS }, removeOnComplete: { age: 86400, count: 1000 }, removeOnFail: { age: 604800, count: 1000 } }); await job.updateOne({ queueJobId: queued.id }); return queued; }
export async function closeQueue() { await jobQueue.close(); await connection.quit(); }
