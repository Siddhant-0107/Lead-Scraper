import { Worker } from "bullmq";
import { connectDatabase, closeDatabase } from "../db.js";
import { env } from "../config/env.js";
import { Job } from "./job.model.js";
import { claimJob, completeJob, failJob, updateProgress } from "./job.service.js";
import { connection } from "./queue.js";
import { scrapeGoogleMaps } from "../scraper/googleMapsScraper.js";
import { persistLeads } from "../leads/lead.service.js";
import { exportLeads } from "../sheets/sheetsExporter.js";
import { logger } from "../utils/logger.js";

await connectDatabase();
const worker = new Worker("scrape-jobs", async queueJob => {
  const jobId = queueJob.data.jobId;
  const record = await claimJob(jobId);
  if (!record) return; // cancelled, terminal, or already claimed by another worker
  const started = Date.now();
  try {
    const raw = await scrapeGoogleMaps({ business: record.business, location: record.location, maxResults: record.maxResults, isCancelled: async () => (await Job.exists({ _id: jobId, status: "cancelled" })) !== null, onProgress: async (progress, leadsFound) => { await updateProgress(jobId, progress, leadsFound); await queueJob.updateProgress(progress); } });
    if (await Job.exists({ _id: jobId, status: "cancelled" })) return;
    const result = await persistLeads(raw, jobId);
    const completed = await completeJob(jobId, { leadsFound: raw.length, duplicates: result.duplicates });
    if (!completed) return; // cancellation won the completion race
    try { const exportResult = await exportLeads(result.normalized); logger.info({ jobId, ...exportResult }, "Sheets export completed"); } catch (error) { logger.warn({ err: error, jobId }, "Sheets export failed"); }
    logger.info({ jobId, operation: "scrape", durationMs: Date.now() - started, leadsFound: raw.length, newLeads: result.stored, duplicates: result.duplicates, status: "completed" }, "Scrape job completed");
  } catch (error) {
    logger.error({ err: error, jobId, operation: "scrape", attempt: queueJob.attemptsMade + 1 }, "Scrape job failed");
    throw error; // BullMQ applies the configured retry/backoff policy
  }
}, { connection, concurrency: env.MAX_CONCURRENT_JOBS });
worker.on("failed", async (queueJob, error) => { if (!queueJob?.data.jobId) return; const safeMessage = error.message.slice(0, 500); if (queueJob.attemptsMade < (queueJob.opts.attempts || 1)) { await Job.updateOne({ _id: queueJob.data.jobId, status: "running" }, { $set: { status: "queued", errorMessage: safeMessage } }); return; } await failJob(queueJob.data.jobId, safeMessage); });
async function shutdown(signal) { logger.info({ signal }, "Worker shutdown requested"); await worker.close(); await connection.quit(); await closeDatabase(); process.exit(0); }
process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));
