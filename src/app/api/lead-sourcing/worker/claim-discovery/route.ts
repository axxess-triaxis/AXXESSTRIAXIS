import { NextResponse } from "next/server";
import { claimNextDiscovery } from "../../../../../repositories/leadSourcingScheduleRepository";
import { workerAuthorized } from "../../../../../services/leadSourcing/workerAuth";

// Lead sourcing discovery claim (2026-11-18): the worker takes the oldest discovery run and gets
// only what to look for and its search budget. The run's organization never leaves the server.
export async function POST(request: Request) {
  if (!workerAuthorized(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const claim = await claimNextDiscovery();
  if (!claim) return NextResponse.json({ run: null });
  const { segment, countries, cities, target, maxSearches } = claim.discovery;
  return NextResponse.json({ run: { id: claim.id, segment, countries, cities, target, maxSearches } });
}
