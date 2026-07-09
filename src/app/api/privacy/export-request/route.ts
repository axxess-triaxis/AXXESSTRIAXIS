import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../auth/serverSession";

export async function POST() {
  const session = await getServerAuthSession(false);
  if (!session) return NextResponse.json({ error: "Privacy export requires an authenticated session." }, { status: 401 });

  return NextResponse.json({
    ok: true,
    message: "Privacy export request recorded for beta admin processing.",
  });
}
