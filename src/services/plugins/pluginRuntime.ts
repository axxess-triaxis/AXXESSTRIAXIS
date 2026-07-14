import type { RoleName } from "../../domain";
import { getProductivityPluginRegistry, type ProductivityPlugin } from "../integrations/pluginRegistry";

export type PluginRuntimeProviderId = ProductivityPlugin["id"];
export type PluginInstallationStatus = "available" | "provider_gated" | "connected" | "syncing" | "error" | "revoked";
export type PluginActionKind = "connect" | "sync" | "import" | "export" | "create_record" | "send_message" | "revoke";

export type PluginRuntimePolicy = {
  pluginId: PluginRuntimeProviderId;
  tenantOwned: true;
  allowedScopes: string[];
  actionPermissions: Partial<Record<PluginActionKind, RoleName[]>>;
  syncMode: "manual" | "scheduled" | "webhook" | "disabled";
  webhookMode: "supported" | "not_supported" | "provider_gated";
  secretScope: "tenant" | "workspace" | "user";
  approvalRequiredForWrites: boolean;
  networkAccess: "provider-api-only" | "webhook-ingress-only" | "blocked";
  dataResidency: "tenant-region" | "provider-region" | "not-applicable";
  retryPolicy: {
    maxAttempts: number;
    backoffSeconds: number;
  };
};

export type PluginInstallation = {
  id: string;
  organizationId: string;
  pluginId: PluginRuntimeProviderId;
  status: PluginInstallationStatus;
  connectedByUserId?: string;
  connectedAt?: string;
  lastSyncAt?: string;
  lastError?: string;
  grantedScopes: string[];
};

export type PluginRuntimeContract = {
  plugin: ProductivityPlugin;
  policy: PluginRuntimePolicy;
  installation: PluginInstallation;
  readyForActions: boolean;
  providerConfigured: boolean;
  missingScopes: string[];
};

export type PluginRuntimeSnapshot = {
  organizationId: string;
  contracts: PluginRuntimeContract[];
  totals: {
    total: number;
    configured: number;
    connected: number;
    webhookReady: number;
    approvalGatedWrites: number;
  };
  nextActions: string[];
};

export type PluginRuntimeActionRequest = {
  organizationId: string;
  userId: string;
  userRole: RoleName;
  pluginId: PluginRuntimeProviderId;
  action: PluginActionKind;
  scopeRequest?: string[];
  payloadSummary?: string;
};

const adminRoles: RoleName[] = ["Super Admin", "Organization Admin"];
const managerRoles: RoleName[] = ["Super Admin", "Organization Admin", "Executive", "Manager"];

function canRoleAct(userRole: RoleName, allowed: RoleName[]) {
  return allowed.includes(userRole);
}

function defaultStatus(plugin: ProductivityPlugin): PluginInstallationStatus {
  if (!plugin.configured) return plugin.demoConnector ? "available" : "provider_gated";
  return "available";
}

function actionPermissions(plugin: ProductivityPlugin): PluginRuntimePolicy["actionPermissions"] {
  const writeRoles = plugin.requiredRoles.includes("Executive") ? managerRoles : adminRoles;
  return {
    connect: adminRoles,
    sync: writeRoles,
    import: writeRoles,
    export: adminRoles,
    create_record: writeRoles,
    send_message: writeRoles,
    revoke: adminRoles,
  };
}

export function buildPluginRuntimePolicy(plugin: ProductivityPlugin): PluginRuntimePolicy {
  return {
    pluginId: plugin.id,
    tenantOwned: true,
    allowedScopes: plugin.requiredScopes,
    actionPermissions: actionPermissions(plugin),
    syncMode: plugin.webhookSupport ? "webhook" : plugin.configured ? "manual" : "disabled",
    webhookMode: plugin.webhookSupport ? (plugin.configured ? "supported" : "provider_gated") : "not_supported",
    secretScope: plugin.category === "email" || plugin.category === "calendar" ? "user" : "tenant",
    approvalRequiredForWrites: ["email", "messaging", "crm", "finance", "document"].includes(plugin.category),
    networkAccess: plugin.configured ? "provider-api-only" : "blocked",
    dataResidency: plugin.configured ? "provider-region" : "tenant-region",
    retryPolicy: {
      maxAttempts: plugin.webhookSupport ? 5 : 3,
      backoffSeconds: 45,
    },
  };
}

function installationForPlugin(
  organizationId: string,
  plugin: ProductivityPlugin,
  installations: PluginInstallation[],
): PluginInstallation {
  const existing = installations.find((installation) => installation.pluginId === plugin.id && installation.organizationId === organizationId);
  if (existing) return existing;
  return {
    id: `${organizationId}:${plugin.id}`,
    organizationId,
    pluginId: plugin.id,
    status: defaultStatus(plugin),
    grantedScopes: [],
  };
}

export function buildPluginRuntimeSnapshot(input: {
  organizationId: string;
  env?: NodeJS.ProcessEnv;
  installations?: PluginInstallation[];
}): PluginRuntimeSnapshot {
  const plugins = getProductivityPluginRegistry(input.env);
  const contracts = plugins.map((plugin): PluginRuntimeContract => {
    const policy = buildPluginRuntimePolicy(plugin);
    const installation = installationForPlugin(input.organizationId, plugin, input.installations ?? []);
    const missingScopes = policy.allowedScopes.filter((scope) => !installation.grantedScopes.includes(scope));
    const readyForActions = plugin.configured && ["connected", "syncing"].includes(installation.status) && missingScopes.length === 0;
    return {
      plugin,
      policy,
      installation,
      readyForActions,
      providerConfigured: plugin.configured,
      missingScopes,
    };
  });

  const totals = {
    total: contracts.length,
    configured: contracts.filter((contract) => contract.providerConfigured).length,
    connected: contracts.filter((contract) => contract.installation.status === "connected").length,
    webhookReady: contracts.filter((contract) => contract.policy.webhookMode === "supported").length,
    approvalGatedWrites: contracts.filter((contract) => contract.policy.approvalRequiredForWrites).length,
  };

  return {
    organizationId: input.organizationId,
    contracts,
    totals,
    nextActions: [
      totals.configured === 0 ? "Configure the first provider credentials in the deployment secret store." : "Review connected plugins for least-privilege scopes.",
      "Keep destructive or outward-facing plugin actions behind human approval.",
      "Use webhook sync only after replay, retry, and revocation events are audited.",
    ],
  };
}

export function evaluatePluginAction(
  snapshot: PluginRuntimeSnapshot,
  request: PluginRuntimeActionRequest,
) {
  const contract = snapshot.contracts.find((candidate) => candidate.plugin.id === request.pluginId);
  if (!contract) return { allowed: false, reason: "Plugin is not registered." };
  if (contract.installation.organizationId !== request.organizationId) {
    return { allowed: false, reason: "Plugin installation belongs to another organization." };
  }

  const permittedRoles = contract.policy.actionPermissions[request.action] ?? [];
  if (!canRoleAct(request.userRole, permittedRoles)) {
    return { allowed: false, reason: `${request.userRole} cannot perform ${request.action} for ${contract.plugin.name}.` };
  }

  if (!contract.providerConfigured && request.action !== "connect") {
    return { allowed: false, reason: `${contract.plugin.name} provider credentials are not configured.` };
  }

  if (["sync", "import", "export", "create_record", "send_message"].includes(request.action) && !contract.readyForActions) {
    return { allowed: false, reason: `${contract.plugin.name} is not connected with all required scopes.` };
  }

  if (contract.policy.approvalRequiredForWrites && ["create_record", "send_message", "export"].includes(request.action)) {
    return { allowed: true, reason: `${contract.plugin.name} action is allowed but requires human approval before execution.`, approvalRequired: true };
  }

  return { allowed: true, reason: `${contract.plugin.name} action is allowed.`, approvalRequired: false };
}

export function createPluginActionAuditEvent(request: PluginRuntimeActionRequest, decision: ReturnType<typeof evaluatePluginAction>) {
  return {
    action: `plugin.${request.pluginId}.${request.action}`,
    resourceType: "plugin_action_request",
    category: "integrations",
    metadata: {
      pluginId: request.pluginId,
      action: request.action,
      allowed: decision.allowed,
      approvalRequired: Boolean("approvalRequired" in decision && decision.approvalRequired),
      reason: decision.reason,
      scopeRequest: request.scopeRequest ?? [],
      payloadSummary: request.payloadSummary,
    },
  };
}
