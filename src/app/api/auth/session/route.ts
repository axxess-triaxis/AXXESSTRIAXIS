import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../auth/serverSession";

export async function GET() {
  // A-86 (2026-08-03): this is the one call that already gates dashboard mount (AuthProvider awaits
  // it before rendering any protected content) -- proactively renewing here means the access token
  // has a long remaining lifetime before the dashboard's own burst of ~20 parallel data-fetch calls
  // fires, so none of them race on Supabase's single-use refresh token. See serverSession.ts.
  const session = await getServerAuthSession(true, { refreshIfExpiringWithinSeconds: 300 });

  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({ user: session.user });
}
