"use client";

// A-96 (2026-08-04): real, tenant-settable keyword -> topic/urgency alert rules -- founder chose
// this over a demo-only mockup. Backed by the real social_alert_rules table (previously real
// schema/RLS with zero application code reading or writing it). Works identically for real and
// demo tenants; no isDemoModeEnabled() gate.
import { useCallback, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/feedback/EmptyState";
import type { SocialAlertRule, SocialAlertRuleProvider, SocialAlertRuleUrgency } from "../../domain";

const ruleProviderOptions: Array<{ id: SocialAlertRuleProvider; label: string }> = [
  { id: "facebook", label: "Facebook" },
  { id: "x", label: "X" },
  { id: "instagram", label: "Instagram" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "threads", label: "Threads" },
  { id: "rss", label: "Circulars, Substack & Medium" },
  // Sprint 1 real Social Alerts (2026-08-17): real, ingested end to end (see
  // src/services/alerts/brand24Ingestion.ts) -- without this option, a tenant could never create
  // the "brand24" rule the daily cron's matching engine looks for.
  { id: "brand24", label: "Brand24" },
];

const urgencyOptions: SocialAlertRuleUrgency[] = ["low", "medium", "high"];

export function SocialAlertRulesPanel() {
  const [rules, setRules] = useState<SocialAlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState<SocialAlertRuleProvider>("facebook");
  const [keyword, setKeyword] = useState("");
  const [topic, setTopic] = useState("");
  const [urgency, setUrgency] = useState<SocialAlertRuleUrgency>("medium");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRules = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/social-alert-rules", { credentials: "include", cache: "no-store" });
      const result = await response.json().catch(() => ({})) as { rules?: SocialAlertRule[] };
      setRules(result.rules ?? []);
    } catch {
      setRules([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRules();
  }, [loadRules]);

  async function addRule() {
    if (!keyword.trim() || !topic.trim()) {
      setError("Keyword and topic are both required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/social-alert-rules", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, keyword: keyword.trim(), topic: topic.trim(), urgency }),
      });
      const result = await response.json().catch(() => ({} as { error?: string; rule?: SocialAlertRule }));
      if (!response.ok || !result.rule) throw new Error(result.error ?? "Creating the rule failed.");
      setRules((current) => [result.rule as SocialAlertRule, ...current]);
      setKeyword("");
      setTopic("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Creating the rule failed.");
    } finally {
      setSaving(false);
    }
  }

  async function removeRule(ruleId: string) {
    try {
      const response = await fetch(`/api/social-alert-rules/${ruleId}`, { method: "DELETE", credentials: "include" });
      if (!response.ok) throw new Error("Removing the rule failed.");
      setRules((current) => current.filter((rule) => rule.id !== ruleId));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Removing the rule failed.");
    }
  }

  return (
    <Card className="p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-[#0F1117]">Alert Rules</h3>
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[#5F6B73]">
          Define which keywords, per source, should be tagged with a topic and urgency when a matching signal arrives. Rules are tenant-scoped and apply the moment a live signal source is connected.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1.2fr_1.2fr_0.8fr_auto]">
        <select
          aria-label="Rule provider"
          value={provider}
          onChange={(event) => setProvider(event.target.value as SocialAlertRuleProvider)}
          className="rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-xs outline-none"
        >
          {ruleProviderOptions.map((option) => (
            <option key={option.id} value={option.id}>{option.label}</option>
          ))}
        </select>
        <input
          aria-label="Keyword"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="Keyword (e.g. oxygen resilience)"
          className="rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-xs outline-none"
        />
        <input
          aria-label="Topic"
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          placeholder="Topic (e.g. healthcare funding)"
          className="rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-xs outline-none"
        />
        <select
          aria-label="Urgency"
          value={urgency}
          onChange={(event) => setUrgency(event.target.value as SocialAlertRuleUrgency)}
          className="rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-xs capitalize outline-none"
        >
          {urgencyOptions.map((option) => (
            <option key={option} value={option} className="capitalize">{option}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => void addRule()}
          disabled={saving}
          className="rounded-lg bg-[#8B1E2D] px-3 py-2 text-xs font-semibold text-white hover:bg-[#7a1a27] disabled:opacity-60"
        >
          {saving ? "Adding..." : "Add rule"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs font-medium text-red-700">{error}</p>}

      <div className="mt-4">
        {loading ? (
          <p className="text-xs text-[#5F6B73]">Loading rules...</p>
        ) : rules.length === 0 ? (
          <EmptyState message="No alert rules configured yet. Add one above to start tagging matching signals with a topic and urgency." />
        ) : (
          <div className="space-y-2">
            {rules.map((rule) => {
              const providerLabel = ruleProviderOptions.find((option) => option.id === rule.provider)?.label ?? rule.provider;
              return (
                <div key={rule.id} className="flex items-center justify-between gap-3 rounded-lg border border-[rgba(0,0,0,0.06)] bg-[#F8F9FA] px-3 py-2">
                  <div className="min-w-0 text-xs">
                    <span className="font-semibold text-[#0F1117]">&ldquo;{rule.keyword}&rdquo;</span>
                    <span className="text-[#5F6B73]"> on {providerLabel} &rarr; {rule.topic}</span>
                    <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${rule.urgency === "high" ? "bg-red-50 text-red-700" : rule.urgency === "medium" ? "bg-amber-50 text-amber-700" : "bg-[#F2F3F5] text-[#5F6B73]"}`}>
                      {rule.urgency}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void removeRule(rule.id)}
                    aria-label={`Remove rule for ${rule.keyword}`}
                    className="flex-shrink-0 text-[#5F6B73] hover:text-red-700"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}

export default SocialAlertRulesPanel;
