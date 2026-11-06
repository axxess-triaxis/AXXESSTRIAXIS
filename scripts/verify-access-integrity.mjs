#!/usr/bin/env node
// Proves the database half of the access and audit integrity fixes against a real Supabase, using real
// user tokens so real RLS and triggers decide each result. Findings L1, L2, M10, L16, L17, M20:
// docs/readiness/STACK_PERSONA_ORCHESTRATION_AUDIT_2026_11_05.md
//
// LOCAL ONLY. It creates and deletes organizations and users, so it refuses any host but localhost.
//   pnpm exec supabase start
//   pnpm run supabase:db:reset
//   export NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY
//   node scripts/verify-access-integrity.mjs
// Exit code 0 and "status": "passed" only if every check passes. Prints no keys or tokens.

import { randomUUID } from "node:crypto";

const URL_ = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
if (!/^http:\/\/(127\.0\.0\.1|localhost):/.test(URL_)) throw new Error("Local Supabase only.");
if (!ANON || !SERVICE) throw new Error("Set NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY.");

const run = randomUUID().slice(0, 8);
const password = `Local-${randomUUID()}`;
const checks = [];
const check = (name, pass, detail) => {
  checks.push({ name, pass: Boolean(pass), ...(pass ? {} : { detail }) });
};

async function call(path, { method = "GET", token, key = ANON, body, prefer = "return=representation" } = {}) {
  const response = await fetch(`${URL_}${path}`, {
    method,
    headers: { apikey: key, authorization: `Bearer ${token ?? key}`, "content-type": "application/json", prefer },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* not JSON */ }
  return { status: response.status, ok: response.ok, json, code: json?.code, rows: Array.isArray(json) ? json : [] };
}
const admin = (path, options = {}) => call(path, { ...options, key: SERVICE });
const refused = (r) => r.status === 403 && r.code === "42501";

async function createOrg(label) {
  const r = await admin("/rest/v1/organizations", { method: "POST", body: { name: `Integrity ${label} ${run}`, slug: `integrity-${label}-${run}`, sector: "government" } });
  if (!r.ok) throw new Error(`organization ${r.status} ${JSON.stringify(r.json)}`);
  return r.rows[0].id;
}

async function createUser(label, organizationId, role) {
  const email = `integrity.${label}.${run}@axxess.test`;
  const a = await admin("/auth/v1/admin/users", { method: "POST", body: { email, password, email_confirm: true } });
  if (!a.ok) throw new Error(`auth ${a.status}`);
  const id = a.json.id;
  await admin("/rest/v1/profiles?on_conflict=id", { method: "POST", prefer: "resolution=merge-duplicates", body: { id, email, display_name: label, avatar_initials: "IT" } });
  const m = await admin("/rest/v1/organization_members", { method: "POST", body: { organization_id: organizationId, user_id: id, status: "active" } });
  if (!m.ok) throw new Error(`member ${m.status} ${JSON.stringify(m.json)}`);
  const u = await admin("/rest/v1/users", { method: "POST", body: { id, organization_id: organizationId, email, display_name: label, avatar_initials: "IT", role, status: "active" } });
  if (!u.ok) throw new Error(`user ${u.status} ${JSON.stringify(u.json)}`);
  const t = await call("/auth/v1/token?grant_type=password", { method: "POST", body: { email, password } });
  if (!t.ok) throw new Error(`sign-in ${t.status}`);
  return { id, email, token: t.json.access_token, organizationId };
}

const rolesOf = async (user) =>
  (await admin(`/rest/v1/user_roles?user_id=eq.${user.id}&organization_id=eq.${user.organizationId}&select=role:roles(name)`)).rows.map((row) => row.role.name).sort();
const memberStatus = async (user) =>
  (await admin(`/rest/v1/organization_members?user_id=eq.${user.id}&organization_id=eq.${user.organizationId}&select=status`)).rows[0]?.status;
const roleOf = async (user) => (await admin(`/rest/v1/users?id=eq.${user.id}&select=role`)).rows[0]?.role;

const orgs = [];
const users = [];
let exitCode = 1;
try {
  const orgA = await createOrg("a"); orgs.push(orgA);
  const orgB = await createOrg("b"); orgs.push(orgB);
  const superA = await createUser("super", orgA, "Super Admin"); users.push(superA);
  const adminA = await createUser("admin", orgA, "Organization Admin"); users.push(adminA);
  const employee = await createUser("employee", orgA, "Employee"); users.push(employee);
  const manager = await createUser("manager", orgA, "Manager"); users.push(manager);
  const guest = await createUser("guest", orgA, "Guest"); users.push(guest);
  const consultant = await createUser("consultant", orgA, "Consultant"); users.push(consultant);
  const adminB = await createUser("adminb", orgB, "Organization Admin"); users.push(adminB);

  // Sync on insert
  check("new user gets exactly one matching user_roles row", JSON.stringify(await rolesOf(employee)) === '["Employee"]', await rolesOf(employee));

  // Regression: audit triggers run as definer now, so ordinary writes must still work and be logged
  const project = await call("/rest/v1/projects", { method: "POST", token: manager.token, body: { organization_id: orgA, name: `Integrity ${run}`, owner_id: manager.id, status: "planning", priority: "medium", risk_level: "medium" } });
  check("Manager can still create a project", project.ok, project.json);
  const task = await call("/rest/v1/tasks", { method: "POST", token: employee.token, body: { organization_id: orgA, title: `Integrity ${run}`, status: "pending", priority: "medium", assignee_id: employee.id } });
  check("Employee can still create a task", task.ok, task.json);
  const taskId = task.rows[0]?.id;
  const taskAudit = (await admin(`/rest/v1/audit_logs?action=eq.task.created&resource_id=eq.${taskId}&select=actor_user_id,actor_role`)).rows[0];
  check("task trigger still logs the real actor", taskAudit?.actor_user_id === employee.id && taskAudit?.actor_role === "Employee", taskAudit);
  const consultantRead = await call("/rest/v1/tasks?select=id&limit=1", { token: consultant.token });
  check("Consultant can still read through RLS", consultantRead.ok && consultantRead.rows.length > 0, consultantRead.status);

  // L1: suspend
  const sus = await call(`/rest/v1/users?id=eq.${employee.id}`, { method: "PATCH", token: adminA.token, body: { status: "suspended" } });
  check("admin can suspend an employee", sus.ok && sus.rows.length === 1, sus.json);
  check("L1 suspend sets organization_members to suspended", (await memberStatus(employee)) === "suspended");
  check("L1 suspend removes user_roles", (await rolesOf(employee)).length === 0);
  const susRead = await call("/rest/v1/tasks?select=id", { token: employee.token });
  check("L1 suspended user reads 0 tasks through REST", susRead.rows.length === 0, susRead.rows.length);
  const susWrite = await call("/rest/v1/tasks", { method: "POST", token: employee.token, body: { organization_id: orgA, title: "suspended", status: "pending", priority: "low" } });
  check("L1 suspended user cannot write a task through REST", refused(susWrite), susWrite.status);
  const susRpc = await call("/rest/v1/rpc/record_audit_event", { method: "POST", token: employee.token, body: { p_organization_id: orgA, p_action: "x.y", p_resource_type: "x" } });
  check("L1 suspended user cannot write an audit row", refused(susRpc), susRpc.status);
  const own = await call(`/rest/v1/users?id=eq.${employee.id}&select=status`, { token: employee.token });
  check("suspended user can still read their own status, so the app can refuse them", own.rows[0]?.status === "suspended", own.json);
  await call(`/rest/v1/users?id=eq.${employee.id}`, { method: "PATCH", token: adminA.token, body: { status: "active" } });
  check("reactivate restores organization_members", (await memberStatus(employee)) === "active");
  check("reactivate restores user_roles", JSON.stringify(await rolesOf(employee)) === '["Employee"]', await rolesOf(employee));
  const backRead = await call("/rest/v1/tasks?select=id", { token: employee.token });
  check("reactivated user can read again", backRead.rows.length > 0, backRead.rows.length);

  // L2, M10: demote
  await call(`/rest/v1/users?id=eq.${manager.id}`, { method: "PATCH", token: adminA.token, body: { role: "Guest" } });
  check("L2 demotion replaces user_roles", JSON.stringify(await rolesOf(manager)) === '["Guest"]', await rolesOf(manager));
  const demotedUsers = await call("/rest/v1/users?select=id", { token: manager.token });
  check("L2 demoted head can no longer list users through REST", demotedUsers.rows.length === 1, demotedUsers.rows.length);
  const demotedProject = await call("/rest/v1/projects", { method: "POST", token: manager.token, body: { organization_id: orgA, name: "demoted", owner_id: manager.id, status: "planning", priority: "medium", risk_level: "medium" } });
  check("L2 demoted head cannot write a project through REST", refused(demotedProject), demotedProject.status);
  await call(`/rest/v1/users?id=eq.${manager.id}`, { method: "PATCH", token: adminA.token, body: { role: "Manager" } });
  check("M10 promotion reaches user_roles", JSON.stringify(await rolesOf(manager)) === '["Manager"]', await rolesOf(manager));

  // L16: Super Admin
  const superRole = (await admin(`/rest/v1/roles?organization_id=eq.${orgA}&name=eq.Super%20Admin&select=id`)).rows[0];
  const adminRole = (await admin(`/rest/v1/roles?organization_id=eq.${orgA}&name=eq.Organization%20Admin&select=id`)).rows[0];
  const selfUp = await call(`/rest/v1/users?id=eq.${adminA.id}`, { method: "PATCH", token: adminA.token, body: { role: "Super Admin" } });
  check("L16 Organization Admin cannot promote self", refused(selfUp) && (await roleOf(adminA)) === "Organization Admin", selfUp.status);
  const otherUp = await call(`/rest/v1/users?id=eq.${employee.id}`, { method: "PATCH", token: adminA.token, body: { role: "Super Admin" } });
  check("L16 Organization Admin cannot promote another user", refused(otherUp) && (await roleOf(employee)) === "Employee", otherUp.status);
  const urIns = await call("/rest/v1/user_roles", { method: "POST", token: adminA.token, body: { organization_id: orgA, user_id: adminA.id, role_id: superRole.id } });
  check("L16 Organization Admin cannot insert a Super Admin user_roles row", refused(urIns), urIns.status);
  const urDel = await call(`/rest/v1/user_roles?user_id=eq.${superA.id}&role_id=eq.${superRole.id}`, { method: "DELETE", token: adminA.token });
  check("L16 Organization Admin cannot remove a Super Admin's row", refused(urDel) && (await rolesOf(superA)).includes("Super Admin"), urDel.status);
  const invite = await call("/rest/v1/invitations", { method: "POST", token: adminA.token, body: { organization_id: orgA, email: `integrity.inv.${run}@example.invalid`, role: "Super Admin", invited_by_user_id: adminA.id, token_hash: `hash-${run}`, expires_at: new Date(Date.now() + 86_400_000).toISOString() } });
  check("L16 Organization Admin cannot invite a Super Admin", refused(invite), invite.status);
  const rename = await call(`/rest/v1/roles?id=eq.${adminRole.id}`, { method: "PATCH", token: adminA.token, body: { name: "Super Admin" } });
  check("L16 Organization Admin cannot rename a role to Super Admin", !rename.ok, rename.status);
  const unrename = await call(`/rest/v1/roles?id=eq.${superRole.id}`, { method: "PATCH", token: adminA.token, body: { name: "Guest" } });
  check("L16 Organization Admin cannot rename the Super Admin role", !unrename.ok, unrename.status);
  const demoteSuper = await call(`/rest/v1/users?id=eq.${superA.id}`, { method: "PATCH", token: adminA.token, body: { role: "Guest" } });
  check("L16 Organization Admin cannot demote a Super Admin", refused(demoteSuper) && (await roleOf(superA)) === "Super Admin", demoteSuper.status);
  const suspendSuper = await call(`/rest/v1/users?id=eq.${superA.id}`, { method: "PATCH", token: adminA.token, body: { status: "suspended" } });
  check("L16 Organization Admin cannot suspend a Super Admin", refused(suspendSuper), suspendSuper.status);
  const superGrant = await call(`/rest/v1/users?id=eq.${adminA.id}`, { method: "PATCH", token: superA.token, body: { role: "Super Admin" } });
  check("a Super Admin can grant Super Admin", superGrant.ok && superGrant.rows.length === 1 && (await rolesOf(adminA)).includes("Super Admin"), superGrant.json);
  const superRevoke = await call(`/rest/v1/users?id=eq.${adminA.id}`, { method: "PATCH", token: superA.token, body: { role: "Organization Admin" } });
  check("a Super Admin can remove Super Admin", superRevoke.ok && JSON.stringify(await rolesOf(adminA)) === '["Organization Admin"]', superRevoke.json);
  const serviceGrant = await admin(`/rest/v1/users?id=eq.${guest.id}`, { method: "PATCH", body: { role: "Super Admin" } });
  check("service role, used by provisioning, is not blocked", serviceGrant.ok, serviceGrant.json);
  await admin(`/rest/v1/users?id=eq.${guest.id}`, { method: "PATCH", body: { role: "Guest" } });
  const guestToAdmin = await call(`/rest/v1/users?id=eq.${guest.id}`, { method: "PATCH", token: guest.token, body: { role: "Organization Admin" } });
  check("Guest cannot promote self", guestToAdmin.rows.length === 0 && (await roleOf(guest)) === "Guest", guestToAdmin.status);
  const globalRole = await call("/rest/v1/roles", { method: "POST", token: guest.token, body: { organization_id: null, name: "Guest", description: "synthetic" } });
  check("a member cannot write a role with no organization", !globalRole.ok, globalRole.status);

  // L17, M20: audit
  const direct = await call("/rest/v1/audit_logs", { method: "POST", token: guest.token, prefer: "return=minimal", body: { organization_id: orgA, actor_user_id: adminA.id, actor_role: "Organization Admin", action: "integrity.forged", resource_type: "users" } });
  check("L17 member cannot insert a spoofed audit row", refused(direct), direct.status);
  const directAdmin = await call("/rest/v1/audit_logs", { method: "POST", token: adminA.token, prefer: "return=minimal", body: { organization_id: orgA, actor_user_id: superA.id, action: "integrity.forged", resource_type: "users" } });
  check("L17 admin cannot insert a spoofed audit row", refused(directAdmin), directAdmin.status);
  check("L17 no forged row was stored", (await admin("/rest/v1/audit_logs?action=eq.integrity.forged&select=id")).rows.length === 0);
  const rpc = await call("/rest/v1/rpc/record_audit_event", { method: "POST", token: guest.token, body: { p_organization_id: orgA, p_action: "integrity.member", p_resource_type: "test", p_metadata: { actor_user_id: adminA.id } } });
  check("M20 non-admin audit write succeeds", rpc.ok && rpc.rows.length === 1, rpc.json);
  const stored = (await admin("/rest/v1/audit_logs?action=eq.integrity.member&select=actor_user_id,actor_role,organization_id")).rows[0];
  check("M20 stored row names the real actor and role", stored?.actor_user_id === guest.id && stored?.actor_role === "Guest" && stored?.organization_id === orgA, stored);
  const reserved = await call("/rest/v1/rpc/record_audit_event", { method: "POST", token: guest.token, body: { p_organization_id: orgA, p_action: "user.access_updated", p_resource_type: "users" } });
  check("L17 member cannot write a reserved admin action", refused(reserved), reserved.status);
  const reservedAdmin = await call("/rest/v1/rpc/record_audit_event", { method: "POST", token: adminA.token, body: { p_organization_id: orgA, p_action: "user.access_updated", p_resource_type: "users" } });
  check("admin can write a reserved action", reservedAdmin.ok, reservedAdmin.json);
  const cross = await call("/rest/v1/rpc/record_audit_event", { method: "POST", token: adminB.token, body: { p_organization_id: orgA, p_action: "integrity.cross", p_resource_type: "test" } });
  check("another tenant's admin cannot write into this tenant", refused(cross), cross.status);
  const anon = await call("/rest/v1/rpc/record_audit_event", { method: "POST", body: { p_organization_id: orgA, p_action: "integrity.anon", p_resource_type: "test" } });
  check("signed-out caller cannot write an audit row", !anon.ok, anon.status);
  const aid = (await admin(`/rest/v1/audit_logs?organization_id=eq.${orgA}&select=id&limit=1`)).rows[0]?.id;
  const tamper = await call(`/rest/v1/audit_logs?id=eq.${aid}`, { method: "PATCH", token: adminA.token, body: { action: "integrity.tampered" } });
  const erase = await call(`/rest/v1/audit_logs?id=eq.${aid}`, { method: "DELETE", token: adminA.token });
  check("admin cannot change or delete an audit row", tamper.rows.length === 0 && erase.rows.length === 0);

  // Cross-tenant
  const crossRole = await call(`/rest/v1/users?id=eq.${employee.id}`, { method: "PATCH", token: adminB.token, body: { role: "Guest" } });
  check("another tenant's admin cannot change a user", crossRole.rows.length === 0 && (await roleOf(employee)) === "Employee", crossRole.status);

  exitCode = checks.every((c) => c.pass) ? 0 : 1;
} catch (error) {
  checks.push({ name: "script completed", pass: false, detail: String(error?.message ?? error) });
} finally {
  for (const id of orgs) await admin(`/rest/v1/organizations?id=eq.${id}`, { method: "DELETE" }).catch(() => undefined);
  for (const user of users) {
    await admin(`/auth/v1/admin/users/${user.id}`, { method: "DELETE" }).catch(() => undefined);
    await admin(`/rest/v1/profiles?id=eq.${user.id}`, { method: "DELETE" }).catch(() => undefined);
  }
}

const failed = checks.filter((c) => !c.pass);
console.log(JSON.stringify({ status: exitCode === 0 ? "passed" : "failed", total: checks.length, passed: checks.length - failed.length, failed }, null, 2));
process.exit(exitCode);
