import mongoose from "mongoose";
const schema = new mongoose.Schema({ business: { type: String, required: true }, location: { type: String, required: true }, maxResults: { type: Number, required: true }, requestKey: { type: String, required: true }, status: { type: String, enum: ["queued", "running", "completed", "failed", "cancelled"], default: "queued", index: true }, progress: { type: Number, default: 0, min: 0, max: 100 }, leadsFound: { type: Number, default: 0 }, duplicates: { type: Number, default: 0 }, errorMessage: String, startedAt: Date, completedAt: Date, queueJobId: String, attemptCount: { type: Number, default: 0 } }, { timestamps: true });
schema.index({ status: 1, createdAt: -1 });
schema.index({ requestKey: 1 }, { unique: true, partialFilterExpression: { status: { $in: ["queued", "running"] } } });
export const Job = mongoose.model("Job", schema);
