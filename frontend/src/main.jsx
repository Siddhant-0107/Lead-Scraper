import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Search, MapPin, Building2, RefreshCw, ExternalLink, Phone, Globe, Loader2, CheckCircle2, XCircle } from "lucide-react";
import "./styles.css";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");

async function api(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error?.message || "Request failed");
  return body;
}

function App() {
  const [business, setBusiness] = useState("dentist");
  const [location, setLocation] = useState("Dhanbad, Jharkhand");
  const [maxResults, setMaxResults] = useState(20);
  const [job, setJob] = useState(null);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const completed = job?.status === "completed";
  const terminal = ["completed", "failed", "cancelled"].includes(job?.status);

  async function loadLeads() {
    const result = await api("/api/leads?limit=100");
    setLeads(result.data || []);
  }

  useEffect(() => { loadLeads().catch(() => {}); }, []);

  useEffect(() => {
    if (!job?.jobId || terminal) return;
    const timer = setInterval(async () => {
      try {
        const latest = await api(`/api/jobs/${job.jobId}`);
        setJob(latest);
        if (["completed", "failed", "cancelled"].includes(latest.status)) {
          clearInterval(timer);
          if (latest.status === "completed") await loadLeads();
          setLoading(false);
        }
      } catch (err) {
        setError(err.message);
        clearInterval(timer);
        setLoading(false);
      }
    }, 1200);
    return () => clearInterval(timer);
  }, [job?.jobId, terminal]);

  async function startScrape(event) {
    event.preventDefault();
    setError("");
    setLeads([]);
    setLoading(true);
    setJob(null);
    try {
      const result = await api("/api/jobs", {
        method: "POST",
        body: JSON.stringify({ business: business.trim(), location: location.trim(), maxResults: Number(maxResults) })
      });
      setJob(result);
      if (result.duplicate) {
        const latest = await api(`/api/jobs/${result.jobId}`);
        setJob(latest);
      }
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  const statusLabel = useMemo(() => {
    if (!job) return "Ready to search";
    if (job.status === "queued") return "Queued — waiting for worker";
    if (job.status === "running") return `Scraping Google Maps — ${job.progress || 0}%`;
    if (job.status === "completed") return "Scrape completed";
    if (job.status === "cancelled") return "Job cancelled";
    return "Job failed";
  }, [job]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">L</span><span>LeadFlow</span></div>
        <span className="tag">Automated Lead Generation</span>
      </header>

      <main className="container">
        <section className="hero">
          <div>
            <p className="eyebrow">BUSINESS INTELLIGENCE</p>
            <h1>Find local businesses.<br /><span>Turn them into leads.</span></h1>
            <p className="hero-copy">Search public business listings and collect useful contact information through an asynchronous scraping pipeline.</p>
          </div>
          <div className="hero-badge"><span>●</span> System online</div>
        </section>

        <section className="search-card">
          <form onSubmit={startScrape}>
            <div className="field"><label><Building2 size={15} /> Business</label><input value={business} onChange={e => setBusiness(e.target.value)} placeholder="e.g. dentist" required minLength={2} /></div>
            <div className="field"><label><MapPin size={15} /> Location</label><input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Dhanbad, Jharkhand" required minLength={2} /></div>
            <div className="field small"><label>Max results</label><input type="number" min="1" max="200" value={maxResults} onChange={e => setMaxResults(e.target.value)} /></div>
            <button className="search-btn" disabled={loading}><Search size={18} /> {loading ? "Searching…" : "Find Leads"}</button>
          </form>
        </section>

        {error && <div className="alert"><XCircle size={18} /> {error}</div>}

        <section className="status-card">
          <div className="status-main">
            {loading ? <Loader2 className="spin" size={20} /> : completed ? <CheckCircle2 size={20} /> : <span className="status-dot" />}
            <div><strong>{statusLabel}</strong><span>{job ? `Job ${job.jobId}` : "Enter a search above to start a job"}</span></div>
          </div>
          {job && <div className="stats"><div><strong>{job.leadsFound ?? 0}</strong><span>Leads found</span></div><div><strong>{job.duplicates ?? 0}</strong><span>Duplicates</span></div><div><strong>{job.progress ?? 0}%</strong><span>Progress</span></div></div>}
        </section>

        {job?.status === "running" && <div className="progress"><div style={{ width: `${job.progress || 0}%` }} /></div>}

        <section className="results-section">
          <div className="section-heading"><div><p className="eyebrow">RESULTS</p><h2>Lead directory</h2></div><button className="refresh" onClick={() => loadLeads()} title="Refresh leads"><RefreshCw size={17} /></button></div>
          {leads.length === 0 ? <div className="empty"><Search size={30} /><h3>No leads to display</h3><p>Run a search to populate your lead directory.</p></div> : <div className="table-wrap"><table><thead><tr><th>Business</th><th>Phone</th><th>Website</th><th>Address</th><th>Maps</th></tr></thead><tbody>{leads.map(lead => <tr key={lead._id}><td><strong>{lead.name || "—"}</strong>{lead.category && <small>{lead.category}</small>}</td><td>{lead.phone ? <a href={`tel:${lead.phone}`}><Phone size={14} />{lead.phone}</a> : "—"}</td><td>{lead.website ? <a href={lead.website} target="_blank" rel="noreferrer"><Globe size={14} />Visit</a> : "—"}</td><td className="address">{lead.address || "—"}</td><td>{lead.googleMapsUrl ? <a href={lead.googleMapsUrl} target="_blank" rel="noreferrer"><ExternalLink size={14} />Open</a> : "—"}</td></tr>)}</tbody></table></div>}
        </section>
      </main>
      <footer>LeadFlow · Public business listing data · Built with Node.js, BullMQ, Puppeteer & MongoDB</footer>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<React.StrictMode><App /></React.StrictMode>);
