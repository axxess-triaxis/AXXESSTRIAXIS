import type {
  AiMessageView,
  ApprovalView,
  DocumentView,
  IntegrationView,
  MeetingView,
  OkrMetricView,
  PerformanceMetricView,
  ProjectView,
  StakeholderView,
  TaskView,
  WorkloadMetricView,
} from "../services/contracts";

export interface InstitutionalRepository {
  getAiMessages(): AiMessageView[];
  getApprovals(): ApprovalView[];
  getDocuments(): DocumentView[];
  getIntegrations(): IntegrationView[];
  getMeetings(): MeetingView[];
  getOkrData(): OkrMetricView[];
  getPerformanceData(): PerformanceMetricView[];
  getProjects(): ProjectView[];
  getStakeholders(): StakeholderView[];
  getTasks(): TaskView[];
  getWorkloadData(): WorkloadMetricView[];
}

export interface StorageRepository {
  getSignedUploadUrl(path: string): Promise<string>;
  getSignedDownloadUrl(path: string): Promise<string>;
}
