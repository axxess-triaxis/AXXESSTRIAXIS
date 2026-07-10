import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const WINDOWS = [
  { value: 1, label: "24h" },
  { value: 7, label: "7d" },
  { value: 30, label: "30d" },
  { value: 90, label: "90d" },
];

export default function AdminAnalytics() {
  const [params, setParams] = useSearchParams();
  const initialToken = params.get("token") || "";
  const [token, setToken] = useState(initialToken);
  const [days, setDays] = useState(7);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const timerRef = useRef(null);

  const fetchSummary = async (t, d) => {
    if (!t) return;
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API}/analytics/summary`, {
        params: { token: t, days: d },
      });
      setData(res.data);
      setLastFetched(new Date());
    } catch (err) {
      const status = err?.response?.status;
      const msg =
        status === 401
          ? "Invalid admin token."
          : status === 503
          ? "Admin token not configured on server."
          : "Could not load analytics.";
      setError(msg);
      setData(null);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialToken) fetchSummary(initialToken, days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // auto-refresh
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!autoRefresh || !token || !data) return;
    timerRef.current = setInterval(() => fetchSummary(token, days), 15000);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, token, days, data ? "loaded" : "empty"]);

  const submit = (e) => {
    e.preventDefault();
    if (!token.trim()) {
      toast.error("Enter the admin token.");
      return;
    }
    setParams({ token: token.trim() });
    fetchSummary(token.trim(), days);
  };

  const changeWindow = (d) => {
    setDays(d);
    if (token) fetchSummary(token, d);
  };

  return (
    <main
      data-testid="admin-analytics-page"
      className="min-h-screen bg-[color:var(--tx-cream)] text-[color:var(--tx-ink)]"
    >
      <div className="max-w-[1240px] mx-auto px-6 md:px-10 pt-14 md:pt-20 pb-24">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
          <div>
            <div className="eyebrow mb-3">Admin · Live Analytics</div>
            <h1 className="font-serif text-[36px] md:text-[52px] leading-tight tracking-tight">
              Traffic & engagement
            </h1>
          </div>
          <div className="flex items-center gap-4 text-[12px] font-mono uppercase tracking-widest text-[color:var(--tx-muted)]">
            <Link
              to={`/admin/waitlist?token=${encodeURIComponent(token)}`}
              className="link-underline hover:text-[color:var(--tx-ink)]"
            >
              Waitlist ↗
            </Link>
            <Link to="/" className="link-underline hover:text-[color:var(--tx-ink)]">
              ← Site
            </Link>
          </div>
        </div>

        <form
          onSubmit={submit}
          data-testid="admin-token-form"
          className="border border-[color:var(--tx-line)] bg-white p-5 md:p-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-end mb-8"
        >
          <div className="flex-1">
            <label htmlFor="a-token" className="eyebrow block mb-2">
              Admin token
            </label>
            <input
              id="a-token"
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
            {loading ? "Loading…" : "Load analytics"}
          </button>
        </form>

        {error && !data && (
          <div
            data-testid="admin-error"
            className="border border-[color:var(--tx-line)] bg-white p-5 text-[14px] text-red-600"
          >
            {error}
          </div>
        )}

        {data && (
          <>
            {/* toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex gap-1 border border-[color:var(--tx-line)] bg-white p-0.5 rounded-sm">
                {WINDOWS.map((w) => (
                  <button
                    key={w.value}
                    data-testid={`window-${w.value}`}
                    onClick={() => changeWindow(w.value)}
                    className={`text-[11px] font-mono uppercase tracking-widest px-3 py-1.5 rounded-sm transition-colors ${
                      days === w.value
                        ? "bg-[color:var(--tx-ink)] text-white"
                        : "text-[color:var(--tx-muted)] hover:text-[color:var(--tx-ink)]"
                    }`}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-4 text-[11px] font-mono uppercase tracking-widest text-[color:var(--tx-muted)]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="accent-[color:var(--tx-ink)]"
                    data-testid="autorefresh-toggle"
                  />
                  auto-refresh 15s
                </label>
                {lastFetched && (
                  <span data-testid="last-fetched">
                    updated {lastFetched.toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>

            {/* stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-0 border border-[color:var(--tx-line)] mb-8 bg-white">
              <StatCard
                testid="stat-active-now"
                label="Active now"
                value={data.active_now}
                suffix={
                  <span className="inline-flex items-center gap-1 text-[10.5px] font-mono uppercase tracking-widest text-emerald-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 live-dot" />
                    live · 5 min
                  </span>
                }
              />
              <StatCard
                testid="stat-total-pageviews"
                label={`Pageviews · ${days}d`}
                value={data.total_pageviews}
              />
              <StatCard
                testid="stat-unique-sessions"
                label={`Unique sessions · ${days}d`}
                value={data.unique_sessions}
              />
              <StatCard
                testid="stat-avg-dwell"
                label="Avg dwell"
                value={formatDwell(data.avg_dwell_seconds)}
                small
              />
              <StatCard
                testid="stat-all-time"
                label="All-time pageviews"
                value={data.total_pageviews_all_time}
              />
            </div>

            {/* time series + device */}
            <div className="grid lg:grid-cols-3 gap-6 mb-8">
              <div className="lg:col-span-2 border border-[color:var(--tx-line)] bg-white p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="eyebrow">Pageviews · last {days} days</div>
                  <div className="font-mono text-[10.5px] tracking-widest uppercase text-[color:var(--tx-muted)]">
                    {sum(data.by_day, "pageviews")} views
                  </div>
                </div>
                <TimeseriesBars data={data.by_day} />
              </div>
              <div className="border border-[color:var(--tx-line)] bg-white p-6">
                <div className="eyebrow mb-6">Devices · {days}d</div>
                <DeviceBars devices={data.devices} />
              </div>
            </div>

            {/* referrers + sections */}
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="border border-[color:var(--tx-line)] bg-white p-6">
                <div className="eyebrow mb-4">Top referrers</div>
                <TableList items={data.top_referrers} keyField="referrer" testidPrefix="referrer" />
              </div>
              <div className="border border-[color:var(--tx-line)] bg-white p-6">
                <div className="eyebrow mb-4">Section engagement</div>
                <TableList
                  items={data.top_sections}
                  keyField="section"
                  testidPrefix="section"
                  transform={(s) => s.replace(/-/g, " ")}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function StatCard({ testid, label, value, suffix, small = false }) {
  return (
    <div
      data-testid={testid}
      className="p-6 border-t sm:border-t-0 lg:border-l border-[color:var(--tx-line)] first:border-l-0 first:border-t-0"
    >
      <div className="eyebrow">{label}</div>
      <div
        className={`mt-3 font-serif leading-none tracking-tight ${
          small ? "text-[30px] md:text-[36px]" : "text-[36px] md:text-[46px]"
        }`}
      >
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      {suffix && <div className="mt-3">{suffix}</div>}
    </div>
  );
}

function TimeseriesBars({ data }) {
  const max = Math.max(1, ...data.map((d) => d.pageviews));
  return (
    <div>
      <div className="flex items-end gap-2 h-[180px]" data-testid="timeseries-chart">
        {data.map((d) => {
          const h = Math.max(2, Math.round((d.pageviews / max) * 170));
          return (
            <div key={d.date} className="flex-1 flex flex-col items-center group">
              <div className="w-full flex-1 flex items-end">
                <div
                  className="w-full bg-[color:var(--tx-ink)] group-hover:bg-[color:var(--tx-blue)] transition-colors relative"
                  style={{ height: `${h}px` }}
                  title={`${d.date} · ${d.pageviews} views · ${d.sessions} sessions`}
                >
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10.5px] font-mono uppercase tracking-widest bg-[color:var(--tx-ink)] text-white px-2 py-0.5 rounded-sm">
                    {d.pageviews} · {d.sessions}s
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[10.5px] font-mono uppercase tracking-widest text-[color:var(--tx-muted)]">
        <span>{shortDate(data[0]?.date)}</span>
        <span>{shortDate(data[data.length - 1]?.date)}</span>
      </div>
    </div>
  );
}

function DeviceBars({ devices }) {
  const entries = [
    ["Desktop", devices.desktop || 0],
    ["Mobile", devices.mobile || 0],
    ["Tablet", devices.tablet || 0],
  ];
  const total = Math.max(1, entries.reduce((s, [, v]) => s + v, 0));
  return (
    <ul className="space-y-4">
      {entries.map(([label, val]) => {
        const pct = Math.round((val / total) * 100);
        return (
          <li key={label} data-testid={`device-${label.toLowerCase()}`}>
            <div className="flex items-center justify-between text-[13px]">
              <span>{label}</span>
              <span className="font-mono text-[12px] text-[color:var(--tx-muted)]">
                {val} · {pct}%
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full bg-[color:var(--tx-line)] overflow-hidden rounded-sm">
              <div
                className="h-full bg-[color:var(--tx-ink)]"
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function TableList({ items, keyField, testidPrefix, transform }) {
  if (!items || items.length === 0) {
    return (
      <div className="text-[13px] text-[color:var(--tx-muted)] py-6 text-center">
        No data yet — this window is empty.
      </div>
    );
  }
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <ul className="space-y-3" data-testid={`${testidPrefix}-list`}>
      {items.map((item) => {
        const key = item[keyField];
        const pct = Math.round((item.count / max) * 100);
        return (
          <li key={key} data-testid={`${testidPrefix}-row`}>
            <div className="flex items-center justify-between text-[13.5px]">
              <span className="truncate pr-3">
                {transform ? transform(key) : key}
              </span>
              <span className="font-mono text-[12px] text-[color:var(--tx-muted)]">
                {item.count}
              </span>
            </div>
            <div className="mt-2 h-1 w-full bg-[color:var(--tx-line)] overflow-hidden rounded-sm">
              <div className="h-full bg-[color:var(--tx-ink)]" style={{ width: `${pct}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function sum(arr, key) {
  return (arr || []).reduce((s, x) => s + (x[key] || 0), 0);
}
function shortDate(iso) {
  if (!iso) return "";
  const [, m, d] = iso.split("-");
  return `${m}/${d}`;
}
function formatDwell(seconds) {
  if (!seconds) return "0s";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds - m * 60);
  return s ? `${m}m ${s}s` : `${m}m`;
}
