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

// Repository boundary for Sprint 1. UI consumes methods, while the backing data
// can later move from in-memory mocks to Supabase queries and RLS-aware services.
export const institutionalMockRepository: InstitutionalRepository = {
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
