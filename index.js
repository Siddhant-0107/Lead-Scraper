import { connectDatabase, closeDatabase } from "./src/db.js";
import { Job } from "./src/jobs/job.model.js";
import { enqueueJob, closeQueue } from "./src/jobs/queue.js";
const [business = "barber", location = "Delhi", rawMaxResults = "50"] = process.argv.slice(2);
await connectDatabase();
try { const job = await Job.create({ business, location, maxResults: Math.min(Math.max(Number(rawMaxResults) || 50, 1), 200) }); await enqueueJob(job); console.log(`Queued job ${job.id}. Start a worker with: npm run worker`); } finally { await Promise.allSettled([closeDatabase(), closeQueue()]); }
