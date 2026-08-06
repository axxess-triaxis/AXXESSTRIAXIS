"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../auth/AuthProvider";
import { applicationServices } from "../../../providers/serviceProvider";
import { tenantScopeFromUser } from "../../../repositories/supabaseEnterpriseRepositories";
import { liteNavItems } from "../liteNavigation";

// XL-1 (2026-08-05): Lite's home screen. Deliberately not the tiered/scored/criticality-banded
// Executive Dashboard (src/features/dashboard/DashboardSection.tsx) -- a small, fixed set of
// shortcuts only, per docs/readiness/AXXESS_LITE_PRODUCT_SURFACE_ROADMAP_2026_08_05.md Section 4.
//
// XL-6 (2026-08-06): added real, live counts (open tasks, upcoming meetings, contacts) fetched
// from the same repositories LiteWorkSection/LiteMeetingsSection/LitePeopleSection use -- never a
// fabricated number. Files stays an honest "not yet" count since Files itself isn't wired this
// pass (see the XL-6 closeout for why). A count fetch failure shows "--", not a fake zero or a
// silently stale number.
type CountState = number | "unavailable" | "loading";

export function LiteHomeSection() {
  const { session } = useAuth();
  const user = session.user;
  const firstName = user?.displayName?.split(" ")[0] ?? "there";
  const scope = useMemo(() => (user ? tenantScopeFromUser(user) : undefined), [user]);

  const [openTasks, setOpenTasks] = useState<CountState>("loading");
  const [upcomingMeetings, setUpcomingMeetings] = useState<CountState>("loading");
  const [contacts, setContacts] = useState<CountState>("loading");

  const load = useCallback(async () => {
    if (!scope) return;
    setOpenTasks("loading");
    setUpcomingMeetings("loading");
    setContacts("loading");
    const now = Date.now();
    try {
      const tasks = await applicationServices.tasksRepository.list(scope);
      setOpenTasks(tasks.filter((task) => task.status !== "completed").length);
    } catch {
      setOpenTasks("unavailable");
    }
    try {
      const meetings = await applicationServices.meetingsRepository.list(scope);
      setUpcomingMeetings(meetings.filter((meeting) => new Date(meeting.startsAt).getTime() >= now).length);
    } catch {
      setUpcomingMeetings("unavailable");
    }
    try {
      const stakeholders = await applicationServices.stakeholdersRepository.list(scope, { pageSize: 100 });
      setContacts(stakeholders.length);
    } catch {
      setContacts("unavailable");
    }
  }, [scope]);

  useEffect(() => {
    void load();
  }, [load]);

  const countLabel = (value: CountState) => (value === "loading" ? "..." : value === "unavailable" ? "--" : String(value));

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <div>
        <h1 className="text-base font-semibold text-[#0F1117]">Hi {firstName}</h1>
        <p className="mt-0.5 text-xs text-[#5F6B73]">Here&apos;s what needs your attention.</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Link href="/lite/work" className="flex flex-col gap-0.5 rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-3 text-center hover:border-[#8B1E2D]/30">
          <span className="text-lg font-semibold text-[#0F1117]">{countLabel(openTasks)}</span>
          <span className="text-[10px] text-[#5F6B73]">Open tasks</span>
        </Link>
        <Link href="/lite/meetings" className="flex flex-col gap-0.5 rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-3 text-center hover:border-[#8B1E2D]/30">
          <span className="text-lg font-semibold text-[#0F1117]">{countLabel(upcomingMeetings)}</span>
          <span className="text-[10px] text-[#5F6B73]">Upcoming</span>
        </Link>
        <Link href="/lite/people" className="flex flex-col gap-0.5 rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-3 text-center hover:border-[#8B1E2D]/30">
          <span className="text-lg font-semibold text-[#0F1117]">{countLabel(contacts)}</span>
          <span className="text-[10px] text-[#5F6B73]">Contacts</span>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {liteNavItems
          .filter((item) => item.id !== "home")
          .map((item) => (
            <Link
              key={item.id}
              href={item.path}
              className="flex flex-col gap-1.5 rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-3.5 hover:border-[#8B1E2D]/30"
            >
              <item.icon size={17} className="text-[#8B1E2D]" />
              <span className="text-xs font-semibold text-[#0F1117]">{item.label}</span>
              <span className="text-[10px] leading-snug text-[#5F6B73]">{item.description}</span>
            </Link>
          ))}
      </div>
    </div>
  );
}
