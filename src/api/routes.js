import { Router } from "express";
import mongoose from "mongoose";
import { Job } from "../jobs/job.model.js";
import { cancelJob, requestKeyFor } from "../jobs/job.service.js";
import { Lead } from "../leads/lead.model.js";
import { enqueueJob, connection } from "../jobs/queue.js";
import { createJobSchema, idSchema, paginationSchema } from "./validation.js";

const router = Router();
const apiError = (status, code, message) => Object.assign(new Error(message), { status, code, expose: true });
const parseId = id => { const result = idSchema.safeParse(id); if (!result.success) throw apiError(400, "INVALID_ID", "The resource id is invalid."); return id; };
const paginate = query => { const result = paginationSchema.safeParse(query); if (!result.success) throw apiError(400, "INVALID_PAGINATION", "page must be positive and limit must be between 1 and 100."); return result.data; };
router.post("/jobs", async (req, res) => {
  const parsed = createJobSchema.safeParse(req.body);
  if (!parsed.success) throw apiError(400, "INVALID_JOB_INPUT", "business, location, and maxResults are invalid.");
  const input = parsed.data; const requestKey = requestKeyFor(input);
  try { const job = await Job.create({ ...input, requestKey }); await enqueueJob(job); return res.status(202).json({ jobId: job.id, status: job.status }); } catch (error) {
    if (error?.code === 11000) { const active = await Job.findOne({ requestKey, status: { $in: ["queued", "running"] } }); return res.status(200).json({ jobId: active.id, status: active.status, duplicate: true }); }
    if (error?.name === "MongoServerError") throw error;
    const persisted = await Job.findOne({ requestKey, status: "queued" });
    if (persisted) await persisted.updateOne({ status: "failed", errorMessage: "Unable to queue job", completedAt: new Date() });
    throw error;
  }
});
router.get("/jobs", async (req, res) => { const { page, limit } = paginate(req.query); const [data, total] = await Promise.all([Job.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit), Job.countDocuments()]); res.json({ data, page, limit, total }); });
router.get("/jobs/:id", async (req, res) => { const job = await Job.findById(parseId(req.params.id)); if (!job) throw apiError(404, "JOB_NOT_FOUND", "The requested job does not exist."); res.json(job); });
router.post("/jobs/:id/cancel", async (req, res) => { const job = await cancelJob(parseId(req.params.id)); if (job) return res.json({ jobId: job.id, status: job.status }); const exists = await Job.exists({ _id: req.params.id }); if (!exists) throw apiError(404, "JOB_NOT_FOUND", "The requested job does not exist."); throw apiError(409, "JOB_NOT_CANCELLABLE", "The job is already in a terminal state."); });
router.get("/leads", async (req, res) => { const { page, limit } = paginate(req.query); const [data, total] = await Promise.all([Lead.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit), Lead.countDocuments()]); res.json({ data, page, limit, total }); });
router.get("/leads/:id", async (req, res) => { const lead = await Lead.findById(parseId(req.params.id)); if (!lead) throw apiError(404, "LEAD_NOT_FOUND", "The requested lead does not exist."); res.json(lead); });
router.delete("/leads/:id", async (req, res) => { const lead = await Lead.findByIdAndDelete(parseId(req.params.id)); if (!lead) throw apiError(404, "LEAD_NOT_FOUND", "The requested lead does not exist."); res.status(204).end(); });
router.get("/stats", async (_req, res) => { const today = new Date(); today.setHours(0, 0, 0, 0); const [totalLeads, totalJobs, completedJobs, failedJobs, leadsToday, durations, leadCounts] = await Promise.all([Lead.countDocuments(), Job.countDocuments(), Job.countDocuments({ status: "completed" }), Job.countDocuments({ status: "failed" }), Lead.countDocuments({ createdAt: { $gte: today } }), Job.aggregate([{ $match: { status: "completed", startedAt: { $ne: null } } }, { $project: { ms: { $subtract: ["$completedAt", "$startedAt"] } } }, { $group: { _id: null, value: { $avg: "$ms" } } }]), Job.aggregate([{ $match: { status: "completed" } }, { $group: { _id: null, value: { $avg: "$leadsFound" } } }])]); res.json({ totalLeads, totalJobs, completedJobs, failedJobs, leadsToday, averageJobDurationMs: Math.round(durations[0]?.value || 0), averageLeadsPerJob: Math.round(leadCounts[0]?.value || 0), successRate: totalJobs ? completedJobs / totalJobs : 0 }); });
router.get("/health", async (_req, res) => { const database = mongoose.connection.readyState === 1 ? "connected" : "disconnected"; const redis = connection.status === "ready" ? "connected" : "disconnected"; const healthy = database === "connected" && redis === "connected"; res.status(healthy ? 200 : 503).json({ status: healthy ? "healthy" : "degraded", database, redis }); });
export default router;
