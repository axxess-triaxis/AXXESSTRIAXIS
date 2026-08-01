import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../auth/serverSession";
import {
  auditLogsRepository,
  documentsRepository,
  meetingsRepository,
  projectsRepository,
  tasksRepository,
  tenantScopeFromUser,
} from "../../../../repositories/supabaseEnterpriseRepositories";

// Matches src/app/api/onboarding/seed-sample-data/route.ts's own contract: every record it creates
// is tagged "sample-data" (projects, tasks, documents) or, for Meeting -- which has no tags column
// -- titled with a "Sample:" prefix. This route is the other half of that promise: a real, tenant-
// scoped way to find and remove exactly those records, not a general-purpose delete capability.
const SAMPLE_TAG = "sample-data";
const SAMPLE_TITLE_PREFIX = "Sample:";
const adminRoles = ["Super Admin", "Organization Admin", "Executive", "Manager"];

function isSampleTagged(tags?: string[] | null) {
  return Boolean(tags?.includes(SAMPLE_TAG));
}

function isSampleTitled(title: string) {
  return title.startsWith(SAMPLE_TITLE_PREFIX);
}

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return undefined;
  return { url, anonKey };
}

async function deleteRow(config: { url: string; anonKey: string }, table: string, id: string, accessToken: string) {
  const response = await fetch(`${config.url}/rest/v1/${table}?id=eq.${id}`, {
    method: "DELETE",
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${accessToken}`,
      Prefer: "return=minimal",
    },
    cache: "no-store",
  });
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`${table} ${id}: ${response.status} ${message}`);
  }
}

async function findSampleRecords(scope: ReturnType<typeof tenantScopeFromUser>) {
  const [projects, tasks, meetings, documents] = await Promise.all([
    projectsRepository.list(scope, { pageSize: 500 }),
    tasksRepository.list(scope, { pageSize: 1000 }),
    meetingsRepository.list(scope, { pageSize: 500 }),
    documentsRepository.list(scope, { pageSize: 500 }),
  ]);

  return {
    projects: projects.filter((project) => isSampleTagged(project.tags) || isSampleTitled(project.name)),
    tasks: tasks.filter((task) => isSampleTagged(task.tags) || isSampleTitled(task.title)),
    meetings: meetings.filter((meeting) => isSampleTitled(meeting.title)),
    documents: documents.filter((document) => isSampleTagged(document.tags) || isSampleTitled(document.name)),
  };
}

// GET: a real preview (not an estimate) of what a DELETE would remove, so the UI can show
// "N sample records found" and let the admin decide, rather than acting blind.
export async function GET() {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const scope = tenantScopeFromUser(session.user, session.accessToken);
  const sample = await findSampleRecords(scope);

  return NextResponse.json({
    projects: sample.projects.length,
    tasks: sample.tasks.length,
    meetings: sample.meetings.length,
    documents: sample.documents.length,
    total: sample.projects.length + sample.tasks.length + sample.meetings.length + sample.documents.length,
  });
}

export async function DELETE() {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!adminRoles.includes(session.user.role)) {
    return NextResponse.json({ error: "Only organization admins and above can remove sample data." }, { status: 403 });
  }

  const config = getSupabaseConfig();
  if (!config) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });

  const scope = tenantScopeFromUser(session.user, session.accessToken);
  const sample = await findSampleRecords(scope);

  // Tasks before projects: tasks reference project_id and this avoids depending on the FK's
  // on-delete behavior either way. Documents use the existing archive() (not a hard delete) since
  // documents have real child rows (versions, rag chunks, ingestion runs) that archive() already
  // handles safely and rag retrieval already excludes archived documents.
  const removed = { projects: 0, tasks: 0, meetings: 0, documentsArchived: 0 };
  const failures: string[] = [];

  for (const task of sample.tasks) {
    try {
      await deleteRow(config, "tasks", task.id, session.accessToken);
      removed.tasks += 1;
    } catch (error) {
      failures.push(error instanceof Error ? error.message : `task ${task.id} failed`);
    }
  }
  for (const project of sample.projects) {
    try {
      await deleteRow(config, "projects", project.id, session.accessToken);
      removed.projects += 1;
    } catch (error) {
      failures.push(error instanceof Error ? error.message : `project ${project.id} failed`);
    }
  }
  for (const meeting of sample.meetings) {
    try {
      await deleteRow(config, "meetings", meeting.id, session.accessToken);
      removed.meetings += 1;
    } catch (error) {
      failures.push(error instanceof Error ? error.message : `meeting ${meeting.id} failed`);
    }
  }
  for (const document of sample.documents) {
    try {
      await documentsRepository.archive(scope, document.id);
      removed.documentsArchived += 1;
    } catch (error) {
      failures.push(error instanceof Error ? error.message : `document ${document.id} failed`);
    }
  }

  await auditLogsRepository.record(scope, {
    action: "onboarding.sample_data_removed",
    resourceType: "organization",
    resourceId: scope.organizationId,
    category: "onboarding",
    metadata: { removed, failures, found: {
      projects: sample.projects.length,
      tasks: sample.tasks.length,
      meetings: sample.meetings.length,
      documents: sample.documents.length,
    } },
  }).catch(() => undefined);

  return NextResponse.json({ removed, failures });
}
