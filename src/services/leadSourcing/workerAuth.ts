// Worker authentication for lead sourcing (2026-11-17): `Authorization: Bearer <LEAD_SOURCING_WORKER_SECRET>`,
// the same pattern as /api/outreach/tick. The secret lives in Secrets Manager for the worker and in
// Vercel env for the app; it must be at least 32 characters or every call is refused.
// Surrounding whitespace is ignored on both sides (2026-11-17): a value pasted into Vercel from the
// Windows PowerShell 5.1 clipboard carries a trailing line break, which made every claim a 401.
import { timingSafeEqual } from "node:crypto";

export function workerAuthorized(request: Request, rawSecret = process.env.LEAD_SOURCING_WORKER_SECRET): boolean {
  const secret = rawSecret?.trim();
  if (!secret || secret.length < 32) return false;
  const given = Buffer.from((request.headers.get("authorization") ?? "").trim());
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
