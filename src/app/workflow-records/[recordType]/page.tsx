import { WorkflowRecordsPage, isWorkflowRecordType } from "../../../features/workflow-records/WorkflowRecordsPage";

type PageProps = {
  params: Promise<{
    recordType: string;
  }>;
};

export default async function WorkflowRecordTypePage({ params }: PageProps) {
  const { recordType } = await params;
  return <WorkflowRecordsPage recordType={isWorkflowRecordType(recordType) ? recordType : "approval-requests"} />;
}
