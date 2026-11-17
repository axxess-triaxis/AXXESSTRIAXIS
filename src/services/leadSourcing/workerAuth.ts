// Worker authentication for lead sourcing (2026-11-17): `Authorization: Bearer <LEAD_SOURCING_WORKER_SECRET>`,
// the same pattern as /api/outreach/tick. The secret lives in Secrets Manager for the worker and in
// Vercel env for the app; it must be at least 32 characters or every call is refused.
import { timingSafeEqual } from "node:crypto";

export function workerAuthorized(request: Request, secret = process.env.LEAD_SOURCING_WORKER_SECRET): boolean {
  if (!secret || secret.length < 32) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
