import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    ok: false,
    error: "Password reset finalization must be completed from a verified Supabase recovery session. The route is reserved for the beta reset screen.",
  }, { status: 501 });
}
