import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../auth/serverSession";
import { notificationsRepository, tenantScopeFromUser } from "../../../../repositories/supabaseEnterpriseRepositories";

export async function POST() {
  const session = await getServerAuthSession(true);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const scope = tenantScopeFromUser(session.user, session.accessToken);
  const unread = await notificationsRepository.list(scope, { pageSize: 50 });
  const readAt = new Date().toISOString();

  await Promise.all(
    unread
      .filter((notification) => notification.userId === scope.userId && !notification.readAt)
      .map((notification) => notificationsRepository.update(scope, notification.id, { readAt })),
  );

  return NextResponse.json({ updated: unread.filter((notification) => notification.userId === scope.userId && !notification.readAt).length });
}
