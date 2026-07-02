import type {
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

export type AiMessageView = (typeof aiMessages)[number];
export type ApprovalView = (typeof approvals)[number];
export type DocumentView = (typeof documents)[number];
export type IntegrationView = (typeof integrations)[number];
export type MeetingView = (typeof meetings)[number];
export type OkrMetricView = (typeof okrData)[number];
export type PerformanceMetricView = (typeof performanceData)[number];
export type ProjectView = (typeof projects)[number];
export type StakeholderView = (typeof stakeholders)[number];
export type TaskView = (typeof tasks)[number];
export type WorkloadMetricView = (typeof workloadData)[number];

export interface DashboardDataService {
  getPerformanceData(): PerformanceMetricView[];
  getWorkloadData(): WorkloadMetricView[];
}

export interface AiWorkspaceDataService {
  getAiMessages(): AiMessageView[];
}

export interface ProjectsDataService {
  getProjects(): ProjectView[];
}

export interface TasksDataService {
  getTasks(): TaskView[];
}

export interface StakeholdersDataService {
  getStakeholders(): StakeholderView[];
}

export interface KnowledgeDataService {
  getDocuments(): DocumentView[];
  getStakeholders(): StakeholderView[];
  getProjects(): ProjectView[];
}

export interface DocumentsDataService {
  getDocuments(): DocumentView[];
}

export interface MeetingsDataService {
  getMeetings(): MeetingView[];
}

export interface ApprovalsDataService {
  getApprovals(): ApprovalView[];
}

export interface AnalyticsDataService {
  getOkrData(): OkrMetricView[];
  getPerformanceData(): PerformanceMetricView[];
  getProjects(): ProjectView[];
}

export interface IntegrationsDataService {
  getIntegrations(): IntegrationView[];
}

export type InstitutionalDataServices =
  & DashboardDataService
  & AiWorkspaceDataService
  & ProjectsDataService
  & TasksDataService
  & StakeholdersDataService
  & KnowledgeDataService
  & DocumentsDataService
  & MeetingsDataService
  & ApprovalsDataService
  & AnalyticsDataService
  & IntegrationsDataService;
