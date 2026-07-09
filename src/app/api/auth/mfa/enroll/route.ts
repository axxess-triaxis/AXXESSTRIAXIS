import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    ok: false,
    blocker: "Supabase MFA enrollment requires project-side MFA factors and a verified session. The beta UI is wired and ready for provider configuration.",
  }, { status: 501 });
}
