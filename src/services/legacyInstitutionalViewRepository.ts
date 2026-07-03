import {
  aiMessages,
  approvals,
  documents,
  integrations,
  meetings,
  okrData,
  performanceData,
  projects,
  stakeholders,
  tasks,
  workloadData,
} from "../mocks/institutionalData";
import type { InstitutionalRepository } from "../repositories/interfaces";

// Legacy view adapter for modules that are outside the Sprint 6 Supabase
// repository scope. Enterprise resources use Supabase-backed repositories.
export const legacyInstitutionalViewRepository: InstitutionalRepository = {
  getAiMessages: () => aiMessages,
  getApprovals: () => approvals,
  getDocuments: () => documents,
  getIntegrations: () => integrations,
  getMeetings: () => meetings,
  getOkrData: () => okrData,
  getPerformanceData: () => performanceData,
  getProjects: () => projects,
  getStakeholders: () => stakeholders,
  getTasks: () => tasks,
  getWorkloadData: () => workloadData,
};
