import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  MONGODB_URI: z.string().min(1).default("mongodb://localhost:27017/leadflow"),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
  MAX_CONCURRENT_JOBS: z.coerce.number().int().min(1).max(5).default(2),
  SCRAPE_TIMEOUT_MS: z.coerce.number().int().min(5000).max(120000).default(30000),
  JOB_ATTEMPTS: z.coerce.number().int().min(1).max(5).default(3),
  BACKOFF_DELAY_MS: z.coerce.number().int().min(100).max(30000).default(1000),
  MAX_RETRIES: z.coerce.number().int().min(0).max(10).default(3),
  MAX_SCROLL_ITERATIONS: z.coerce.number().int().min(5).max(50).default(20),
  GOOGLE_SHEET_ID: z.string().optional(),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
  CORS_ORIGIN: z.string().default("http://localhost:3000")
});
const parsed = schema.safeParse(process.env);
if (!parsed.success) throw new Error(`Invalid environment: ${parsed.error.issues.map(i => i.path.join(".")).join(", ")}`);
export const env = parsed.data;
