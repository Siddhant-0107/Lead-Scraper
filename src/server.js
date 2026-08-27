import { createApp } from "./app.js";
import { connectDatabase, closeDatabase } from "./db.js";
import { env } from "./config/env.js";
import { closeQueue } from "./jobs/queue.js";
import { logger } from "./utils/logger.js";
await connectDatabase();
const server = createApp().listen(env.PORT, () => logger.info({ port: env.PORT }, "LeadFlow API listening"));
async function shutdown(signal) { logger.info({ signal }, "Shutting down"); server.close(async () => { await Promise.allSettled([closeDatabase(), closeQueue()]); process.exit(0); }); }
process.on("SIGTERM", () => shutdown("SIGTERM")); process.on("SIGINT", () => shutdown("SIGINT"));
