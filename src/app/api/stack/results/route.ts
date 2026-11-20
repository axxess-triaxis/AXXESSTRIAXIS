// Stack org routing (2026-11-20): STILL delivers Callismatic and Omnidamus results for jobs that AXXESS
// started, and each is filed into the organization that started the job (src/services/stack/stackResults.ts).
// Auth: `Authorization: Bearer <STACK_RESULTS_SECRET>`, held only by STILL (Secrets Manager) and Vercel
// env, at least 32 characters, or every call is refused. It is not an agent key and acts on no
// organization by itself: the job decides which one.
import { NextResponse } from "next/server";
import { workerAuthorized } from "../../../../services/leadSourcing/workerAuth";
import { fileStackResult } from "../../../../services/stack/stackResults";

export async function POST(request: Request) {
  if (!workerAuthorized(request, process.env.STACK_RESULTS_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const event = await request.json().catch(() => null);
  const outcome = await fileStackResult(event);
  return NextResponse.json(outcome.body, { status: outcome.status });
}
