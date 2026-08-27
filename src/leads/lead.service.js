import { Lead } from "./lead.model.js";
import { deduplicate } from "./deduplicator.js";
import { normalizeLead } from "./normalizer.js";
export async function persistLeads(rawLeads, jobId) {
  const leads = deduplicate(rawLeads.map(normalizeLead)); let stored = 0; let duplicates = rawLeads.length - leads.length;
  for (const lead of leads) { try { await Lead.create({ ...lead, jobId }); stored += 1; } catch (error) { if (error?.code === 11000) duplicates += 1; else throw error; } }
  return { stored, duplicates, normalized: leads };
}
