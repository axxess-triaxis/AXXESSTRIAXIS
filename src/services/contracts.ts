export type WorkloadMetricView = {
  name: string;
  value: number;
  capacity: number;
};

export type PerformanceMetricView = {
  month: string;
  completed: number;
  planned: number;
};

export type OkrMetricView = {
  name: string;
  progress: number;
  target: number;
};

export type ProjectView = {
  id: number;
  name: string;
  dept: string;
  progress: number;
  risk: "low" | "medium" | "high" | "urgent" | string;
  owner: string;
  dueDate: string;
  status: string;
  budget: string;
  spent: string;
};

export type TaskView = {
  id: number;
  title: string;
  project: string;
  priority: "low" | "medium" | "high" | "urgent" | string;
  assignee: string;
  due: string;
  status: string;
  aiSuggested: boolean;
};

export type StakeholderView = {
  id: number;
  name: string;
  org: string;
  role: string;
  influence: number;
  engagement: "Low" | "Medium" | "High" | string;
  lastContact: string;
  avatar: string;
};

export type DocumentView = {
  id: number;
  name: string;
  type: string;
  size: string;
  modified: string;
  tags: string[];
  aiSummary: string;
  project: string;
};

export type MeetingView = {
  id: number;
  title: string;
  date: string;
  time: string;
  duration: string;
  attendees: number;
  type: string;
  status: string;
  aiSummary: string | null;
};

export type ApprovalView = {
  id: number;
  title: string;
  type: string;
  requester: string;
  amount: string | null;
  urgency: "low" | "medium" | "high" | "urgent" | string;
  dueDate: string;
  status: string;
  description: string;
};

export type IntegrationView = {
  name: string;
  category: string;
  status: "connected" | "disconnected" | "pending" | string;
  lastSync: string;
  icon: string;
};

export type AiMessageView = {
  role: "user" | "assistant";
  content: string;
  toolUsed?: string;
  requiresApproval?: boolean;
  draftPreview?: string;
};

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
