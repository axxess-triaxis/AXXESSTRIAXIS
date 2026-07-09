import type { EnterpriseRole } from "../../security/enterpriseIam";

export type PromptStatus = "draft" | "approved" | "retired";
export type AiImpactLevel = "low" | "medium" | "high";

export type PromptVersion = {
  version: number;
  body: string;
  ownerUserId: string;
  approvedByUserId?: string;
  approvedAt?: string;
  status: PromptStatus;
  changeSummary: string;
  createdAt: string;
};

export type PromptDefinition = {
  id: string;
  organizationId: string;
  name: string;
  purpose: string;
  impactLevel: AiImpactLevel;
  versions: PromptVersion[];
};

export type AiOutputAuditRecord = {
  id: string;
  organizationId: string;
  userId: string;
  userRole: EnterpriseRole;
  promptId: string;
  promptVersion: number;
  model: string;
  generatedAt: string;
  confidenceScore: number;
  sourceDocumentIds: string[];
  humanReviewRequired: boolean;
  humanReviewerUserId?: string;
  approvedAt?: string;
  operatorNotes?: string;
};

export function createPromptVersion(params: {
  currentVersions: PromptVersion[];
  body: string;
  ownerUserId: string;
  changeSummary: string;
  createdAt: string;
}): PromptVersion {
  return {
    version: Math.max(0, ...params.currentVersions.map((version) => version.version)) + 1,
    body: params.body,
    ownerUserId: params.ownerUserId,
    changeSummary: params.changeSummary,
    createdAt: params.createdAt,
    status: "draft",
  };
}

export function approvePromptVersion(version: PromptVersion, approverUserId: string, approvedAt: string): PromptVersion {
  return {
    ...version,
    status: "approved",
    approvedByUserId: approverUserId,
    approvedAt,
  };
}

export function selectApprovedPromptVersion(prompt: PromptDefinition): PromptVersion | undefined {
  return [...prompt.versions]
    .filter((version) => version.status === "approved")
    .sort((left, right) => right.version - left.version)[0];
}

export function buildAiOutputAuditRecord(params: {
  id: string;
  organizationId: string;
  userId: string;
  userRole: EnterpriseRole;
  prompt: PromptDefinition;
  model: string;
  generatedAt: string;
  confidenceScore: number;
  sourceDocumentIds: string[];
}): AiOutputAuditRecord {
  const approvedPrompt = selectApprovedPromptVersion(params.prompt);

  if (!approvedPrompt) {
    throw new Error(`No approved prompt version is available for ${params.prompt.name}.`);
  }

  return {
    id: params.id,
    organizationId: params.organizationId,
    userId: params.userId,
    userRole: params.userRole,
    promptId: params.prompt.id,
    promptVersion: approvedPrompt.version,
    model: params.model,
    generatedAt: params.generatedAt,
    confidenceScore: params.confidenceScore,
    sourceDocumentIds: [...new Set(params.sourceDocumentIds)],
    humanReviewRequired: params.prompt.impactLevel === "high" || params.confidenceScore < 0.72,
  };
}
