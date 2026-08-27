import mongoose from "mongoose";
const schema = new mongoose.Schema({ name: { type: String, required: true, trim: true }, phone: String, normalizedPhone: { type: String, sparse: true, unique: true }, whatsapp: { type: String, default: null }, address: String, website: { type: String, sparse: true, unique: true }, googleMapsUrl: { type: String, sparse: true, unique: true }, rating: Number, reviewCount: Number, category: String, location: String, source: { type: String, default: "google_maps" }, jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job" } }, { timestamps: true });
schema.index({ name: 1, address: 1 }, { unique: true, sparse: true });
export const Lead = mongoose.model("Lead", schema);
