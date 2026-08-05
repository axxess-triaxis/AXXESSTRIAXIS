"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Users } from "lucide-react";
import { useAuth } from "../../../auth/AuthProvider";
import { applicationServices } from "../../../providers/serviceProvider";
import { tenantScopeFromUser } from "../../../repositories/supabaseEnterpriseRepositories";
import type { Stakeholder } from "../../../domain";

// XL-6 (2026-08-06): AXXESS Lite's own People section -- contacts, wired to the same
// stakeholdersRepository X0's StakeholdersSection uses, not a duplicate store. Deliberately
// omits influenceScore/engagementLevel from every create call, the same honest-default pattern
// StakeholdersSection.tsx itself follows (A-58, RAG Remediation Sprint 3) -- Lite has even less
// reason to fabricate an influence/engagement assessment nobody supplied. No large stakeholder
// map, no relationship-owner picker -- just name, affiliation, and an optional follow-up note.
export function LitePeopleSection() {
  const { session } = useAuth();
  const user = session.user;
  const scope = useMemo(() => (user ? tenantScopeFromUser(user) : undefined), [user]);

  const [contacts, setContacts] = useState<Stakeholder[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [affiliation, setAffiliation] = useState("");
  const [noteTarget, setNoteTarget] = useState<Stakeholder | null>(null);
  const [noteBody, setNoteBody] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteSavedFor, setNoteSavedFor] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!scope) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await applicationServices.stakeholdersRepository.list(scope, { pageSize: 100 });
      setContacts(rows);
    } catch {
      setError("Couldn't load your contacts right now.");
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    if (!scope || !name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const created = await applicationServices.stakeholdersRepository.create(scope, {
        name: name.trim(),
        affiliation: affiliation.trim(),
      } as Partial<Stakeholder> & { name: string });
      setContacts((current) => [created, ...current]);
      setName("");
      setAffiliation("");
    } catch {
      setError("Couldn't save that -- please try again.");
    } finally {
      setSaving(false);
    }
  };

  const submitNote = async () => {
    if (!noteTarget || !noteBody.trim()) return;
    setNoteSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/stakeholders/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: `Follow-up: ${noteTarget.name}`, body: noteBody.trim() }),
      });
      if (!response.ok) throw new Error("note save failed");
      setNoteSavedFor(noteTarget.id);
      setNoteBody("");
      setNoteTarget(null);
    } catch {
      setError("Couldn't save that note -- please try again.");
    } finally {
      setNoteSaving(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <div>
        <h1 className="text-sm font-semibold text-[#0F1117]">People</h1>
        <p className="mt-0.5 text-xs text-[#5F6B73]">Your customers, vendors, and contacts.</p>
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-3.5">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Name"
          className="rounded-lg border border-[rgba(0,0,0,0.1)] px-3 py-2 text-xs outline-none focus:border-[#8B1E2D]"
        />
        <input
          value={affiliation}
          onChange={(event) => setAffiliation(event.target.value)}
          placeholder="Company or organization (optional)"
          className="rounded-lg border border-[rgba(0,0,0,0.1)] px-3 py-2 text-xs outline-none focus:border-[#8B1E2D]"
        />
        <button
          onClick={submit}
          disabled={saving || !name.trim()}
          className="rounded-lg bg-[#8B1E2D] px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
        >
          {saving ? "Saving..." : "Add contact"}
        </button>
        {error && <p className="text-[11px] text-[#B54708]">{error}</p>}
      </div>

      {loading ? (
        <p className="text-center text-xs text-[#5F6B73]">Loading...</p>
      ) : contacts.length === 0 ? (
        <div className="rounded-xl border border-[rgba(0,0,0,0.06)] bg-white px-6 py-8 text-center">
          <Users size={20} className="mx-auto mb-2 text-[#8B1E2D]" />
          <p className="text-xs text-[#5F6B73]">No contacts yet. Add your first one above.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[rgba(0,0,0,0.06)] bg-white">
          {contacts.map((contact) => (
            <div key={contact.id} className="border-b border-[rgba(0,0,0,0.04)] px-4 py-3 last:border-b-0">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-[#0F1117]">{contact.name}</p>
                  {contact.affiliation && <p className="truncate text-[10px] text-[#5F6B73]">{contact.affiliation}</p>}
                </div>
                <button
                  onClick={() => { setNoteTarget(contact); setNoteBody(""); }}
                  className="flex-shrink-0 rounded-lg border border-[rgba(0,0,0,0.1)] px-2.5 py-1 text-[10px] font-medium text-[#5F6B73] hover:border-[#8B1E2D] hover:text-[#8B1E2D]"
                >
                  Note
                </button>
              </div>
              {noteSavedFor === contact.id && <p className="mt-1 text-[10px] text-[#0E7C4A]">Follow-up note saved.</p>}
              {noteTarget?.id === contact.id && (
                <div className="mt-2 flex flex-col gap-1.5">
                  <textarea
                    value={noteBody}
                    onChange={(event) => setNoteBody(event.target.value)}
                    placeholder="Follow-up note..."
                    rows={2}
                    className="rounded-lg border border-[rgba(0,0,0,0.1)] px-2.5 py-1.5 text-[11px] outline-none focus:border-[#8B1E2D]"
                  />
                  <div className="flex gap-1.5">
                    <button
                      onClick={submitNote}
                      disabled={noteSaving || !noteBody.trim()}
                      className="rounded-lg bg-[#8B1E2D] px-2.5 py-1 text-[10px] font-semibold text-white disabled:opacity-40"
                    >
                      {noteSaving ? "Saving..." : "Save note"}
                    </button>
                    <button
                      onClick={() => setNoteTarget(null)}
                      className="rounded-lg border border-[rgba(0,0,0,0.1)] px-2.5 py-1 text-[10px] text-[#5F6B73]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
