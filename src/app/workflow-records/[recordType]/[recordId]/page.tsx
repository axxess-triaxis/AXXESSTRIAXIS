import { WorkflowRecordsPage, isWorkflowRecordType } from "../../../../features/workflow-records/WorkflowRecordsPage";

type PageProps = {
  params: Promise<{
    recordType: string;
    recordId: string;
  }>;
};

export default async function WorkflowRecordDetailPage({ params }: PageProps) {
  const { recordType, recordId } = await params;
  return <WorkflowRecordsPage recordType={isWorkflowRecordType(recordType) ? recordType : "approval-requests"} recordId={recordId} />;
}
