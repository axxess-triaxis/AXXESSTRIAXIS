import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AdminWaitlist() {
  const [params, setParams] = useSearchParams();
  const initialToken = params.get("token") || "";
  const [token, setToken] = useState(initialToken);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);

  const fetchList = async (t) => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API}/waitlist`, {
        params: { token: t, limit: 1000 },
      });
      setEntries(res.data || []);
      setLoaded(true);
    } catch (err) {
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail;
      const msg =
        status === 401
          ? "Invalid admin token."
          : status === 503
          ? "Server admin token not configured."
          : typeof detail === "string"
          ? detail
          : "Could not load waitlist.";
      setError(msg);
      setEntries([]);
      setLoaded(false);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialToken) {
      fetchList(initialToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    const total = entries.length;
    const ios = entries.filter((e) => e.platform === "ios").length;
    const android = entries.filter((e) => e.platform === "android").length;
    const both = entries.filter((e) => e.platform === "both").length;
    return { total, ios, android, both };
  }, [entries]);

  const submit = (e) => {
    e.preventDefault();
    if (!token.trim()) {
      toast.error("Enter the admin token.");
      return;
    }
    setParams({ token: token.trim() });
    fetchList(token.trim());
  };

  const csvHref = token
    ? `${API}/waitlist/export.csv?token=${encodeURIComponent(token)}`
    : "#";

  return (
    <main
      data-testid="admin-waitlist-page"
      className="min-h-screen bg-[color:var(--tx-cream)] text-[color:var(--tx-ink)]"
    >
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 pt-14 md:pt-20 pb-24">
        <div className="flex items-baseline justify-between mb-10">
          <div>
            <div className="eyebrow mb-3">Admin · Waitlist</div>
            <h1 className="font-serif text-[36px] md:text-[52px] leading-tight tracking-tight">
              AXXESS early-access signups
            </h1>
          </div>
          <a
            href={`/admin/analytics${token ? `?token=${encodeURIComponent(token)}` : ""}`}
            className="font-mono text-[11px] tracking-widest uppercase text-[color:var(--tx-muted)] hover:text-[color:var(--tx-ink)] link-underline mr-6"
          >
            Analytics ↗
          </a>
          <a
            href="/"
            className="font-mono text-[11px] tracking-widest uppercase text-[color:var(--tx-muted)] hover:text-[color:var(--tx-ink)] link-underline"
          >
            ← back to site
          </a>
        </div>

        <form
          onSubmit={submit}
          data-testid="admin-token-form"
          className="border border-[color:var(--tx-line)] bg-white p-5 md:p-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-end mb-8"
        >
          <div className="flex-1">
            <label
              htmlFor="admin-token"
              className="eyebrow block mb-2"
            >
              Admin token
            </label>
            <input
              id="admin-token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste ADMIN_TOKEN"
              data-testid="admin-token-input"
              className="w-full bg-[color:var(--tx-cream)] border border-[color:var(--tx-line)] px-4 py-2.5 text-[14px] rounded-sm focus:outline-none focus:border-[color:var(--tx-ink)] transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            data-testid="admin-token-submit"
            className="inline-flex items-center justify-center gap-2 text-[13.5px] font-medium bg-[color:var(--tx-ink)] text-white px-5 py-2.5 hover:bg-black transition-colors rounded-sm disabled:opacity-60"
          >
            {loading ? "Loading…" : "Load waitlist"}
          </button>
        </form>

        {error && !loaded && (
          <div
            data-testid="admin-error"
            className="border border-[color:var(--tx-line)] bg-white p-5 text-[14px] text-red-600"
          >
            {error}
          </div>
        )}

        {loaded && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-[color:var(--tx-line)] mb-8">
              {[
                ["Total", stats.total],
                ["iOS", stats.ios],
                ["Android", stats.android],
                ["Both", stats.both],
              ].map(([label, val], i) => (
                <div
                  key={label}
                  data-testid={`admin-stat-${label.toLowerCase()}`}
                  className={`p-6 bg-white ${
                    i > 0 ? "border-l border-[color:var(--tx-line)]" : ""
                  }`}
                >
                  <div className="eyebrow">{label}</div>
                  <div className="mt-2 font-serif text-[38px] leading-none tracking-tight">
                    {val}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between mb-4">
              <div className="font-mono text-[11px] tracking-widest uppercase text-[color:var(--tx-muted)]">
                {stats.total} row{stats.total === 1 ? "" : "s"} · newest first
              </div>
              <a
                href={csvHref}
                data-testid="admin-download-csv"
                className="inline-flex items-center gap-2 text-[13px] font-medium border border-[color:var(--tx-ink)] px-4 py-2 hover:bg-[color:var(--tx-ink)] hover:text-white transition-colors rounded-sm"
              >
                Download CSV
                <span aria-hidden>↓</span>
              </a>
            </div>

            <div className="border border-[color:var(--tx-line)] bg-white overflow-x-auto">
              <table
                data-testid="admin-waitlist-table"
                className="w-full text-[13.5px]"
              >
                <thead>
                  <tr className="border-b border-[color:var(--tx-line)] text-[color:var(--tx-muted)]">
                    <Th>#</Th>
                    <Th>Email</Th>
                    <Th>Platform</Th>
                    <Th>Source</Th>
                    <Th>Joined</Th>
                  </tr>
                </thead>
                <tbody>
                  {entries.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-[color:var(--tx-muted)]">
                        No signups yet.
                      </td>
                    </tr>
                  )}
                  {entries.map((e, i) => (
                    <tr
                      key={e.id || e.email}
                      className="border-b last:border-b-0 border-[color:var(--tx-line)] hover:bg-[color:var(--tx-cream)] transition-colors"
                    >
                      <Td>
                        <span className="font-mono text-[color:var(--tx-muted)]">
                          {String(i + 1).padStart(3, "0")}
                        </span>
                      </Td>
                      <Td>{e.email}</Td>
                      <Td>
                        <span className="inline-block font-mono text-[11px] uppercase tracking-widest px-2 py-0.5 border border-[color:var(--tx-line)] rounded-sm">
                          {e.platform}
                        </span>
                      </Td>
                      <Td>
                        <span className="font-mono text-[12px] text-[color:var(--tx-muted)]">
                          {e.source}
                        </span>
                      </Td>
                      <Td>
                        <span className="font-mono text-[12px] text-[color:var(--tx-muted)]">
                          {formatDate(e.created_at)}
                        </span>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function Th({ children }) {
  return (
    <th className="font-mono text-[11px] tracking-widest uppercase text-left px-5 py-3">
      {children}
    </th>
  );
}
function Td({ children }) {
  return <td className="px-5 py-3">{children}</td>;
}

function formatDate(v) {
  if (!v) return "";
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(v);
  }
}
