export function dedupeKey(lead) {
  if (lead.normalizedPhone) return `phone:${lead.normalizedPhone}`;
  if (lead.googleMapsUrl) return `maps:${lead.googleMapsUrl}`;
  if (lead.website) return `site:${lead.website}`;
  return lead.name && lead.address ? `name-address:${lead.name.toLowerCase()}|${lead.address.toLowerCase()}` : null;
}
export function deduplicate(leads) { const seen = new Set(); return leads.filter(lead => { const key = dedupeKey(lead); if (!key || seen.has(key)) return false; seen.add(key); return true; }); }
