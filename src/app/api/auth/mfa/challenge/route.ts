import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    ok: false,
    blocker: "Supabase MFA challenge requires an enrolled factor and project-side MFA configuration.",
  }, { status: 501 });
}
