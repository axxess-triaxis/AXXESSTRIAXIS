import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { motion } from "framer-motion";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PLATFORMS = [
  { value: "ios", label: "iOS" },
  { value: "android", label: "Android" },
  { value: "both", label: "Both" },
];

export default function WaitlistCard() {
  const [email, setEmail] = useState("");
  const [platform, setPlatform] = useState("both");
  const [submitting, setSubmitting] = useState(false);
  const [joined, setJoined] = useState(false);
  const [count, setCount] = useState(null);

  useEffect(() => {
    let alive = true;
    axios
      .get(`${API}/waitlist/count`)
      .then((r) => alive && setCount(r.data?.total ?? null))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !/^\S+@\S+\.\S+$/.test(trimmed)) {
      toast.error("Enter a valid email to join the waitlist.");
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API}/waitlist`, {
        email: trimmed,
        platform,
        source: "hero",
      });
      setJoined(true);
      setEmail("");
      setCount((c) => (typeof c === "number" ? c + 1 : c));
      toast.success("You're on the list. We'll email you at launch.");
    } catch (err) {
      const msg = err?.response?.data?.detail || "Couldn't join right now. Try again.";
      toast.error(typeof msg === "string" ? msg : "Failed to join waitlist.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
      data-testid="waitlist-card"
      className="relative border border-white/12 bg-black/40 backdrop-blur-sm p-5 md:p-6 rounded-sm overflow-hidden"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[color:var(--tx-blue)] to-transparent opacity-60" />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-[color:var(--tx-blue)] rounded-full live-dot" />
          <span className="font-mono text-[10.5px] tracking-widest uppercase text-white/70">
            Mobile early access · July 2026
          </span>
        </div>
        {count !== null && (
          <span
            data-testid="waitlist-count"
            className="font-mono text-[10.5px] tracking-widest uppercase text-white/50"
          >
            {count.toLocaleString()} joined
          </span>
        )}
      </div>

      {joined ? (
        <div data-testid="waitlist-success" className="py-2">
          <div className="font-serif text-[22px] leading-tight text-white">
            You&apos;re on the list.
          </div>
          <p className="mt-2 text-[13.5px] text-white/60">
            We&apos;ll email your invite before iOS + Android ship in July 2026.
          </p>
          <button
            onClick={() => setJoined(false)}
            data-testid="waitlist-add-another"
            className="mt-4 text-[12px] font-mono uppercase tracking-widest text-white/60 hover:text-white transition-colors link-underline"
          >
            Add another email
          </button>
        </div>
      ) : (
        <form onSubmit={submit} data-testid="waitlist-form" noValidate>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@enterprise.com"
              data-testid="waitlist-email-input"
              className="flex-1 bg-transparent border border-white/15 text-white placeholder:text-white/35 text-[14px] px-4 py-2.5 rounded-sm focus:outline-none focus:border-white/60 transition-colors"
            />
            <button
              type="submit"
              disabled={submitting}
              data-testid="waitlist-submit"
              className="inline-flex items-center justify-center gap-2 text-[13.5px] font-medium bg-white text-black px-5 py-2.5 hover:bg-white/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors rounded-sm"
            >
              {submitting ? "Joining…" : "Get early access"}
              {!submitting && <span aria-hidden>→</span>}
            </button>
          </div>

          <div className="mt-3 flex items-center gap-1.5">
            {PLATFORMS.map((p) => (
              <button
                type="button"
                key={p.value}
                onClick={() => setPlatform(p.value)}
                data-testid={`waitlist-platform-${p.value}`}
                className={`text-[11px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-sm border transition-colors ${
                  platform === p.value
                    ? "bg-white text-black border-white"
                    : "border-white/20 text-white/60 hover:border-white/50 hover:text-white/85"
                }`}
              >
                {p.label}
              </button>
            ))}
            <span className="text-[11px] font-mono uppercase tracking-widest text-white/40 ml-auto">
              1 email · 0 spam
            </span>
          </div>
        </form>
      )}
    </motion.div>
  );
}
