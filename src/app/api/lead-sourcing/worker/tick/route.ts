import { NextResponse } from "next/server";
import { workerAuthorized } from "../../../../../services/leadSourcing/workerAuth";
import { runSchedulerTick } from "../../../../../services/leadSourcing/scheduler";

// Lead sourcing scheduler tick (2026-11-18): the worker calls this first on every run. Due schedules
// become discovery runs, after the monthly caps. Returns counts only.
export async function POST(request: Request) {
  if (!workerAuthorized(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  return NextResponse.json(await runSchedulerTick());
}
