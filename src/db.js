import mongoose from "mongoose";
import { env } from "./config/env.js";
export async function connectDatabase() { await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 }); }
export async function closeDatabase() { await mongoose.disconnect(); }
