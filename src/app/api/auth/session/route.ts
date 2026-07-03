import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../auth/serverSession";

export async function GET() {
  const session = await getServerAuthSession(true);

  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({ user: session.user });
}
