import { z } from "zod";
export const createJobSchema = z.object({ business: z.string().trim().min(2).max(100), location: z.string().trim().min(2).max(100), maxResults: z.coerce.number().int().min(1).max(200).default(50) });
export const idSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid identifier");
export const paginationSchema = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(25) });
