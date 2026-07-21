import { extractKeywords, summarizeText } from "../nlp/localNlp";

export type ConnectorProviderId = "gmail" | "microsoft" | "slack" | "calendly";
export type ConnectorStatus = "provider_gated" | "configured" | "connected" | "paused" | "error" | "revoked";

export type ConnectorContract = {
  providerId: ConnectorProviderId;
  displayName: string;
  category: "email" | "messaging" | "calendar";
  authType: "oauth2";
  authorizationUrl: string;
  tokenUrl: string;
  requiredScopes: string[];
  webhookSupported: boolean;
  tenantOwned: true;
  auditEvents: string[];
};

export type SelectedEmailImport = {
  providerId: ConnectorProviderId;
  messageId?: string;
  sourceLink?: string;
  from: string;
  subject: string;
  receivedAt?: string;
  bodyText: string;
};

export type EmailImportPreview = {
  summary: string;
  tasks: string[];
  decisions: string[];
  stakeholders: string[];
  tags: string[];
};

const connectorContracts: Record<ConnectorProviderId, ConnectorContract> = {
  gmail: {
    providerId: "gmail",
    displayName: "Gmail",
    category: "email",
    authType: "oauth2",
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    requiredScopes: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.metadata",
    ],
    webhookSupported: true,
    tenantOwned: true,
    auditEvents: ["connector.gmail.oauth.started", "connector.gmail.email.previewed", "connector.gmail.email.imported"],
  },
  microsoft: {
    providerId: "microsoft",
    displayName: "Microsoft Outlook",
    category: "email",
    authType: "oauth2",
    authorizationUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    requiredScopes: ["offline_access", "User.Read", "Mail.Read"],
    webhookSupported: true,
    tenantOwned: true,
    auditEvents: ["connector.microsoft.oauth.started", "connector.microsoft.email.previewed", "connector.microsoft.email.imported"],
  },
  slack: {
    providerId: "slack",
    displayName: "Slack",
    category: "messaging",
    authType: "oauth2",
    authorizationUrl: "https://slack.com/oauth/v2/authorize",
    tokenUrl: "https://slack.com/api/oauth.v2.access",
    requiredScopes: ["chat:write", "channels:read"],
    webhookSupported: true,
    tenantOwned: true,
    auditEvents: ["connector.slack.oauth.started", "connector.slack.oauth.connected", "connector.slack.notification.sent"],
  },
  calendly: {
    providerId: "calendly",
    displayName: "Calendly",
    category: "calendar",
    authType: "oauth2",
    authorizationUrl: "https://auth.calendly.com/oauth/authorize",
    tokenUrl: "https://auth.calendly.com/oauth/token",
    // Calendly's OAuth grants access to the connected user's whole scheduling account rather
    // than discrete scopes -- there is no scope parameter to request. Kept as an empty array
    // (not omitted) so every consumer of requiredScopes (audit logging, the Settings UI) stays
    // correct without a special case.
    requiredScopes: [],
    webhookSupported: true,
    tenantOwned: true,
    auditEvents: ["connector.calendly.oauth.started", "connector.calendly.oauth.connected", "connector.calendly.event.created"],
  },
};

function sentenceCandidates(text: string, match: RegExp) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 12 && match.test(sentence))
    .slice(0, 5);
}

function stakeholderCandidates(input: SelectedEmailImport) {
  const fromName = input.from.split("<")[0]?.trim().replace(/^"|"$/g, "");
  const capitalized = input.bodyText.match(/\b(?:Dr|Sri|Smt|Prof|Mr|Ms)\.?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}/g) ?? [];
  return [...new Set([fromName, ...capitalized].filter((item): item is string => Boolean(item && item.length > 2)))].slice(0, 6);
}

export function getConnectorContract(providerId: string): ConnectorContract | undefined {
  return connectorContracts[providerId as ConnectorProviderId];
}

const oauthClientIdEnvVar: Record<ConnectorProviderId, string> = {
  gmail: "GOOGLE_CLIENT_ID",
  microsoft: "MICROSOFT_CLIENT_ID",
  slack: "SLACK_CLIENT_ID",
  calendly: "CALENDLY_CLIENT_ID",
};

export function buildConnectorOAuthUrl(
  providerId: ConnectorProviderId,
  state: string,
  env: NodeJS.ProcessEnv = process.env,
) {
  const contract = connectorContracts[providerId];
  const clientId = env[oauthClientIdEnvVar[providerId]];
  const appUrl = env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (!clientId || !appUrl) return undefined;

  const url = new URL(contract.authorizationUrl);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", `${appUrl}/api/connectors/oauth/callback?provider=${providerId}`);
  url.searchParams.set("response_type", "code");
  if (contract.requiredScopes.length > 0) {
    url.searchParams.set("scope", contract.requiredScopes.join(" "));
  }
  url.searchParams.set("state", state);
  // Offline access + forced consent are Google-specific OAuth extensions; sending them to
  // Microsoft/Slack/Calendly's authorization endpoints isn't meaningful and could be rejected.
  if (providerId === "gmail") {
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
  }
  return url.toString();
}

export function previewSelectedEmailImport(input: SelectedEmailImport): EmailImportPreview {
  const normalized = `${input.subject}. ${input.bodyText}`.replace(/\s+/g, " ").trim();
  return {
    summary: summarizeText(normalized, 2),
    tasks: sentenceCandidates(normalized, /\b(please|submit|prepare|send|complete|follow up|review|schedule|share|confirm)\b/i),
    decisions: sentenceCandidates(normalized, /\b(approved|decided|confirmed|rejected|deferred|agreed|resolved)\b/i),
    stakeholders: stakeholderCandidates(input),
    tags: extractKeywords(normalized, 6),
  };
}
