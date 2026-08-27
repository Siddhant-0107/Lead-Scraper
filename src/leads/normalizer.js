export const cleanText = value => String(value || "").replace(/\s+/g, " ").trim();
export function normalizePhone(value) {
  const raw = cleanText(value).replace(/[^\d+]/g, "");
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return null;
  if (raw.startsWith("+")) return `+${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `+91${digits.slice(1)}`;
  if (digits.length === 10) return `+91${digits}`;
  return `+${digits}`;
}
export function normalizeUrl(value) {
  const text = cleanText(value);
  if (!text) return null;
  try { const url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`); url.hash = ""; url.search = ""; return url.toString().replace(/\/$/, "").toLowerCase(); } catch { return null; }
}
export function normalizeLead(raw) {
  return { name: cleanText(raw.name), phone: cleanText(raw.phone) || null, normalizedPhone: normalizePhone(raw.phone), whatsapp: raw.whatsapp || null, address: cleanText(raw.address) || null, website: normalizeUrl(raw.website), googleMapsUrl: normalizeUrl(raw.googleMapsUrl), rating: Number.isFinite(Number(raw.rating)) ? Number(raw.rating) : null, reviewCount: Number.isFinite(Number(raw.reviewCount)) ? Number(raw.reviewCount) : null, category: cleanText(raw.category) || null, location: cleanText(raw.location) || null, source: "google_maps" };
}
