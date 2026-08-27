import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import routes from "./api/routes.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
export function createApp() { const app = express(); app.disable("x-powered-by"); app.use(pinoHttp({ logger })); app.use(helmet()); app.use(cors({ origin: env.CORS_ORIGIN.split(","), methods: ["GET", "POST", "DELETE"] })); app.use(express.json({ limit: "20kb" })); app.use(rateLimit({ windowMs: 900000, limit: 200, standardHeaders: "draft-8", legacyHeaders: false })); app.use("/api", routes); app.use((req, res) => res.status(404).json({ error: { code: "ROUTE_NOT_FOUND", message: `Route ${req.method} ${req.path} not found` } })); app.use((error, _req, res, _next) => { logger.error({ err: error }, "Request failed"); res.status(error.status || 500).json({ error: { code: error.code || "INTERNAL_ERROR", message: error.expose ? error.message : "An unexpected error occurred." } }); }); return app; }
