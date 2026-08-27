import { Job } from "./job.model.js";
import { JOB_STATUS } from "./state.js";

export const ACTIVE_STATUSES = [JOB_STATUS.QUEUED, JOB_STATUS.RUNNING];
export const requestKeyFor = ({ business, location, maxResults }) => `${business.trim().toLowerCase()}|${location.trim().toLowerCase()}|${maxResults}`;
export async function claimJob(jobId) { return Job.findOneAndUpdate({ _id: jobId, status: JOB_STATUS.QUEUED }, { $set: { status: JOB_STATUS.RUNNING, startedAt: new Date(), progress: 1, errorMessage: null }, $inc: { attemptCount: 1 } }, { new: true }); }
export async function updateProgress(jobId, progress, leadsFound) { return Job.updateOne({ _id: jobId, status: "running" }, { $set: { progress, leadsFound } }); }
export async function completeJob(jobId, values) { return Job.findOneAndUpdate({ _id: jobId, status: "running" }, { $set: { ...values, status: "completed", progress: 100, completedAt: new Date() } }, { new: true }); }
export async function failJob(jobId, errorMessage) { return Job.findOneAndUpdate({ _id: jobId, status: { $in: ["queued", "running"] } }, { $set: { status: "failed", errorMessage, completedAt: new Date() } }, { new: true }); }
export async function cancelJob(jobId) { return Job.findOneAndUpdate({ _id: jobId, status: { $in: ACTIVE_STATUSES } }, { $set: { status: "cancelled", completedAt: new Date() } }, { new: true }); }
