import { NextResponse } from "next/server";
import { claimNextRun } from "../../../../../repositories/leadSourcingRepository";
import { workerAuthorized } from "../../../../../services/leadSourcing/workerAuth";

// Lead sourcing worker (2026-11-17): the crawler worker (workers/lead-sourcing, AWS Lambda on a
// schedule) claims the oldest queued run here. Only seeds and the credit cap are returned; the
// run's organization never leaves the server.
export async function POST(request: Request) {
  if (!workerAuthorized(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const run = await claimNextRun();
  if (!run) return NextResponse.json({ run: null });
  return NextResponse.json({ run: { id: run.id, seeds: run.seeds, verifyCap: run.verifyCap } });
}
